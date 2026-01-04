import { Client } from 'minio';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

/**
 * MinIO client initialization
 */
export const minioClient = new Client({
  endPoint: process.env.MINIO_EXTERNAL_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost',
  port: process.env.MINIO_EXTERNAL_ENDPOINT ? undefined : Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

export const BUCKET_NAME = process.env.MINIO_BUCKET;

/**
 * Initialize MinIO bucket
 */
export async function initializeMinIO() {
  try {
    let exists = false;

    try {
      exists = await minioClient.bucketExists(BUCKET_NAME);
    } catch (err) {
      if (err.code !== 'NoSuchBucket') {
        throw err;
      }
    }

    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');

      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/public/*`],
          },
        ],
      };

      await minioClient.setBucketPolicy(
        BUCKET_NAME,
        JSON.stringify(policy)
      );

      logger.info(`MinIO bucket "${BUCKET_NAME}" created`);
    } else {
      logger.info(`MinIO bucket "${BUCKET_NAME}" already exists`);
    }
  } catch (error) {
    logger.logError(error, { context: 'MinIO initialization' });
    throw error;
  }
}

/**
 * Upload file to MinIO
 */
export async function uploadFile(file, fileName, options = {}) {
  const { isPublic = false, folder = '' } = options;

  const basePath = isPublic ? 'public' : '';
  const objectName = [basePath, folder, fileName]
    .filter(Boolean)
    .join('/');

  const metaData = {
    'Content-Type': file.mimetype,
    'X-Upload-Date': new Date().toISOString(),
  };

  try {
    await minioClient.putObject(
      BUCKET_NAME,
      objectName,
      file.buffer,
      file.size,
      metaData
    );

    return {
      bucket: BUCKET_NAME,
      fileName: objectName,
      url: await getFileUrl(objectName),
      size: file.size,
      mimeType: file.mimetype,
    };
  } catch (error) {
    logger.logError(error, { context: 'uploadFile to MinIO', fileName });
    throw error;
  }
}

/**
 * Generate file access URL
 */
export async function getFileUrl(fileName, expirySeconds = 7 * 24 * 60 * 60) {
  try {
    return await minioClient.presignedGetObject(
      BUCKET_NAME,
      fileName,
      expirySeconds
    );
  } catch (error) {
    logger.logError(error, { context: 'getFileUrl from MinIO', fileName });
    throw error;
  }
}

/**
 * Delete file
 */
export async function deleteFile(fileName) {
  try {
    await minioClient.removeObject(BUCKET_NAME, fileName);
    return true;
  } catch (error) {
    logger.logError(error, { context: 'deleteFile from MinIO', fileName });
    throw error;
  }
}

/**
 * Get file metadata
 */
export async function getFileInfo(fileName) {
  try {
    const stat = await minioClient.statObject(BUCKET_NAME, fileName);

    return {
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified,
      metaData: stat.metaData,
    };
  } catch (error) {
    logger.logError(error, { context: 'getFileInfo from MinIO', fileName });
    throw error;
  }
}
