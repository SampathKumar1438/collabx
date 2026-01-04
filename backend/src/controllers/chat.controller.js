import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/messages.js';
import {
    sendSuccess,
    sendError,
    sendCreated,
    sendNotFound,
    sendForbidden,
    sendValidationError
} from '../utils/response.js';

// Reusable user select object for consistent response
const USER_SELECT = {
    userId: true,
    username: true,
    email: true,
    profilePictureUrl: true,
    bio: true,
    isOnline: true,
    lastActiveAt: true
};

export const createConversation = async (req, res) => {
    try {
        const { type, groupName, groupImageUrl, memberIds } = req.body;
        const userId = req.user.userId;

        // Validate conversation type
        if (!type || !['private', 'group'].includes(type)) {
            return sendError(res, { error: ERROR_MESSAGES.CHAT.INVALID_TYPE, statusCode: 400 });
        }

        // Validate group chat
        if (type === 'group' && (!memberIds || memberIds.length === 0)) {
            return sendError(res, { error: ERROR_MESSAGES.GROUP.MIN_MEMBERS, statusCode: 400 });
        }

        // For private chat, check if conversation already exists
        if (type === 'private' && memberIds && memberIds.length === 1) {
            const otherUserId = memberIds[0];

            // Find all private conversations where current user is a participant
            const userConversations = await prisma.conversation.findMany({
                where: {
                    type: 'private',
                    participants: {
                        some: {
                            userId: userId
                        }
                    }
                },
                include: {
                    participants: {
                        include: {
                            user: {
                                select: USER_SELECT
                            }
                        }
                    }
                }
            });

            // Check if there's already a conversation with the other user
            const existingConversation = userConversations.find(conv => {
                const participantUserIds = conv.participants.map(p => p.userId);
                return participantUserIds.includes(userId) && participantUserIds.includes(otherUserId) && conv.participants.length === 2;
            });

            if (existingConversation) {
                return sendSuccess(res, {
                    data: existingConversation,
                    message: ERROR_MESSAGES.CHAT.ALREADY_EXISTS
                });
            }
        }

        // Create conversation with participants
        const conversation = await prisma.conversation.create({
            data: {
                type,
                groupName: type === 'group' ? groupName : null,
                groupImageUrl: type === 'group' ? groupImageUrl : null,
                createdBy: userId,
                participants: {
                    create: [
                        {
                            userId,
                            role: 'admin'
                        },
                        ...(memberIds || []).map(memberId => ({
                            userId: memberId,
                            role: 'member'
                        }))
                    ]
                }
            },
            include: {
                creator: {
                    select: {
                        userId: true,
                        username: true,
                        email: true,
                        profilePictureUrl: true
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: USER_SELECT
                        }
                    }
                }
            }
        });

        // Notify participants via Socket.IO
        const io = req.app.get('io');
        if (io) {
            conversation.participants.forEach(p => {
                io.to(`user:${p.userId}`).emit('conversation:new', conversation);
            });
        }

        return sendCreated(res, {
            data: conversation,
            message: type === 'group' ? SUCCESS_MESSAGES.GROUP.CREATED : SUCCESS_MESSAGES.CHAT.CREATED
        });
    } catch (error) {
        logger.logError(error, { action: 'createConversation', userId: req.user.userId });
        return sendError(res, { error: ERROR_MESSAGES.CHAT.CREATE_ERROR });
    }
};

