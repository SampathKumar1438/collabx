import express from 'express';
import {
    sendMessage,
    getMessages,
    updateMessage,
    deleteMessage,
    getConversationMedia,
    getConversationFiles,
    getConversationPinnedMessages,
    pinMessage,
    unpinMessage
} from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

import { validate, commonValidators } from '../middleware/validate.middleware.js';
import { body } from 'express-validator';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Send message validation
const sendMessageValidation = [
    body('conversationId').isString().notEmpty().withMessage('Invalid conversation ID'),
    body('content').optional().isString().trim(),
    body('messageType').optional().isIn(['text', 'image', 'video', 'audio', 'file']).withMessage('Invalid message type'),
    body('fileUrl').optional().isString().withMessage('Invalid file URL')
];

router.post('/', validate(sendMessageValidation), sendMessage);

// Get messages validation
router.get('/:conversationId',
    validate([
        ...commonValidators.uuidParam('conversationId'),
        ...commonValidators.pagination
    ]),
    getMessages
);

// Get rich media validation
router.get('/:conversationId/media',
    validate([
        ...commonValidators.uuidParam('conversationId'),
        ...commonValidators.pagination
    ]),
    getConversationMedia
);

// Get files validation
router.get('/:conversationId/files',
    validate([
        ...commonValidators.uuidParam('conversationId'),
        ...commonValidators.pagination
    ]),
    getConversationFiles
);

// Get pinned messages validation
router.get('/:conversationId/pinned',
    validate(commonValidators.uuidParam('conversationId')),
    getConversationPinnedMessages
);

// Update message validation
router.put('/:messageId',
    validate([
        ...commonValidators.uuidParam('messageId'),
        body('content').isString().trim().notEmpty().withMessage('Content cannot be empty')
    ]),
    updateMessage
);

// Delete message validation
router.delete('/:messageId',
    validate(commonValidators.uuidParam('messageId')),
    deleteMessage
);

// Pin/Unpin message
router.post('/pin/:messageId', validate(commonValidators.uuidParam('messageId')), pinMessage);
router.post('/unpin/:messageId', validate(commonValidators.uuidParam('messageId')), unpinMessage);

export default router;
