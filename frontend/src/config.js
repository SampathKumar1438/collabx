/**
 * Centralized Configuration for Frontend
 * Uses environment variables where available, falls back to defaults
 */

const config = {
    // API Configuration
    API: {
        BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
        TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
    },

    // Auth Configuration
    AUTH: {
        GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    },

    // File Upload Configuration
    UPLOAD: {
        MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        ALLOWED_DOC_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    },

    // Pagination Defaults
    PAGINATION: {
        DEFAULT_LIMIT: 50,
        SEARCH_LIMIT: 20,
    },

    // App Metadata
    APP: {
        NAME: import.meta.env.VITE_APP_NAME || 'Chat App',
        ENV: import.meta.env.MODE,
        IS_DEV: import.meta.env.DEV,
        IS_PROD: import.meta.env.PROD,
    },
};

export default config;
