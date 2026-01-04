/**
 * Application Constants
 */

export const CONSTANTS = {
    // Regex Patterns
    REGEX: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
    },

    // Key Codes
    KEYS: {
        ENTER: 'Enter',
        ESCAPE: 'Escape',
        SPACE: ' ',
    },

    // Chat Constants
    CHAT: {
        MAX_MESSAGE_LENGTH: 5000,
        TYPING_TIMEOUT: 3000,
    },

    // UI Constants
    UI: {
        TOAST_DURATION: 4000,
        DEBOUNCE_DELAY: 3000,
    },

    // Routes
    ROUTES: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        DASHBOARD: '/app',
    }
};

export default CONSTANTS;
