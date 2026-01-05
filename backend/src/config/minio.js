import { Client } from 'minio';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { log } from 'node:console';

dotenv.config();

/**
 * MinIO client initialization
 * ALWAYS connect to localhost internally to avoid Ngrok warning pages/latency
 */
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

/**
 * Generate a file URL (Presigned or Proxy)
 */
export const getFileUrl = async (objectName) => {
  // If we have a proxy route set up in index.js, we return that URL
  // Format: https://external-domain.com/<bucket>/<filename>
  if (process.env.MINIO_EXTERNAL_ENDPOINT) {
    const bucket = process.env.MINIO_BUCKET || 'collabx';
    // Ensure we don't duplicate protocol if present
    let baseUrl = process.env.MINIO_EXTERNAL_ENDPOINT;

    // If no protocol specified, default to http (for IP addresses) or https if SSL enabled
    if (!baseUrl.startsWith('http')) {
      const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
      baseUrl = `${protocol}://${baseUrl}`;
    }

    // Remove trailing slash if present
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    return `${baseUrl}/${bucket}/${objectName}`;
  }

  // Fallback for local development
  return await minioClient.presignedGetObject(
    process.env.MINIO_BUCKET || 'collabx',
    objectName,
    24 * 60 * 60 // 1 day expiry
  );
};

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

    // Define bucket policy with all required folders
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [
            `arn:aws:s3:::${BUCKET_NAME}/public/*`,
            `arn:aws:s3:::${BUCKET_NAME}/uploads/*`,
            `arn:aws:s3:::${BUCKET_NAME}/messages/*`,
            `arn:aws:s3:::${BUCKET_NAME}/groups/*`,
            `arn:aws:s3:::${BUCKET_NAME}/profiles/*`
          ],
        },
      ],
    };

    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      logger.info(`MinIO bucket "${BUCKET_NAME}" created`);
    } else {
      logger.info(`MinIO bucket "${BUCKET_NAME}" already exists`);
    }

    // Always set/update bucket policy to ensure all folders are accessible
    await minioClient.setBucketPolicy(
      BUCKET_NAME,
      JSON.stringify(policy)
    );
    logger.info(`MinIO bucket policy updated for "${BUCKET_NAME}"`);
  } catch (error) {
    logger.logError(error, { context: 'MinIO initialization' });
    throw error;
  }
}

/**
 * Upload file to MinIO
 */
export async function uploadFile(file, fileName, options = {}) {
  logger.info(`Preparing to upload file to MinIO: ${fileName}`);
  const { isPublic = false, folder = '' } = options;

  const basePath = isPublic ? 'public' : '';
  const objectName = [basePath, folder, fileName]
    .filter(Boolean)
    .join('/');

  const metaData = {
    'Content-Type': file.mimetype,
    'X-Upload-Date': new Date().toISOString(),
  };
  logger.info(`Uploading file to MinIO: ${objectName}`);

  try {
    await minioClient.putObject(
      BUCKET_NAME,
      objectName,
      file.buffer,
      file.size,
      metaData
    );
    logger.info(`File uploaded to MinIO: ${objectName}`);

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