export const getConversations = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 20, offset = 0, type } = req.query;

        const where = {
            participants: {
                some: {
                    userId
                }
            }
        };

        if (type) {
            where.type = type;
        }

        const conversations = await prisma.conversation.findMany({
            where,
            include: {
                creator: {
                    select: {
                        userId: true,
                        username: true,
                        profilePictureUrl: true
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: USER_SELECT
                        }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        sender: {
                            select: {
                                userId: true,
                                username: true,
                                profilePictureUrl: true
                            }
                        }
                    }
                }
            },
            take: Number.parseInt(limit),
            skip: Number.parseInt(offset),
            orderBy: {
                updatedAt: 'desc' // Sort by latest activity
            }
        });

        // Calculate unread counts
        const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const userParticipant = conv.participants.find(p => p.user.userId === userId);
            // Default to epoch if null/undefined, ensuring we count all messages if never read
            const lastReadAt = userParticipant?.lastReadAt || new Date(0);

            let unreadCount = 0;
            // Only count if we have a valid lastReadAt (which we set to epoch 0 if missing)
            // Ideally participant model has lastReadAt
            if (userParticipant) {
                // Count messages created after the last read time
                unreadCount = await prisma.message.count({
                    where: {
                        conversationId: conv.conversationId,
                        createdAt: {
                            gt: lastReadAt
                        }
                    }
                });
            }

            return {
                ...conv,
                unreadCount
            };
        }));

        return sendSuccess(res, { data: conversationsWithUnread });
    } catch (error) {
        logger.logError(error, { action: 'getConversations', userId: req.user.userId });
        return sendError(res, { error: ERROR_MESSAGES.CHAT.FETCH_ERROR });
    }
};

export const getConversationById = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        const conversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                creator: {
                    select: {
                        userId: true,
                        username: true,
                        profilePictureUrl: true
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: USER_SELECT
                        }
                    }
                }
            }
        });

        if (!conversation) {
            return sendNotFound(res, ERROR_MESSAGES.CHAT.NOT_FOUND);
        }

        // Check if user is a participant
        const isParticipant = conversation.participants.some(
            p => p.userId === userId
        );

        if (!isParticipant) {
            return sendForbidden(res, ERROR_MESSAGES.CHAT.NOT_MEMBER);
        }

        return sendSuccess(res, { data: conversation });
    } catch (error) {
        logger.logError(error, { action: 'getConversationById', conversationId });
        return sendError(res, { error: ERROR_MESSAGES.CHAT.FETCH_ERROR });
    }
};

export const updateConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { groupName, groupImageUrl } = req.body;
        const userId = req.user.userId;

        const conversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                participants: true
            }
        });

        if (!conversation) {
            return sendNotFound(res, ERROR_MESSAGES.CHAT.NOT_FOUND);
        }

        // Check if user is admin
        const participant = conversation.participants.find(p => p.userId === userId);

        if (participant?.role !== 'admin') {
            return sendForbidden(res, ERROR_MESSAGES.GROUP.NOT_ADMIN);
        }

        // Update conversation
        const updatedConversation = await prisma.conversation.update({
            where: { conversationId },
            data: {
                ...(groupName !== undefined && { groupName }),
                ...(groupImageUrl !== undefined && { groupImageUrl })
            },
            include: {
                creator: {
                    select: {
                        userId: true,
                        username: true,
                        profilePictureUrl: true
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: USER_SELECT
                        }
                    }
                }
            }
        });

        // Notify participants via Socket.IO
        const io = req.app.get('io');
        if (io) {
            updatedConversation.participants.forEach(p => {
                io.to(`user:${p.userId}`).emit('conversation:updated', updatedConversation);
            });
        }

        return sendSuccess(res, {
            data: updatedConversation,
            message: SUCCESS_MESSAGES.GROUP.UPDATED
        });
    } catch (error) {
        logger.logError(error, { action: 'updateConversation', conversationId });
        return sendError(res, { error: ERROR_MESSAGES.CHAT.UPDATE_ERROR });
    }
};

export const deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        const conversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                participants: true
            }
        });

        if (!conversation) {
            return sendNotFound(res, ERROR_MESSAGES.CHAT.NOT_FOUND);
        }

        // Check if user is the creator or admin
        const participant = conversation.participants.find(p => p.userId === userId);

        if (conversation.createdBy !== userId && (!participant || participant.role !== 'admin')) {
            return sendForbidden(res, ERROR_MESSAGES.GROUP.NOT_ADMIN);
        }

        // Delete conversation (cascade will handle participants and messages)
        await prisma.conversation.delete({
            where: { conversationId }
        });

        // Notify participants via Socket.IO
        const io = req.app.get('io');
        if (io) {
            conversation.participants.forEach(p => {
                io.to(`user:${p.userId}`).emit('conversation:deleted', { conversationId });
            });
        }

        return sendSuccess(res, { message: SUCCESS_MESSAGES.CHAT.DELETED });
    } catch (error) {
        logger.logError(error, { action: 'deleteConversation', conversationId });
        return sendError(res, { error: ERROR_MESSAGES.CHAT.DELETE_ERROR });
    }
};

