import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from '../config/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail, sendPasswordResetOTP } from '../utils/email.js';
import logger from '../utils/logger.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/messages.js';
import {
    sendSuccess,
    sendError,
    sendCreated,
    sendValidationError,
    sendUnauthorized
} from '../utils/response.js';

const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// Common select fields for user queries
const USER_SELECT = {
    userId: true,
    username: true,
    email: true,
    profilePictureUrl: true,
    bio: true,
    profileComplete: true,
    emailVerified: true,
    isOnline: true,
    lastActiveAt: true,
    createdAt: true
};

// Cookie options helper
const getCookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' is required for cross-domain cookies
    maxAge
});

// Helper to generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendValidationError(res, errors);
        }

        const { username, email, password } = req.body;
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Generate 6-digit OTP
        const otp = generateOTP();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        let user;

        if (existingUser) {
            if (existingUser.emailVerified) {
                return sendError(res, { error: ERROR_MESSAGES.AUTH.EMAIL_EXISTS, statusCode: 400 });
            } else {
                // User exists but is not verified -> Overwrite details and resend OTP
                user = await prisma.user.update({
                    where: { email },
                    data: {
                        username,
                        passwordHash,
                        emailVerificationToken: otpHash,
                        emailVerificationExpires: expires,
                    },
                    select: USER_SELECT
                });
            }
        } else {
            // Create new user
            user = await prisma.user.create({
                data: {
                    username,
                    email,
                    passwordHash,
                    isOnline: false,
                    emailVerified: false,
                    emailVerificationToken: otpHash,
                    emailVerificationExpires: expires,
                    lastActiveAt: new Date()
                },
                select: USER_SELECT
            });
        }

        // Send verification email with OTP
        try {
            await sendVerificationEmail(email, otp);
        } catch (emailError) {
            logger.warn('Failed to send verification email', { email, error: emailError.message });
            // For development, log the OTP directly so we can verify without email
            if (process.env.NODE_ENV !== 'production') {
                logger.debug(`DEV ONLY: OTP for ${email} is ${otp}`);
            }
        }

        return sendCreated(res, {
            data: {
                user: { ...user, emailVerificationToken: undefined }, // Don't send token back
                email
            },
            message: SUCCESS_MESSAGES.AUTH.REGISTER_SUCCESS
        });
    } catch (error) {
        logger.logError(error, { action: 'register' });
        return sendError(res, { error: ERROR_MESSAGES.REGISTRATION.FAILED });
    }
};

export const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendValidationError(res, errors);
        }

        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return sendUnauthorized(res, ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
        }

        if (!user.emailVerified) {
            return sendError(res, { error: "Please verify your email address before logging in.", statusCode: 403 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return sendUnauthorized(res, ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
        }

        const updatedUser = await prisma.user.update({
            where: { userId: user.userId },
            data: { lastActiveAt: new Date(), isOnline: true },
            select: USER_SELECT
        });

        const accessToken = signAccessToken({ userId: user.userId });
        const refreshToken = signRefreshToken({ userId: user.userId });

        // Only store refresh token in HTTP-only cookie for security
        res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

        // Return access token in response body to be stored in memory
        return sendSuccess(res, { data: { user: updatedUser, accessToken } });
    } catch (error) {
        logger.logError(error, { action: 'login' });
        return sendError(res, { error: ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS });
    }
};

export const googleLogin = async (req, res) => {
    try {
        const { credential, idToken } = req.body;
        const token = credential || idToken;

        if (!token) {
            return sendError(res, { error: ERROR_MESSAGES.AUTH.NO_CREDENTIAL, statusCode: 400 });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload.email;
        const username = payload.name.replace(/\s+/g, '').toLowerCase();

        let user = await prisma.user.findUnique({ where: { email } });
        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            user = await prisma.user.create({
                data: {
                    username,
                    email,
                    passwordHash: '',
                    isOnline: true,
                    lastActiveAt: new Date()
                },
                select: USER_SELECT
            });
        }

        const accessToken = signAccessToken({ userId: user.userId });
        const refreshToken = signRefreshToken({ userId: user.userId });

        // Only store refresh token in HTTP-only cookie for security
        res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

        // Return access token in response body to be stored in memory
        return sendSuccess(res, { data: { user, isNewUser, accessToken } });
    } catch (error) {
        logger.logError(error, { action: 'googleLogin' });
        return sendError(res, { error: ERROR_MESSAGES.AUTH.GOOGLE_AUTH_FAILED });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { userId: req.user.userId },
            select: USER_SELECT
        });

        return sendSuccess(res, { data: user });
    } catch (error) {
        logger.logError(error, { action: 'getMe', userId: req.user?.userId });
        return sendError(res, { error: ERROR_MESSAGES.USER.FETCH_ERROR });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendValidationError(res, errors);
        }

        const { username, email, profilePictureUrl, bio, profileComplete } = req.body;
        const userId = req.user.userId;

        if (email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email,
                    userId: { not: userId }
                }
            });

            if (existingUser) {
                return sendError(res, { error: ERROR_MESSAGES.AUTH.EMAIL_IN_USE, statusCode: 400 });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { userId },
            data: {
                ...(username && { username }),
                ...(email && { email }),
                ...(profilePictureUrl !== undefined && { profilePictureUrl }),
                ...(bio !== undefined && { bio }),
                ...(profileComplete !== undefined && { profileComplete })
            },
            select: USER_SELECT
        });

        return sendSuccess(res, { data: updatedUser });
    } catch (error) {
        logger.logError(error, { action: 'updateProfile', userId: req.user?.userId });
        return sendError(res, { error: ERROR_MESSAGES.USER.UPDATE_ERROR });
    }
};

