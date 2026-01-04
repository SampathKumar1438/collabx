import express from 'express';
import { uploadFile, getFile, deleteFile as deleteFileController } from '../controllers/file.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { upload, handleMulterError } from '../middleware/upload.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/upload', upload.single('file'), handleMulterError, uploadFile);
router.get('/:fileName', getFile);
router.delete('/:fileName', deleteFileController);

export default router;
