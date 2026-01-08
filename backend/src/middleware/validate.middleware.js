import { body, param, query, validationResult } from 'express-validator';

// Wrapper for validation result
export const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    };
};

// Common validators
export const commonValidators = {
    // Pagination
    pagination: [
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
    ],

    // ID validation (UUID)
    uuidParam: (paramName) => [
        param(paramName).isUUID().withMessage(`Invalid ${paramName} format`)
    ],

    // Email
    email: [
        body('email').isEmail().normalizeEmail().withMessage('Invalid email address')
    ],

    // Password (example policy)
    password: [
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/\d/)
            .withMessage('Password must contain a number')
    ]
};
