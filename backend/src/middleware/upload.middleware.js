import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { ERROR_MESSAGES } from '../config/messages.js';
import { sendValidationError } from '../utils/response.js';

// Configure multer for file uploads
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    // Comprehensive list of allowed MIME types
    const defaultAllowedTypes = [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Videos
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
        // Audio - IMPORTANT: includes audio/webm for voice recordings
        'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        // Archives
        'application/zip', 'application/x-zip-compressed',
        'application/x-rar-compressed', 'application/x-7z-compressed'
    ];

    // Get allowed types from env (optional)
    const envAllowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',').filter(Boolean);

    // Combine env types with defaults (env supplements defaults, doesn't replace)
    const allowedTypes = envAllowedTypes.length > 0
        ? [...new Set([...defaultAllowedTypes, ...envAllowedTypes])]
        : defaultAllowedTypes;

    // Check if file type is allowed
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    // Also allow any file that starts with audio/, video/, or image/ (broad category check)
    else if (
        file.mimetype.startsWith('audio/') ||
        file.mimetype.startsWith('video/') ||
        file.mimetype.startsWith('image/')
    ) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
};

// Upload middleware
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // Default 100MB for larger media files
    }
});

// Error handling for multer
export const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return sendValidationError(res, [{ msg: ERROR_MESSAGES.FILE.TOO_LARGE }]);
        }
        return sendValidationError(res, [{ msg: err.message }]);
    } else if (err) {
        return sendValidationError(res, [{ msg: err.message }]);
    }
    next();
};