export const addParticipants = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { memberIds } = req.body;
        const userId = req.user.userId;

        if (!memberIds || memberIds.length === 0) {
            return sendError(res, { error: ERROR_MESSAGES.VALIDATION.INVALID_INPUT, statusCode: 400 });
        }

        const conversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                participants: true
            }
        });

        if (!conversation) {
            return sendNotFound(res, ERROR_MESSAGES.CHAT.NOT_FOUND);
        }

        if (conversation.type !== 'group') {
            return sendError(res, { error: ERROR_MESSAGES.CHAT.INVALID_TYPE, statusCode: 400 });
        }

        // Check if user is admin
        const participant = conversation.participants.find(p => p.userId === userId);

        if (!participant || participant.role !== 'admin') {
            return sendForbidden(res, ERROR_MESSAGES.GROUP.NOT_ADMIN);
        }

        // Get usernames of members being added
        const newMemberUsers = await prisma.user.findMany({
            where: { userId: { in: memberIds } },
            select: { userId: true, username: true, profilePictureUrl: true }
        });

        // Add participants (skip if already exists due to unique constraint)
        const addPromises = memberIds.map(memberId =>
            prisma.participant.upsert({
                where: {
                    conversationId_userId: {
                        conversationId: conversationId,
                        userId: memberId
                    }
                },
                update: {},
                create: {
                    conversationId: conversationId,
                    userId: memberId,
                    role: 'member'
                }
            })
        );

        await Promise.all(addPromises);

        // Create system messages for each new member
        const systemMessages = await Promise.all(
            newMemberUsers.map(member =>
                prisma.message.create({
                    data: {
                        conversationId,
                        senderId: null,
                        content: `${member.username} joined the group`,
                        messageType: 'system',
                        metadata: {
                            type: 'member_joined',
                            userId: member.userId,
                            username: member.username,
                            addedBy: req.user.username
                        }
                    },
                    include: {
                        sender: {
                            select: {
                                userId: true,
                                username: true,
                                profilePictureUrl: true
                            }
                        }
                    }
                })
            )
        );

        const updatedConversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                creator: {
                    select: {
                        userId: true,
                        username: true,
                        profilePictureUrl: true
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: USER_SELECT
                        }
                    }
                }
            }
        });

        // Notify all participants via Socket.IO
        const io = req.app.get('io');
        if (io) {
            // Get newly added members with full details
            const newMembers = updatedConversation.participants.filter(p =>
                memberIds.includes(p.userId)
            );

            // Notify existing members about new members
            updatedConversation.participants.forEach(p => {
                io.to(`user:${p.userId}`).emit('group:member_added', {
                    conversationId,
                    conversation: updatedConversation,
                    newMembers: newMembers.map(m => ({
                        userId: m.userId,
                        username: m.user.username,
                        profilePictureUrl: m.user.profilePictureUrl,
                        role: m.role
                    })),
                    addedBy: {
                        userId,
                        username: req.user.username
                    }
                });
            });

            // Emit system messages to chat for real-time display
            systemMessages.forEach(msg => {
                io.to(`chat:${conversationId}`).emit('message:new', {
                    ...msg,
                    chatId: conversationId,
                    messageId: msg.messageId
                });
            });
        }

        return sendSuccess(res, {
            data: updatedConversation,
            message: SUCCESS_MESSAGES.GROUP.MEMBER_ADDED
        });
    } catch (error) {
        logger.logError(error, { action: 'addParticipants', conversationId });
        return sendError(res, { error: ERROR_MESSAGES.GROUP.MEMBER_ADD_ERROR });
    }
};

