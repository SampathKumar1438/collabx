import express from 'express';
import { getUsers, getUserById, searchUsers } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getUsers);
router.get('/search', searchUsers);
router.get('/:userId', getUserById);

export default router;
