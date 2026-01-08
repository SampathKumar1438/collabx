/**
 * Centralized Error Messages Configuration
 * All error messages used across the application are defined here
 * for consistency and easy maintenance/localization
 */

export const ERROR_MESSAGES = {
    // Authentication Errors
    AUTH: {
        INVALID_CREDENTIALS: 'Invalid credentials',
        USER_NOT_FOUND: 'User not found',
        EMAIL_EXISTS: 'Email already registered',
        USERNAME_EXISTS: 'Username already taken',
        EMAIL_IN_USE: 'Email already in use',
        NO_CREDENTIAL: 'No credential provided',
        GOOGLE_AUTH_FAILED: 'Google authentication failed',
        REFRESH_TOKEN_MISSING: 'Refresh token missing',
        INVALID_REFRESH_TOKEN: 'Invalid refresh token',
        UNAUTHORIZED: 'Unauthorized access',
        TOKEN_EXPIRED: 'Token has expired',
        INVALID_TOKEN: 'Invalid token',
        ACCESS_DENIED: 'Access denied',
    },

    // Registration & Verification Errors
    REGISTRATION: {
        FAILED: 'Error creating user',
        EMAIL_VERIFICATION_FAILED: 'Email verification failed',
        INVALID_VERIFICATION_TOKEN: 'Invalid OTP',
        EMAIL_ALREADY_VERIFIED: 'Email already verified',
        VERIFICATION_TOKEN_EXPIRED: 'OTP has expired. Please request a new one.',
    },

    // Password Reset Errors
    PASSWORD: {
        RESET_FAILED: 'Error resetting password',
        INVALID_RESET_TOKEN: 'Invalid OTP',
        RESET_TOKEN_EXPIRED: 'OTP has expired. Please request a new one.',
        PROCESSING_ERROR: 'Error processing request',
    },

    // User Errors
    USER: {
        NOT_FOUND: 'User not found',
        FETCH_ERROR: 'Error fetching user data',
        UPDATE_ERROR: 'Error updating profile',
        SEARCH_ERROR: 'Error searching users',
    },

    // Chat/Conversation Errors
    CHAT: {
        NOT_FOUND: 'Conversation not found',
        CREATE_ERROR: 'Error creating conversation',
        FETCH_ERROR: 'Error fetching conversations',
        UPDATE_ERROR: 'Error updating conversation',
        DELETE_ERROR: 'Error deleting conversation',
        NOT_MEMBER: 'You are not a member of this conversation',
        ALREADY_EXISTS: 'Conversation already exists',
        INVALID_TYPE: 'Invalid conversation type',
    },

    // Group Errors
    GROUP: {
        NOT_FOUND: 'Group not found',
        CREATE_ERROR: 'Error creating group',
        UPDATE_ERROR: 'Error updating group',
        NAME_REQUIRED: 'Group name is required',
        MIN_MEMBERS: 'Group must have at least 2 members',
        NOT_ADMIN: 'Only admins can perform this action',
        MEMBER_ADD_ERROR: 'Error adding member to group',
        MEMBER_REMOVE_ERROR: 'Error removing member from group',
        ALREADY_MEMBER: 'User is already a member',
        NOT_MEMBER: 'User is not a member of this group',
    },

    // Message Errors
    MESSAGE: {
        NOT_FOUND: 'Message not found',
        SEND_ERROR: 'Error sending message',
        FETCH_ERROR: 'Error fetching messages',
        UPDATE_ERROR: 'Error updating message',
        DELETE_ERROR: 'Error deleting message',
        CONTENT_REQUIRED: 'Message content is required',
        NOT_OWNER: 'You can only modify your own messages',
        REACTION_ERROR: 'Error adding reaction',
    },

    // File Errors
    FILE: {
        UPLOAD_ERROR: 'Error uploading file',
        DOWNLOAD_ERROR: 'Error downloading file',
        DELETE_ERROR: 'Error deleting file',
        NOT_FOUND: 'File not found',
        TOO_LARGE: 'File size exceeds limit',
        INVALID_TYPE: 'Invalid file type',
        NO_FILE: 'No file provided',
    },

    // Validation Errors
    VALIDATION: {
        INVALID_INPUT: 'Invalid input data',
        REQUIRED_FIELD: 'Required field is missing',
        INVALID_EMAIL: 'Invalid email format',
        INVALID_PASSWORD: 'Password does not meet requirements',
        INVALID_ID: 'Invalid ID format',
    },

    // Server Errors
    SERVER: {
        INTERNAL_ERROR: 'Internal server error',
        DATABASE_ERROR: 'Database error occurred',
        SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
        ROUTE_NOT_FOUND: 'Route not found',
    },

    // Socket/Real-time Errors
    SOCKET: {
        CONNECTION_ERROR: 'Socket connection error',
        AUTH_REQUIRED: 'Authentication required for socket connection',
        INVALID_EVENT: 'Invalid socket event',
    },
};

export const SUCCESS_MESSAGES = {
    // Authentication
    AUTH: {
        LOGIN_SUCCESS: 'Login successful',
        LOGOUT_SUCCESS: 'Logged out successfully',
        REGISTER_SUCCESS: 'Registration successful! Please check your email to verify your account.',
        GOOGLE_LOGIN_SUCCESS: 'Google Sign-In successful',
        ACCOUNT_CREATED: 'Account created successfully',
    },

    // Password
    PASSWORD: {
        RESET_EMAIL_SENT: 'If that email exists, a password reset link has been sent.',
        RESET_SUCCESS: 'Password reset successful. You are now logged in.',
    },

    // Email Verification
    VERIFICATION: {
        EMAIL_SENT: 'If that email exists and is not verified, a verification link has been sent.',
        EMAIL_VERIFIED: 'Email verified successfully. You are now logged in.',
    },

    // Profile
    PROFILE: {
        UPDATE_SUCCESS: 'Profile updated successfully',
    },

    // Chat
    CHAT: {
        CREATED: 'Conversation created successfully',
        DELETED: 'Conversation deleted successfully',
        MARKED_READ: 'Marked as read',
    },

    // Group
    GROUP: {
        CREATED: 'Group created successfully',
        UPDATED: 'Group updated successfully',
        MEMBER_ADDED: 'Member added successfully',
        MEMBER_REMOVED: 'Member removed successfully',
        LEFT: 'You have left the group',
    },

    // Message
    MESSAGE: {
        SENT: 'Message sent successfully',
        DELETED: 'Message deleted successfully',
        UPDATED: 'Message updated successfully',
    },

    // File
    FILE: {
        UPLOADED: 'File uploaded successfully',
        DELETED: 'File deleted successfully',
    },
};

export default { ERROR_MESSAGES, SUCCESS_MESSAGES };