export const removeParticipants = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { memberIds } = req.body;
        const userId = req.user.userId;

        if (!memberIds || memberIds.length === 0) {
            return sendError(res, { error: ERROR_MESSAGES.VALIDATION.INVALID_INPUT, statusCode: 400 });
        }

        const conversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                participants: true
            }
        });

        if (!conversation) {
            return sendNotFound(res, ERROR_MESSAGES.CHAT.NOT_FOUND);
        }

        // Check if user is admin
        const participant = conversation.participants.find(p => p.userId === userId);

        if (!participant || participant.role !== 'admin') {
            return sendForbidden(res, ERROR_MESSAGES.GROUP.NOT_ADMIN);
        }

        // Remove participants (except creator)
        const memberIdsStr = memberIds.filter(id => id !== conversation.createdBy);

        // Fetch user details BEFORE deletion for system messages
        const removedUsers = await prisma.user.findMany({
            where: { userId: { in: memberIdsStr } },
            select: { userId: true, username: true }
        });

        await prisma.participant.deleteMany({
            where: {
                conversationId: conversationId,
                userId: { in: memberIdsStr }
            }
        });

        // Create system messages for each removed member
        const systemMessages = await Promise.all(
            removedUsers.map(member =>
                prisma.message.create({
                    data: {
                        conversationId,
                        senderId: null,
                        content: `${member.username} was removed from the group`,
                        messageType: 'system',
                        metadata: {
                            type: 'member_removed',
                            userId: member.userId,
                            username: member.username,
                            removedBy: req.user.username
                        }
                    },
                    include: {
                        sender: {
                            select: {
                                userId: true,
                                username: true,
                                profilePictureUrl: true
                            }
                        }
                    }
                })
            )
        );

        const updatedConversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                creator: {
                    select: {
                        userId: true,
                        username: true,
                        profilePictureUrl: true
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: USER_SELECT
                        }
                    }
                }
            }
        });

        // Notify all participants via Socket.IO
        const io = req.app.get('io');
        if (io) {
            // Notify remaining members about removed members
            updatedConversation.participants.forEach(p => {
                io.to(`user:${p.userId}`).emit('group:member_removed', {
                    conversationId,
                    conversation: updatedConversation,
                    removedMemberIds: memberIdsStr,
                    removedBy: {
                        userId,
                        username: req.user.username
                    }
                });
            });

            // Notify removed members
            memberIdsStr.forEach(removedId => {
                io.to(`user:${removedId}`).emit('group:removed_from_group', {
                    conversationId,
                    groupName: conversation.groupName,
                    removedBy: {
                        userId,
                        username: req.user.username
                    }
                });
            });

            // Emit system messages to chat for real-time display
            systemMessages.forEach(msg => {
                io.to(`chat:${conversationId}`).emit('message:new', {
                    ...msg,
                    chatId: conversationId,
                    messageId: msg.messageId
                });
            });
        }

        return sendSuccess(res, {
            data: updatedConversation,
            message: SUCCESS_MESSAGES.GROUP.MEMBER_REMOVED
        });
    } catch (error) {
        logger.logError(error, { action: 'removeParticipants', conversationId });
        return sendError(res, { error: ERROR_MESSAGES.GROUP.MEMBER_REMOVE_ERROR });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        const conversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                participants: true
            }
        });

        if (!conversation) {
            return sendNotFound(res, ERROR_MESSAGES.CHAT.NOT_FOUND);
        }

        if (conversation.type !== 'group') {
            return sendError(res, { error: 'Can only leave group chats', statusCode: 400 });
        }

        // Check if user is a participant
        const participant = conversation.participants.find(p => p.userId === userId);
        if (!participant) {
            return sendError(res, { error: 'You are not a member of this group', statusCode: 400 });
        }

        // Creator cannot leave, they must delete the group or transfer ownership
        if (conversation.createdBy === userId) {
            return sendError(res, { error: 'Group creator cannot leave. Please delete the group or transfer ownership.', statusCode: 400 });
        }

        // Remove user from group
        await prisma.participant.delete({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            }
        });

        // Create system message
        const systemMessage = await prisma.message.create({
            data: {
                conversationId,
                senderId: null,
                content: `${req.user.username} left the group`,
                messageType: 'system',
                metadata: {
                    type: 'member_left',
                    userId,
                    username: req.user.username
                }
            },
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

        // Get remaining members
        const remainingParticipants = await prisma.participant.findMany({
            where: { conversationId },
            include: {
                user: {
                    select: USER_SELECT
                }
            }
        });

        // Notify via Socket.IO
        const io = req.app.get('io');
        if (io) {
            // Notify remaining members
            remainingParticipants.forEach(p => {
                io.to(`user:${p.userId}`).emit('group:member_left', {
                    conversationId,
                    memberId: userId,
                    username: req.user.username
                });
            });

            // Emit system message
            io.to(`chat:${conversationId}`).emit('message:new', {
                ...systemMessage,
                chatId: conversationId,
                messageId: systemMessage.messageId
            });
        }

        return sendSuccess(res, { message: 'You have left the group' });
    } catch (error) {
        logger.logError(error, { action: 'leaveGroup', conversationId: req.params.conversationId });
        return sendError(res, { error: 'Failed to leave group' });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        await prisma.participant.update({
            where: {
                conversationId_userId: {
                    conversationId: conversationId,
                    userId: userId
                }
            },
            data: {
                lastReadAt: new Date()
            }
        });

        return sendSuccess(res, { message: SUCCESS_MESSAGES.CHAT.MARKED_READ });
    } catch (error) {
        logger.logError(error, { action: 'markAsRead', conversationId });
        return sendError(res, { error: ERROR_MESSAGES.CHAT.UPDATE_ERROR });
    }
};

