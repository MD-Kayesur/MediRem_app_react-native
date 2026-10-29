import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private readonly bucketName = 'assets';

  onModuleInit() {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;
    const region = process.env.AWS_REGION || 'us-east-2';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.logger.log(`Neon Object Storage initialized for bucket "${this.bucketName}" at ${endpoint}`);
    } else {
      this.logger.warn('Neon Object Storage credentials not fully set; storage running in fallback mode');
    }
  }

  async healthCheck(): Promise<{ ok: boolean; bucket: string; message: string }> {
    if (!this.s3Client) {
      return { ok: false, bucket: this.bucketName, message: 'S3 client not configured' };
    }
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return { ok: true, bucket: this.bucketName, message: 'Bucket reachable and active' };
    } catch (err: any) {
      this.logger.error(`Neon Object Storage health check failed: ${err.message}`);
      return { ok: false, bucket: this.bucketName, message: err.message };
    }
  }

  async uploadFile(key: string, content: Buffer | string, contentType = 'text/plain') {
    if (!this.s3Client) {
      throw new Error('Neon Object Storage client is not initialized');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: typeof content === 'string' ? Buffer.from(content) : content,
      ContentType: contentType,
    });

    return await this.s3Client.send(command);
  }

  async listFiles(prefix?: string) {
    if (!this.s3Client) {
      throw new Error('Neon Object Storage client is not initialized');
    }

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: 20,
    });

    return await this.s3Client.send(command);
  }
}
