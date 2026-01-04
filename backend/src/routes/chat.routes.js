import express from 'express';
import {
    createConversation,
    getConversations,
    getConversationById,
    updateConversation,
    deleteConversation,
    addParticipants,
    removeParticipants,
    markAsRead,
    updateParticipantRole,
    leaveGroup
} from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', createConversation);
router.get('/', getConversations);
router.get('/:conversationId', getConversationById);
router.put('/:conversationId', updateConversation);
router.delete('/:conversationId', deleteConversation);
router.post('/:conversationId/participants', addParticipants);
router.delete('/:conversationId/participants', removeParticipants);
router.put('/:conversationId/participants/role', updateParticipantRole);
router.post('/:conversationId/leave', leaveGroup);
router.post('/:conversationId/read', markAsRead);

export default router;

