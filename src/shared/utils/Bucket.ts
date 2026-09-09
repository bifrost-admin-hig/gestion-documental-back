import { S3Client, PutObjectCommand, GetObjectCommand, PutObjectTaggingCommand, S3ClientConfig, PutObjectCommandOutput } from '@aws-sdk/client-s3';
import FileUtils from './FileUtils';
import { except } from './objects';

interface BucketConfig extends S3ClientConfig {
  bucket: string;
}

export class Bucket extends S3Client {
  constructor(private readonly bucket: BucketConfig) {
    super(except(bucket, 'bucket'));
  }

  async uploadFile({ bucket, source, target }: {
    bucket?: string;
    source: string;
    target: string;
  }): Promise<PutObjectCommandOutput> {
    console.log(`Uploading file ${source} to S3 bucket...`);
    try {
      // Read file content using FileUtils utility
      const fileContent = await FileUtils.read(source);

      const command = new PutObjectCommand({
        Bucket: bucket || this.bucket.bucket,
        Key: target,
        Body: fileContent,
      });

      const response = await this.send(command);
      console.log(`File ${source} uploaded to ${this.bucket.bucket} as "${target}" (object ID: ${response.$metadata.requestId})`);
      return response;
    } catch (error) {
      console.log(`Error uploading file ${source} to ${this.bucket.bucket} as "${target}".`);
      throw error;
    }
  }

  async downloadFile({ bucket, source }: {
    bucket?: string;
    source: string;
  }): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket || this.bucket.bucket,
        Key: source,
      });

      const response = await this.send(command);

      if (!response.Body) {
        throw new Error('No file content received from S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      return buffer;
    } catch (error) {
      console.log(`Error downloading file ${source} from ${this.bucket.bucket}.`);
      throw error;
    }
  }

  async tagAsDeleted(key: string): Promise<void> {
    try {
      const command = new PutObjectTaggingCommand({
        Bucket: this.bucket.bucket,
        Key: key,
        Tagging: {
          TagSet: [
            { Key: 'deleted', Value: 'true' },
          ],
        },
      });

      await this.send(command);
      console.log(`File ${key} tagged as deleted in ${this.bucket.bucket}`);
    } catch (error) {
      console.log(`Error tagging file ${key} as deleted in ${this.bucket.bucket}.`);
      throw error;
    }
  }
}
