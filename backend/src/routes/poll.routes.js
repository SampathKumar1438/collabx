import express from 'express';
import { createPoll, getPolls, votePoll } from '../controllers/poll.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createPoll);
router.get('/', getPolls);
router.post('/:pollId/vote', votePoll);

export default router;
