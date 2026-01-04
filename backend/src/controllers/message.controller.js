import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/messages.js';
import {
    sendSuccess,
    sendError,
    sendCreated,
    sendNotFound,
    sendForbidden
} from '../utils/response.js';

// Common select for sender
const SENDER_SELECT = {
    userId: true,
    username: true,
    profilePictureUrl: true
};

export const sendMessage = async (req, res) => {
    try {
        const { conversationId, content, messageType, fileUrl, metadata } = req.body;
        const userId = req.user.userId;

        // Validate conversation membership
        const participant = await prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return sendForbidden(res, ERROR_MESSAGES.CHAT.NOT_MEMBER);
        }

        // Create message and update conversation timestamp
        const [message] = await prisma.$transaction([
            prisma.message.create({
                data: {
                    conversationId: conversationId,
                    senderId: userId,
                    content,
                    messageType: messageType || 'text',
                    fileUrl,
                    metadata: metadata || {}
                },
                include: {
                    sender: {
                        select: SENDER_SELECT
                    },
                    conversation: {
                        select: {
                            conversationId: true,
                            type: true,
                            groupName: true
                        }
                    }
                }
            }),
            prisma.conversation.update({
                where: { conversationId: conversationId },
                data: { updatedAt: new Date() }
            })
        ]);

        return sendCreated(res, {
            data: message,
            message: SUCCESS_MESSAGES.MESSAGE.SENT
        });
    } catch (error) {
        logger.logError(error, { action: 'sendMessage', userId: req.user.userId, conversationId: req.body.conversationId });
        return sendError(res, { error: ERROR_MESSAGES.MESSAGE.SEND_ERROR });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, offset = 0, query, senderId, startDate, endDate } = req.query;
        const userId = req.user.userId;

        // Validate conversation membership
        const participant = await prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return sendForbidden(res, ERROR_MESSAGES.CHAT.NOT_MEMBER);
        }

        // Build filter conditions
        const where = {
            conversationId: conversationId,
        };

        if (query) {
            where.content = {
                contains: query,
                mode: 'insensitive' // case-insensitive search
            };
        }

        if (senderId) {
            where.senderId = senderId;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }

        const messages = await prisma.message.findMany({
            where,
            include: {
                sender: {
                    select: SENDER_SELECT
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        return sendSuccess(res, { data: messages.reverse() });
    } catch (error) {
        logger.logError(error, { action: 'getMessages', conversationId: req.params.conversationId });
        return sendError(res, { error: ERROR_MESSAGES.MESSAGE.FETCH_ERROR });
    }
};

export const updateMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;

        const message = await prisma.message.findUnique({
            where: { messageId: messageId }
        });

        if (!message) {
            return sendNotFound(res, ERROR_MESSAGES.MESSAGE.NOT_FOUND);
        }

        if (message.senderId !== userId) {
            return sendForbidden(res, ERROR_MESSAGES.MESSAGE.NOT_OWNER);
        }

        if (message.messageType !== 'text') {
            return sendError(res, { error: 'Only text messages can be edited', statusCode: 400 });
        }

        const updatedMessage = await prisma.message.update({
            where: { messageId: messageId },
            data: {
                content,
                metadata: {
                    ...(typeof message.metadata === 'object' ? message.metadata : {}),
                    isEdited: true,
                    editedAt: new Date().toISOString()
                }
            },
            include: {
                sender: {
                    select: SENDER_SELECT
                }
            }
        });

        return sendSuccess(res, {
            data: updatedMessage,
            message: SUCCESS_MESSAGES.MESSAGE.UPDATED
        });
    } catch (error) {
        logger.logError(error, { action: 'updateMessage', messageId: req.params.messageId });
        return sendError(res, { error: ERROR_MESSAGES.MESSAGE.UPDATE_ERROR });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.userId;

        const message = await prisma.message.findUnique({
            where: { messageId: messageId }
        });

        if (!message) {
            return sendNotFound(res, ERROR_MESSAGES.MESSAGE.NOT_FOUND);
        }

        if (message.senderId !== userId) {
            return sendForbidden(res, ERROR_MESSAGES.MESSAGE.NOT_OWNER);
        }

        await prisma.message.update({
            where: { messageId: messageId },
            data: {
                isDeleted: true
            }
        });

        return sendSuccess(res, { message: SUCCESS_MESSAGES.MESSAGE.DELETED });
    } catch (error) {
        logger.logError(error, { action: 'deleteMessage', messageId: req.params.messageId });
        return sendError(res, { error: ERROR_MESSAGES.MESSAGE.DELETE_ERROR });
    }
};

