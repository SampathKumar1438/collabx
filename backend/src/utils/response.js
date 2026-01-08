import { ERROR_MESSAGES } from '../config/messages.js';

/**
 * Standardized API Response Helpers
 * These helpers ensure consistent response format across all endpoints
 * and automatically exclude unnecessary data
 */

/**
 * Send a success response
 * @param {Response} res - Express response object
 * @param {Object} options - Response options
 * @param {any} options.data - Response data (optional)
 * @param {string} options.message - Success message (optional)
 * @param {number} options.statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, { data = null, message = null, statusCode = 200 } = {}) => {
    const response = { success: true };

    if (message) response.message = message;
    if (data !== null) response.data = data;

    return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {Response} res - Express response object
 * @param {Object} options - Response options
 * @param {string} options.error - Error message
 * @param {number} options.statusCode - HTTP status code (default: 500)
 * @param {Array} options.errors - Validation errors array (optional)
 */
export const sendError = (res, { error, statusCode = 500, errors = null } = {}) => {
    const response = { success: false, error };

    if (errors) response.errors = errors;

    // Only include stack trace in development
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
        response.stack = error.stack;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 * @param {Response} res - Express response object
 * @param {Array} errors - Array of validation errors from express-validator
 */
export const sendValidationError = (res, errors) => {
    return sendError(res, {
        error: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
        statusCode: 400,
        errors: errors.array(),
    });
};

/**
 * Send an unauthorized error response
 * @param {Response} res - Express response object
 * @param {string} message - Custom error message (optional)
 */
export const sendUnauthorized = (res, message = ERROR_MESSAGES.AUTH.UNAUTHORIZED) => {
    return sendError(res, {
        error: message,
        statusCode: 401,
    });
};

/**
 * Send a forbidden error response
 * @param {Response} res - Express response object
 * @param {string} message - Custom error message (optional)
 */
export const sendForbidden = (res, message = ERROR_MESSAGES.AUTH.ACCESS_DENIED) => {
    return sendError(res, {
        error: message,
        statusCode: 403,
    });
};

/**
 * Send a not found error response
 * @param {Response} res - Express response object
 * @param {string} message - Custom error message (optional)
 */
export const sendNotFound = (res, message = ERROR_MESSAGES.SERVER.ROUTE_NOT_FOUND) => {
    return sendError(res, {
        error: message,
        statusCode: 404,
    });
};

/**
 * Send a created response (201)
 * @param {Response} res - Express response object
 * @param {Object} options - Response options
 */
export const sendCreated = (res, { data = null, message = null } = {}) => {
    return sendSuccess(res, { data, message, statusCode: 201 });
};

/**
 * Sanitize user object to remove sensitive fields
 * @param {Object} user - User object from database
 * @returns {Object} Sanitized user object
 */
export const sanitizeUser = (user) => {
    if (!user) return null;

    const {
        passwordHash,
        passwordResetToken,
        passwordResetExpires,
        emailVerificationToken,
        emailVerificationExpires,
        ...safeUser
    } = user;

    return safeUser;
};

/**
 * Sanitize an array of users
 * @param {Array} users - Array of user objects
 * @returns {Array} Array of sanitized user objects
 */
export const sanitizeUsers = (users) => {
    if (!Array.isArray(users)) return [];
    return users.map(sanitizeUser);
};

/**
 * Paginate response data
 * @param {Response} res - Express response object
 * @param {Object} options - Pagination options
 * @param {Array} options.data - Array of items
 * @param {number} options.page - Current page number
 * @param {number} options.limit - Items per page
 * @param {number} options.total - Total number of items
 */
export const sendPaginated = (res, { data, page, limit, total }) => {
    const totalPages = Math.ceil(total / limit);

    return sendSuccess(res, {
        data: {
            items: data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages,
            },
        },
    });
};

export default {
    sendSuccess,
    sendError,
    sendValidationError,
    sendUnauthorized,
    sendForbidden,
    sendNotFound,
    sendCreated,
    sanitizeUser,
    sanitizeUsers,
    sendPaginated,
};