export const logout = (req, res) => {
    // Clear refresh token cookie (access token is in memory on client)
    res.clearCookie('refreshToken');
    return sendSuccess(res, { message: SUCCESS_MESSAGES.AUTH.LOGOUT_SUCCESS });
};

export const refreshToken = (req, res) => {
    const { refreshToken: token } = req.cookies;

    if (!token) {
        return sendUnauthorized(res, ERROR_MESSAGES.AUTH.REFRESH_TOKEN_MISSING);
    }

    try {
        const payload = verifyRefreshToken(token);
        const newAccessToken = signAccessToken({ userId: payload.userId });

        // Return new access token in response body to be stored in memory
        return sendSuccess(res, { data: { accessToken: newAccessToken } });
    } catch (err) {
        return sendUnauthorized(res, ERROR_MESSAGES.AUTH.INVALID_REFRESH_TOKEN);
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendValidationError(res, errors);
        }

        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        // Always return success to prevent email enumeration
        if (!user) {
            return sendSuccess(res, { message: SUCCESS_MESSAGES.PASSWORD.RESET_EMAIL_SENT });
        }

        // Generate 6-digit OTP
        const otp = generateOTP();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { userId: user.userId },
            data: {
                passwordResetToken: otpHash,
                passwordResetExpires: expires,
            },
        });

        await sendPasswordResetOTP(email, otp);

        return sendSuccess(res, { message: SUCCESS_MESSAGES.PASSWORD.RESET_EMAIL_SENT });
    } catch (error) {
        logger.logError(error, { action: 'forgotPassword' });
        return sendError(res, { error: ERROR_MESSAGES.PASSWORD.PROCESSING_ERROR });
    }
};

