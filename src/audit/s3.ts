import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Environment variables
const S3_BUCKET = process.env.S3_BUCKET;
const STAGE = process.env.STAGE || 'dev';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Feature flag
const AUDIT_ENABLED = process.env.AUDIT_ENABLED === 'true';

let s3Client: S3Client | null = null;

/**
 * Initialize S3 client
 */
export function initializeS3(): boolean {
  if (!AUDIT_ENABLED) {
    console.log('🔍 S3 disabled - AUDIT_ENABLED=false');
    return false;
  }

  if (!S3_BUCKET) {
    console.log('🔍 S3 disabled - missing S3_BUCKET configuration');
    return false;
  }

  try {
    s3Client = new S3Client({
      region: AWS_REGION,
      // Credentials will be picked up from environment or IAM role
    });

    console.log('✅ S3 client initialized successfully');
    console.log(`📦 Bucket: ${S3_BUCKET}, Stage: ${STAGE}, Region: ${AWS_REGION}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize S3 client:', error);
    return false;
  }
}

/**
 * Build deterministic S3 key
 * Format: {stage}/{userId}/{jobType}/{YYYY}/{MM}/{DD}/{jobId or uuid}/{originalFilename}
 */
export function buildS3Key(params: {
  userId: string;
  jobType: 'SINGLE' | 'CSV' | 'IMAGE';
  jobId?: string;
  originalFilename: string;
}): string {
  const { userId, jobType, jobId, originalFilename } = params;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const uniqueId = jobId || uuidv4();
  
  // Sanitize filename to be S3-safe
  const safeFilename = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .trim();
  
  return `${STAGE}/${userId}/${jobType}/${year}/${month}/${day}/${uniqueId}/${safeFilename}`;
}

/**
 * Calculate SHA-256 hash of file content
 */
export function calculateSHA256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Upload file to S3
 */
export async function uploadToS3(params: {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<{ success: boolean; error?: string }> {
  if (!s3Client || !S3_BUCKET) {
    return { success: false, error: 'S3 not initialized' };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata,
    });

    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown S3 error';
    console.error('❌ S3 upload failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  if (!s3Client || !S3_BUCKET) {
    return false;
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    // File doesn't exist or other error
    return false;
  }
}

/**
 * Generate S3 URL for a file
 */
export function getS3Url(key: string): string {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET not configured');
  }
  
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Get S3 client instance
 */
export function getS3Client(): S3Client | null {
  return s3Client;
}

/**
 * Check if S3 is enabled and ready
 */
export function isS3Enabled(): boolean {
  return AUDIT_ENABLED && s3Client !== null && S3_BUCKET !== undefined;
}

/**
 * Get S3 configuration info
 */
export function getS3Config(): { bucket: string; stage: string; region: string } | null {
  if (!isS3Enabled()) {
    return null;
  }
  
  return {
    bucket: S3_BUCKET!,
    stage: STAGE,
    region: AWS_REGION,
  };
}
