import { verifyAccessToken } from '../utils/jwt.js';
import prisma from '../config/prisma.js';
import { sendUnauthorized, sendError } from '../utils/response.js';
import { ERROR_MESSAGES } from '../config/messages.js';
import logger from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
    try {
        // Check for token in cookies
        const token = req.cookies?.accessToken;

        if (!token) {
            return sendUnauthorized(res, ERROR_MESSAGES.AUTH.TOKEN_MISSING);
        }

        try {
            const payload = verifyAccessToken(token);
            const user = await prisma.user.findUnique({
                where: { userId: payload.userId },
                select: {
                    userId: true,
                    username: true,
                    email: true,
                    profilePictureUrl: true,
                    isOnline: true,
                    lastActiveAt: true,
                    createdAt: true
                },
            });

            if (!user) {
                return sendUnauthorized(res, ERROR_MESSAGES.AUTH.USER_NOT_FOUND);
            }

            req.user = user;
            next();
        } catch (error) {
            logger.error('Authentication error:', error);
            return sendUnauthorized(res, ERROR_MESSAGES.AUTH.INVALID_TOKEN);
        }
    } catch (error) {
        logger.error('Unexpected authentication error:', error);
        return sendError(res, { error: ERROR_MESSAGES.SERVER.INTERNAL_ERROR });
    }
};

export const optionalAuth = async (req, res, next) => {
    try {
        // Check for token in cookies
        const token = req.cookies?.accessToken;

        if (token) {
            try {
                const payload = verifyAccessToken(token);
                const user = await prisma.user.findUnique({
                    where: { userId: payload.userId },
                    select: {
                        userId: true,
                        username: true,
                        email: true,
                        profilePictureUrl: true,
                        isOnline: true,
                        lastActiveAt: true,
                        createdAt: true
                    },
                });

                if (user) {
                    req.user = user;
                }
            } catch (error) {
                logger.warn('Optional authentication failed:', error);
            }
        }
    }
        next();
} catch (error) {
    logger.error('Unexpected error in optional authentication:', error);
    next();
};
