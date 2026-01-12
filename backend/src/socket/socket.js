import prisma from '../config/prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';

// Store active socket connections
const activeUsers = new Map(); // userId -> Which sockets belong to this user?
const socketToUser = new Map(); // socketId -> Which user owns this socket?

export function setupSocketHandlers(io) {
    // Authentication middleware for Socket.IO
    io.use(async (socket, next) => {
        try {
            // Try to get token from auth handshake (for backwards compatibility)
            let token = socket.handshake.auth.token;

            // If no token in auth, try to extract from cookies
            if (!token) {
                const cookies = socket.handshake.headers.cookie;
                if (cookies) {
                    const cookieMatch = cookies.match(/accessToken=([^;]+)/);
                    if (cookieMatch) {
                        token = cookieMatch[1];
                    }
                }
            }

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = verifyAccessToken(token);
            const user = await prisma.user.findUnique({
                where: { userId: decoded.userId }
            });

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.userId = String(user.userId);
            socket.user = user;
            next();
        } catch (error) {
            console.error('Socket auth error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    });


    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.username} (${socket.id})`);

        // Add user to active users
        if (!activeUsers.has(socket.userId)) {
            activeUsers.set(socket.userId, new Set());
        }
        activeUsers.get(socket.userId).add(socket.id);
        socketToUser.set(socket.id, socket.userId);

        // Join user's personal room for notifications
        socket.join(`user:${socket.userId}`);

        // Update user status
        updateUserStatus(socket.userId, true);

        // Join user's chat rooms
        joinUserChats(socket);

        // Handle joining a specific chat
        socket.on('join:chat', async ({ chatId }) => {
            try {
                // Verify user is a member
                // Schema uses 'Participant' model, mapping to 'participants' table
                const membership = await prisma.participant.findFirst({
                    where: {
                        conversationId: chatId,
                        userId: socket.userId
                    }
                });

                if (membership) {
                    socket.join(`chat:${chatId}`);
                    console.log(`User ${socket.user.username} joined chat ${chatId}`);

                    // Notify other members
                    socket.to(`chat:${chatId}`).emit('user:joined', {
                        userId: socket.userId,
                        username: socket.user.username,
                        chatId
                    });
                }
            } catch (error) {
                console.error('Join chat error:', error);
                socket.emit('error', { message: 'Failed to join chat' });
            }
        });

        // Handle leaving a chat
        socket.on('leave:chat', ({ chatId }) => {
            socket.leave(`chat:${chatId}`);
            console.log(`User ${socket.user.username} left chat ${chatId}`);

            socket.to(`chat:${chatId}`).emit('user:left', {
                userId: socket.userId,
                username: socket.user.username,
                chatId
            });
        });

        // Handle new message
        socket.on('message:send', (messageData) => {
            const { chatId } = messageData;

            // Construct safe message data using authenticated socket user info
            // This ensures profile pictures and IDs are always correct and authoritative
            const safeMessageData = {
                ...messageData,
                senderId: socket.userId,
                sender: {
                    userId: socket.userId,
                    username: socket.user.username,
                    profilePictureUrl: socket.user.profilePictureUrl
                }
            };

            // Broadcast to all users in the chat except sender
            socket.to(`chat:${chatId}`).emit('message:new', safeMessageData);

            console.log(`Message sent in chat ${chatId} by ${socket.user.username}`);
        });

        // Handle message editing
        socket.on('message:edit', (messageData) => {
            const { chatId } = messageData;

            io.to(`chat:${chatId}`).emit('message:edited', messageData);
            console.log(`Message edited in chat ${chatId}`);
        });

        // Handle message deletion
        socket.on('message:delete', (messageData) => {
            const { chatId } = messageData;

            io.to(`chat:${chatId}`).emit('message:deleted', messageData);
            console.log(`Message deleted in chat ${chatId}`);
        });

        // Handle message reactions
        socket.on('message:react', async ({ chatId, messageId, emoji, action }) => {
            try {
                // Get current message
                const message = await prisma.message.findUnique({
                    where: { messageId }
                });

                if (!message) return;

                // Get current reactions from metadata
                const metadata = typeof message.metadata === 'object' ? message.metadata : {};
                // Set single reaction in metadata
                const reactions = action === 'add' ? [emoji] : [];

                // Update message metadata
                await prisma.message.update({
                    where: { messageId },
                    data: {
                        metadata: {
                            ...metadata,
                            reactions
                        }
                    }
                });

                // Broadcast to all participants in the chat
                io.to(`chat:${chatId}`).emit('message:reaction', {
                    chatId,
                    messageId,
                    emoji,
                    action,
                    reactions,
                    userId: socket.userId
                });

                console.log(`Reaction ${action} in chat ${chatId}: ${emoji}`);
            } catch (error) {
                console.error('Message reaction error:', error);
            }
        });

        // Handle message pinning
        socket.on('message:pin', async ({ chatId, messageId }) => {
            try {
                const message = await prisma.message.update({
                    where: { messageId },
                    data: { isPinned: true },
                    include: {
                        sender: {
                            select: {
                                userId: true,
                                username: true,
                                profilePictureUrl: true
                            }
                        }
                    }
                });

                io.to(`chat:${chatId}`).emit('message:pinned', {
                    chatId,
                    messageId,
                    isPinned: true,
                    message
                });
            } catch (error) {
                console.error('Message pin error:', error);
            }
        });

        socket.on('message:unpin', async ({ chatId, messageId }) => {
            try {
                await prisma.message.update({
                    where: { messageId },
                    data: { isPinned: false }
                });

                io.to(`chat:${chatId}`).emit('message:pinned', {
                    chatId,
                    messageId,
                    isPinned: false
                });
            } catch (error) {
                console.error('Message unpin error:', error);
            }
        });


        // Handle typing indicator
        socket.on('typing:start', ({ chatId }) => {
            socket.to(`chat:${chatId}`).emit('user:typing', {
                userId: socket.userId,
                username: socket.user.username,
                chatId
            });
        });

        socket.on('typing:stop', ({ chatId }) => {
            socket.to(`chat:${chatId}`).emit('user:stopped_typing', {
                userId: socket.userId,
                chatId
            });
        });

        // Handle message received (Delivered)
        socket.on('message:received', async ({ chatId, messageId }) => {
            try {
                await prisma.message.update({
                    where: { messageId },
                    data: { status: 'delivered' }
                });

                io.to(`chat:${chatId}`).emit('message:status', {
                    messageId,
                    chatId,
                    status: 'delivered',
                    userId: socket.userId
                });
            } catch (error) {
                console.error('Message delivered error:', error);
            }
        });

        // Handle read receipts
        socket.on('message:read', async ({ chatId, messageId }) => {
            try {
                if (messageId) {
                    await prisma.message.update({
                        where: { messageId },
                        data: { status: 'read' }
                    });
                } else {
                    await prisma.message.updateMany({
                        where: {
                            conversationId: chatId,
                            senderId: { not: socket.userId },
                            status: { not: 'read' }
                        },
                        data: { status: 'read' }
                    });
                }

                await prisma.participant.update({
                    where: {
                        conversationId_userId: {
                            conversationId: chatId,
                            userId: socket.userId
                        }
                    },
                    data: { lastReadAt: new Date() }
                });

                io.to(`chat:${chatId}`).emit('message:read', {
                    userId: socket.userId,
                    chatId,
                    messageId
                });

                if (messageId) {
                    io.to(`chat:${chatId}`).emit('message:status', {
                        messageId,
                        chatId,
                        status: 'read',
                        userId: socket.userId
                    });
                } else {
                    io.to(`chat:${chatId}`).emit('message:status', {
                        chatId,
                        status: 'read',
                        userId: socket.userId,
                        all: true
                    });
                }
            } catch (error) {
                console.error('Message read error:', error);
            }
        });

        // Handle file upload progress
        socket.on('file:upload:progress', ({ chatId, fileName, progress, fileId }) => {
            // Broadcast upload progress to all participants in the chat
            socket.to(`chat:${chatId}`).emit('file:upload:progress', {
                chatId,
                fileName,
                progress,
                fileId,
                uploaderId: socket.userId,
                uploaderName: socket.user.username
            });
        });

        // Handle user presence
        socket.on('presence:update', async ({ isOnline }) => {
            await updateUserStatus(socket.userId, isOnline);

            // Get user's chats and notify members
            const userChats = await prisma.participant.findMany({
                where: { userId: socket.userId },
                select: { conversationId: true }
            });

            userChats.forEach(({ conversationId }) => {
                socket.to(`chat:${conversationId}`).emit('user:presence', {
                    userId: socket.userId,
                    isOnline
                });
            });
        });

        // Helper to create and emit system message for calls
        const createCallMessage = async (chatId, type, content, metadata = {}) => {
            try {
                const message = await prisma.message.create({
                    data: {
                        conversationId: chatId,
                        senderId: socket.userId,
                        content: content,
                        messageType: type, // 'call'
                        metadata: metadata,
                        status: 'sent'
                    },
                    include: {
                        sender: {
                            select: { username: true, profilePictureUrl: true }
                        }
                    }
                });
                io.to(`chat:${chatId}`).emit('message:new', {
                    ...message,
                    chatId: chatId,
                    sender: message.sender // Ensure sender info is passed
                });
            } catch (e) { console.error("Error creating call message", e); }
        };

        // WebRTC Signaling Events

        // 1. Call Start (Initiation)
        socket.on('call:start', async ({ recipientId, chatId, offer, isVideo, isGroup }) => {
            const starterId = socket.userId;
            console.log(`Call started by ${starterId} in chat ${chatId} (Group: ${isGroup})`);

            if (isGroup && chatId) {
                // Join the caller to the call room for group calls
                socket.join(`call:${chatId}`);
                try {
                    // Get all participants
                    const participants = await prisma.participant.findMany({
                        where: { conversationId: chatId },
                        select: { userId: true }
                    });

                    console.log(`Group call - Found ${participants.length} participants`);
                    console.log(`Active users:`, Array.from(activeUsers.keys()));

                    // Notify all ONLINE participants except sender
                    let notifiedCount = 0;
                    participants.forEach(p => {
                        const pId = String(p.userId);
                        console.log(`Checking participant ${pId}, is online:`, activeUsers.has(pId));

                        if (pId !== String(starterId) && activeUsers.has(pId)) {
                            activeUsers.get(pId).forEach(socketId => {
                                console.log(`Notifying ${pId} at socket ${socketId}`);
                                io.to(socketId).emit('call:incoming', {
                                    callerId: starterId,
                                    callerName: socket.user.username,
                                    callerAvatar: socket.user.profilePictureUrl,
                                    chatId,
                                    isVideo,
                                    isGroup: true,
                                    fromSocketId: socket.id
                                });
                                notifiedCount++;
                            });
                        }
                    });

                    console.log(`Notified ${notifiedCount} users about group call`);

                    // Log group call start message
                    createCallMessage(chatId, 'call', `${socket.user.username} started a ${isVideo ? 'video' : 'voice'} call`, {
                        status: "started",
                        isVideo,
                        isGroup: true
                    });
                } catch (err) {
                    console.error("Group call start error", err);
                }
            } else {
                // 1-to-1 Logic
                const targetId = String(recipientId);

                if (activeUsers.has(targetId)) {
                    activeUsers.get(targetId).forEach(socketId => {
                        io.to(socketId).emit('call:incoming', {
                            callerId: starterId,
                            callerName: socket.user.username,
                            callerAvatar: socket.user.profilePictureUrl,
                            chatId,
                            offer, // 1-to-1 sends offer immediately
                            isVideo,
                            isGroup: false,
                            fromSocketId: socket.id
                        });
                    });
                } else {
                    createCallMessage(chatId, 'call', `Missed ${isVideo ? 'Video' : 'Voice'} Call`, { status: "missed", isVideo });
                    socket.emit('call:offline', { recipientId: targetId });
                }
            }
        });

        // 2. Respond to Call (Accept) - For Group Calls
        socket.on('call:join', ({ chatId }) => {
            console.log(`User ${socket.userId} joining call in chat ${chatId}`);
            socket.join(`call:${chatId}`);

            // Notify existing peers (who are in the room) that I joined.
            // They will initiate offers to me.
            socket.to(`call:${chatId}`).emit('call:peer-joined', {
                peerId: socket.userId,
                peerSocketId: socket.id,
                peerName: socket.user.username,
                peerAvatar: socket.user.profilePictureUrl
            });
        });

        // 3. Signaling Relays (Targeted)
        socket.on('call:offer', ({ to, offer }) => {
            io.to(to).emit('call:offer', {
                from: socket.id,
                offer,
                callerName: socket.user.username,
                callerAvatar: socket.user.profilePictureUrl,
                callerId: socket.userId
            });
        });

        socket.on('call:answer', ({ to, answer }) => {
            io.to(to).emit('call:answered', {
                responderSocketId: socket.id,
                answer
            });
        });

        socket.on('call:ice-candidate', ({ to, candidate }) => {
            io.to(to).emit('call:ice-candidate', {
                candidate,
                from: socket.id
            });
        });

        // 4. Leaving/Ending
        socket.on('call:leave', ({ chatId }) => {
            socket.leave(`call:${chatId}`);
            socket.to(`call:${chatId}`).emit('call:peer-left', {
                peerSocketId: socket.id
            });
        });

        // Legacy 1-to-1 Answer for backward compatibility (or if we don't migrate 1-to-1 to rooms yet)
        socket.on('call:answer-direct', ({ to, answer }) => {
            io.to(to).emit('call:answered', {
                answer,
                responderId: socket.userId,
                responderSocketId: socket.id
            });
        });

        // ... (keep rejection logging)
        socket.on('call:reject', ({ to, chatId, isVideo }) => {
            if (to) io.to(to).emit('call:rejected', { rejectorId: socket.userId });
            createCallMessage(chatId, 'call', `${isVideo ? 'Video' : 'Voice'} Call declined`, { status: "declined", isVideo });
        });

        socket.on('call:media-update', ({ chatId, type, enabled }) => {
            socket.to(`chat:${chatId}`).emit('call:media-update', {
                peerSocketId: socket.id,
                userId: socket.userId,
                type,
                enabled,
                chatId
            });
        });

        socket.on('call:end', ({ to, recipientId, chatId, duration, isVideo }) => {
            const enderId = socket.userId;

            if (to) {
                // Targeted end (e.g. established connection)
                io.to(to).emit('call:ended', { enderId });
            } else if (recipientId) {
                // Broad 'cancel' to a user (e.g. before connection established)
                const targetId = String(recipientId);
                if (activeUsers.has(targetId)) {
                    activeUsers.get(targetId).forEach(socketId => {
                        io.to(socketId).emit('call:ended', { enderId });
                    });
                }
            }

            // For group calls, we might want to notify room
            if (chatId) socket.to(`call:${chatId}`).emit('call:peer-left', { peerSocketId: socket.id });

            console.log("Call ended log", chatId, duration);
            if (chatId) {
                createCallMessage(chatId, 'call', `${isVideo ? 'Video' : 'Voice'} Call ended`, { status: "ended", duration: duration || 0, isVideo });
            }
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            try {
                console.log(`User disconnected: ${socket.user.username} (${socket.id})`);

                // Remove socket from active users
                const userSockets = activeUsers.get(socket.userId);
                if (userSockets) {
                    userSockets.delete(socket.id);

                    // If no more sockets for this user, mark as offline
                    if (userSockets.size === 0) {
                        activeUsers.delete(socket.userId);
                        await updateUserStatus(socket.userId, false);

                        // Notify all chats
                        const userChats = await prisma.participant.findMany({
                            where: { userId: socket.userId },
                            select: { conversationId: true }
                        });

                        userChats.forEach(({ conversationId }) => {
                            io.to(`chat:${conversationId}`).emit('user:presence', {
                                userId: socket.userId,
                                isOnline: false
                            });
                        });
                    }
                }

                socketToUser.delete(socket.id);
            } catch (error) {
                console.error('Error during disconnect handling:', error);
            }
        });
    });

    // Helper function to join user's chats
    async function joinUserChats(socket) {
        try {
            const memberships = await prisma.participant.findMany({
                where: { userId: socket.userId },
                select: { conversationId: true }
            });

            memberships.forEach(({ conversationId }) => {
                socket.join(`chat:${conversationId}`);
            });

            console.log(`User ${socket.user.username} joined ${memberships.length} chats`);
        } catch (error) {
            console.error('Error joining user chats:', error);
        }
    }

    // Helper function to update user status
    async function updateUserStatus(userId, isOnline) {
        try {
            await prisma.user.update({
                where: { userId: userId },
                data: {
                    isOnline,
                    lastActiveAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    }
}

// Export active users for potential use in other modules
export { activeUsers, socketToUser };