// Get media (images/videos) from a conversation
export const getConversationMedia = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const userId = req.user.userId;

        // Validate conversation membership
        const participant = await prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return sendForbidden(res, ERROR_MESSAGES.CHAT.NOT_MEMBER);
        }

        // Fetch media messages (images and videos)
        const mediaMessages = await prisma.message.findMany({
            where: {
                conversationId: conversationId,
                isDeleted: false,
                messageType: {
                    in: ['image', 'video']
                }
            },
            select: {
                messageId: true,
                messageType: true,
                fileUrl: true,
                metadata: true,
                createdAt: true,
                sender: {
                    select: {
                        userId: true,
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        return sendSuccess(res, { data: mediaMessages });
    } catch (error) {
        logger.logError(error, { action: 'getConversationMedia', conversationId: req.params.conversationId });
        return sendError(res, { error: ERROR_MESSAGES.MESSAGE.FETCH_ERROR });
    }
};

// Get files (non-media) from a conversation
export const getConversationFiles = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const userId = req.user.userId;

        // Validate conversation membership
        const participant = await prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return sendForbidden(res, ERROR_MESSAGES.CHAT.NOT_MEMBER);
        }

        // Fetch file messages (audio, file, etc - non-image/video)
        const fileMessages = await prisma.message.findMany({
            where: {
                conversationId: conversationId,
                isDeleted: false,
                messageType: {
                    in: ['file', 'audio']
                }
            },
            select: {
                messageId: true,
                messageType: true,
                fileUrl: true,
                metadata: true,
                createdAt: true,
                sender: {
                    select: {
                        userId: true,
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        return sendSuccess(res, { data: fileMessages });
    } catch (error) {
        logger.logError(error, { action: 'getConversationFiles', conversationId: req.params.conversationId });
        return sendError(res, { error: ERROR_MESSAGES.MESSAGE.FETCH_ERROR });
    }
};

// Get pinned messages from a conversation
export const getConversationPinnedMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        // Validate conversation membership
        const participant = await prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return sendForbidden(res, ERROR_MESSAGES.CHAT.NOT_MEMBER);
        }

        // Fetch pinned messages
        const pinnedMessages = await prisma.message.findMany({
            where: {
                conversationId: conversationId,
                isPinned: true,
                isDeleted: false
            },
            include: {
                sender: {
                    select: SENDER_SELECT
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return sendSuccess(res, { data: pinnedMessages });
    } catch (error) {
        logger.logError(error, { action: 'getConversationPinnedMessages', conversationId: req.params.conversationId });
        return sendError(res, { error: ERROR_MESSAGES.MESSAGE.FETCH_ERROR });
    }
};

// Pin a message
export const pinMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.userId;

        const message = await prisma.message.findUnique({
            where: { messageId: messageId }
        });

        if (!message) {
            return sendNotFound(res, ERROR_MESSAGES.MESSAGE.NOT_FOUND);
        }

        // Validate conversation membership
        const participant = await prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: message.conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return sendForbidden(res, ERROR_MESSAGES.CHAT.NOT_MEMBER);
        }

        const updatedMessage = await prisma.message.update({
            where: { messageId: messageId },
            data: { isPinned: true }
        });

        return sendSuccess(res, { data: updatedMessage, message: "Message pinned successfully" });
    } catch (error) {
        logger.logError(error, { action: "pinMessage", messageId: req.params.messageId });
        return sendError(res, { error: "Failed to pin message" });
    }
};

// Unpin a message
export const unpinMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.userId;

        const message = await prisma.message.findUnique({
            where: { messageId: messageId }
        });

        if (!message) {
            return sendNotFound(res, ERROR_MESSAGES.MESSAGE.NOT_FOUND);
        }

        // Validate conversation membership
        const participant = await prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: message.conversationId,
                    userId
                }
            }
        });

        if (!participant) {
            return sendForbidden(res, ERROR_MESSAGES.CHAT.NOT_MEMBER);
        }

        const updatedMessage = await prisma.message.update({
            where: { messageId: messageId },
            data: { isPinned: false }
        });

        return sendSuccess(res, { data: updatedMessage, message: "Message unpinned successfully" });
    } catch (error) {
        logger.logError(error, { action: "unpinMessage", messageId: req.params.messageId });
        return sendError(res, { error: "Failed to unpin message" });
    }
};
