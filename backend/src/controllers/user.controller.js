import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';
import { ERROR_MESSAGES } from '../config/messages.js';
import {
    sendSuccess,
    sendError,
    sendNotFound,
    sendValidationError
} from '../utils/response.js';

// Consistent user select fields
const USER_RO_SELECT = {
    userId: true,
    username: true,
    email: true,
    profilePictureUrl: true,
    bio: true,
    isOnline: true,
    lastActiveAt: true,
    createdAt: true
};

export const getUsers = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const users = await prisma.user.findMany({
            take: parseInt(limit),
            skip: parseInt(offset),
            select: USER_RO_SELECT,
            orderBy: {
                createdAt: 'desc'
            }
        });

        return sendSuccess(res, { data: users });
    } catch (error) {
        logger.logError(error, { action: 'getUsers' });
        return sendError(res, { error: ERROR_MESSAGES.USER.FETCH_ERROR });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { userId: userId },
            select: USER_RO_SELECT
        });

        if (!user) {
            return sendNotFound(res, ERROR_MESSAGES.USER.NOT_FOUND);
        }

        return sendSuccess(res, { data: user });
    } catch (error) {
        logger.logError(error, { action: 'getUserById', userId: req.params.userId });
        return sendError(res, { error: ERROR_MESSAGES.USER.FETCH_ERROR });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const { query, limit = 20 } = req.query;

        if (!query || query.trim().length < 2) {
            return sendValidationError(res, [{ msg: 'Search query must be at least 2 characters' }]);
        }

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: parseInt(limit),
            select: USER_RO_SELECT,
            orderBy: {
                username: 'asc'
            }
        });

        return sendSuccess(res, { data: users });
    } catch (error) {
        logger.logError(error, { action: 'searchUsers', query: req.query.query });
        return sendError(res, { error: ERROR_MESSAGES.USER.SEARCH_ERROR });
    }
};