export const updateParticipantRole = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId: targetUserId, role } = req.body;
        const userId = req.user.userId;

        if (!targetUserId || !role || !['admin', 'member'].includes(role)) {
            return sendValidationError(res, 'Invalid user ID or role. Role must be "admin" or "member".');
        }

        const conversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: USER_SELECT
                        }
                    }
                }
            }
        });

        if (!conversation) {
            return sendNotFound(res, ERROR_MESSAGES.CHAT.NOT_FOUND);
        }

        if (conversation.type !== 'group') {
            return sendError(res, { error: 'Role changes are only available for group chats', statusCode: 400 });
        }

        // Check if current user is admin
        const currentUserParticipant = conversation.participants.find(p => p.userId === userId);
        if (!currentUserParticipant || currentUserParticipant.role !== 'admin') {
            return sendForbidden(res, ERROR_MESSAGES.GROUP.NOT_ADMIN);
        }

        // Find target participant
        const targetParticipant = conversation.participants.find(p => p.userId === targetUserId);
        if (!targetParticipant) {
            return sendNotFound(res, 'User is not a member of this group');
        }

        // Cannot demote the creator
        if (targetUserId === conversation.createdBy && role === 'member') {
            return sendError(res, { error: 'Cannot demote the group creator', statusCode: 400 });
        }

        // Update the participant role
        await prisma.participant.update({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: targetUserId
                }
            },
            data: { role }
        });

        // Fetch updated conversation
        const updatedConversation = await prisma.conversation.findUnique({
            where: { conversationId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: USER_SELECT
                        }
                    }
                }
            }
        });

        // Notify via Socket.IO
        const io = req.app.get('io');
        if (io) {
            updatedConversation.participants.forEach(p => {
                io.to(`user:${p.userId}`).emit('group:role_changed', {
                    conversationId,
                    userId: targetUserId,
                    newRole: role,
                    changedBy: {
                        userId,
                        username: req.user.username
                    }
                });
            });
        }

        return sendSuccess(res, {
            data: updatedConversation,
            message: role === 'admin' ? 'User promoted to admin' : 'User demoted to member'
        });
    } catch (error) {
        logger.logError(error, { action: 'updateParticipantRole', conversationId: req.params.conversationId });
        return sendError(res, { error: 'Failed to update participant role' });
    }
};