export const verifyResetOTP = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendValidationError(res, errors);
        }

        const { email, otp } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
            return sendError(res, { error: ERROR_MESSAGES.PASSWORD.INVALID_RESET_TOKEN, statusCode: 400 });
        }

        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        if (otpHash !== user.passwordResetToken) {
            return sendError(res, { error: ERROR_MESSAGES.PASSWORD.INVALID_RESET_TOKEN, statusCode: 400 });
        }

        if (user.passwordResetExpires < new Date()) {
            return sendError(res, { error: ERROR_MESSAGES.PASSWORD.RESET_TOKEN_EXPIRED, statusCode: 400 });
        }

        return sendSuccess(res, { message: "OTP Verified Successfully" });
    } catch (error) {
        logger.logError(error, { action: 'verifyResetOTP' });
        return sendError(res, { error: ERROR_MESSAGES.PASSWORD.PROCESSING_ERROR });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendValidationError(res, errors);
        }

        const { email, token, newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
            return sendError(res, { error: ERROR_MESSAGES.PASSWORD.INVALID_RESET_TOKEN, statusCode: 400 });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        if (tokenHash !== user.passwordResetToken) {
            return sendError(res, { error: ERROR_MESSAGES.PASSWORD.INVALID_RESET_TOKEN, statusCode: 400 });
        }

        if (user.passwordResetExpires < new Date()) {
            return sendError(res, { error: ERROR_MESSAGES.PASSWORD.RESET_TOKEN_EXPIRED, statusCode: 400 });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        const updatedUser = await prisma.user.update({
            where: { userId: user.userId },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
            select: USER_SELECT,
        });

        const accessToken = signAccessToken({ userId: user.userId });
        const refreshTokenVal = signRefreshToken({ userId: user.userId });

        // Only store refresh token in HTTP-only cookie for security
        res.cookie('refreshToken', refreshTokenVal, getCookieOptions(7 * 24 * 60 * 60 * 1000));

        // Return access token in response body to be stored in memory
        return sendSuccess(res, {
            data: { user: updatedUser, accessToken },
            message: SUCCESS_MESSAGES.PASSWORD.RESET_SUCCESS
        });
    } catch (error) {
        logger.logError(error, { action: 'resetPassword' });
        return sendError(res, { error: ERROR_MESSAGES.PASSWORD.RESET_FAILED });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendValidationError(res, errors);
        }

        const { email, otp } = req.body; // Changed token to otp
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.emailVerificationToken || !user.emailVerificationExpires) {
            return sendError(res, { error: ERROR_MESSAGES.REGISTRATION.INVALID_VERIFICATION_TOKEN, statusCode: 400 });
        }

        if (user.emailVerified) {
            return sendError(res, { error: ERROR_MESSAGES.REGISTRATION.EMAIL_ALREADY_VERIFIED, statusCode: 400 });
        }

        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        if (otpHash !== user.emailVerificationToken) {
            return sendError(res, { error: ERROR_MESSAGES.REGISTRATION.INVALID_VERIFICATION_TOKEN, statusCode: 400 });
        }

        if (user.emailVerificationExpires < new Date()) {
            return sendError(res, { error: ERROR_MESSAGES.REGISTRATION.VERIFICATION_TOKEN_EXPIRED, statusCode: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { userId: user.userId },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpires: null,
            },
            select: USER_SELECT,
        });

        const accessToken = signAccessToken({ userId: user.userId });
        const refreshTokenVal = signRefreshToken({ userId: user.userId });

        // Only store refresh token in HTTP-only cookie for security
        res.cookie('refreshToken', refreshTokenVal, getCookieOptions(7 * 24 * 60 * 60 * 1000));

        // Return access token in response body to be stored in memory
        return sendSuccess(res, {
            data: { user: updatedUser, accessToken },
            message: SUCCESS_MESSAGES.VERIFICATION.EMAIL_VERIFIED
        });
    } catch (error) {
        logger.logError(error, { action: 'verifyEmail' });
        return sendError(res, { error: ERROR_MESSAGES.REGISTRATION.EMAIL_VERIFICATION_FAILED });
    }
};

export const resendVerification = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendValidationError(res, errors);
        }

        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        // Always return success to prevent email enumeration
        if (!user) {
            return sendSuccess(res, { message: SUCCESS_MESSAGES.VERIFICATION.EMAIL_SENT });
        }

        if (user.emailVerified) {
            return sendError(res, { error: ERROR_MESSAGES.REGISTRATION.EMAIL_ALREADY_VERIFIED, statusCode: 400 });
        }

        const otp = generateOTP();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { userId: user.userId },
            data: {
                emailVerificationToken: otpHash,
                emailVerificationExpires: expires,
            },
        });

        try {
            await sendVerificationEmail(email, otp);
        } catch (emailError) {
            logger.warn('Failed to send verification email', { email, error: emailError.message });
            if (process.env.NODE_ENV !== 'production') {
                logger.debug(`DEV ONLY: OTP for ${email} is ${otp}`);
            }
        }

        return sendSuccess(res, { message: SUCCESS_MESSAGES.VERIFICATION.EMAIL_SENT });
    } catch (error) {
        logger.logError(error, { action: 'resendVerification' });
        return sendError(res, { error: ERROR_MESSAGES.PASSWORD.PROCESSING_ERROR });
    }
};
