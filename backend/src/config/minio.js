import { Client } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MinIO client initialization
 */
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT ?? 9000),
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

      console.log(`MinIO bucket "${BUCKET_NAME}" created`);
    } else {
      console.log(`MinIO bucket "${BUCKET_NAME}" already exists`);
    }
  } catch (error) {
    console.error('MinIO initialization failed:', error);
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
    console.error('Error uploading file to MinIO:', error);
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
    console.error('Error generating file URL:', error);
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
    console.error('Error deleting file:', error);
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
    console.error('Error getting file info:', error);
    throw error;
  }
}
