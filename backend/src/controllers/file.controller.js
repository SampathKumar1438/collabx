import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { uploadFile as uploadToMinIO, getFileUrl, deleteFile as deleteFromMinIO } from '../config/minio.js';
import logger from '../utils/logger.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/messages.js';
import {
    sendSuccess,
    sendError,
    sendCreated,
    sendValidationError
} from '../utils/response.js';

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return sendValidationError(res, [{ msg: ERROR_MESSAGES.FILE.NO_FILE }]);
        }

        const { folder = 'uploads' } = req.body;
        const file = req.file;

        // Generate unique filename
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;

        // Upload to MinIO
        const uploadResult = await uploadToMinIO(file, fileName, { folder });

        return sendCreated(res, {
            data: uploadResult,
            message: SUCCESS_MESSAGES.FILE.UPLOADED
        });
    } catch (error) {
        logger.logError(error, { action: 'uploadFile' });
        return sendError(res, { error: ERROR_MESSAGES.FILE.UPLOAD_ERROR });
    }
};

export const getFile = async (req, res) => {
    try {
        const { fileName } = req.params;
        const { folder = 'uploads' } = req.query;

        const objectName = folder ? `${folder}/${fileName}` : fileName;
        const url = await getFileUrl(objectName);

        return sendSuccess(res, { data: { url } });
    } catch (error) {
        logger.logError(error, { action: 'getFile', fileName: req.params.fileName });
        return sendError(res, { error: ERROR_MESSAGES.FILE.DOWNLOAD_ERROR });
    }
};

export const deleteFile = async (req, res) => {
    try {
        const { fileName } = req.params;
        const { folder = 'uploads' } = req.query;

        const objectName = folder ? `${folder}/${fileName}` : fileName;
        await deleteFromMinIO(objectName);

        return sendSuccess(res, { message: SUCCESS_MESSAGES.FILE.DELETED });
    } catch (error) {
        logger.logError(error, { action: 'deleteFile', fileName: req.params.fileName });
        return sendError(res, { error: ERROR_MESSAGES.FILE.DELETE_ERROR });
    }
};
