import express from 'express';
import { body } from 'express-validator';
import { register, login, googleLogin, getMe, updateProfile, logout, refreshToken, forgotPassword, resetPassword, verifyEmail, resendVerification, verifyResetOTP } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation rules
const registerValidation = [
    body('username').trim().isLength({ min: 3, max: 50 }).isAlphanumeric(),
    body('email').trim().isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
];

const loginValidation = [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').notEmpty()
];

const updateProfileValidation = [
    body('username').optional().trim().isLength({ min: 3, max: 50 }).isAlphanumeric(),
    body('email').optional().trim().isEmail().normalizeEmail(),
    body('firstName').optional().trim().isLength({ max: 50 }),
    body('lastName').optional().trim().isLength({ max: 50 }),
    body('bio').optional().trim().isLength({ max: 500 })
];

const forgotPasswordValidation = [
    body('email').trim().isEmail().normalizeEmail()
];

const resetPasswordValidation = [
    body('email').trim().isEmail().normalizeEmail(),
    body('token').notEmpty().trim(),
    body('newPassword').isLength({ min: 6 })
];

const verifyEmailValidation = [
    body('email').trim().isEmail().normalizeEmail(),
    body('otp').notEmpty().trim()
];

const resendVerificationValidation = [
    body('email').trim().isEmail().normalizeEmail()
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/google', googleLogin);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);

// Password reset routes
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/verify-reset-otp', [
    body('email').trim().isEmail().normalizeEmail(),
    body('otp').notEmpty().trim()
], verifyResetOTP);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Email verification routes
router.post('/verify-email', verifyEmailValidation, verifyEmail);
router.post('/resend-verification', resendVerificationValidation, resendVerification);

// Alias for /me endpoint
router.get('/profile', authenticate, getMe);

export default router;
