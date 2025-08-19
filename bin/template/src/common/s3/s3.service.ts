import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  GetObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as moment from 'moment';
import Base64File from '../classes/base64';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly isLocal: boolean;
  private readonly projectName: string;
  private readonly environment: string;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const region = this.configService.get<string>('AWS_REGION');

    if (!accessKeyId || !secretAccessKey || !region) {
      throw new Error(
        'AWS credentials or region are not set in environment variables.',
      );
    }

    this.bucketName = this.configService.get<string>('S3_BUCKET')!;
    this.projectName = this.configService.get<string>('PROJECT_NAME')!;
    this.environment = this.configService.get<string>('NODE_ENV')!;
    this.isLocal = this.environment === 'dev';

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: this.isLocal,
    });
  }

  async uploadBase64Image(file: Base64File, filePath: string): Promise<string> {
    const base64Data = file.content.replace(/^data:[\w\/\-\.]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const extension = file.name.substring(file.name.lastIndexOf('.'));
    const timestamp = moment().valueOf();
    const filename = file.name.replace(/\.[^/.]+$/, '');
    const date = moment().format('YYYY-MM-DD');

    const key = `${this.projectName}/${this.environment}/${filePath}${date}/${filename}-${timestamp}${extension}`;

    await this.uploadToS3(buffer, file.mimeType, key);
    return key;
  }

  // async uploadFile(
  //   file: Express.Multer.File,
  //   filePath: string,
  // ): Promise<string> {
  //   const extension = file.originalname.substring(
  //     file.originalname.lastIndexOf('.'),
  //   );
  //   const timestamp = moment().valueOf();
  //   const filename = file.originalname.replace(/\.[^/.]+$/, '');
  //   const date = moment().format('YYYY-MM-DD');

  //   const key = `${this.projectName}/${this.environment}/${filePath}${date}/${filename}-${timestamp}${extension}`;

  //   await this.uploadToS3(file.buffer, file.mimetype, key);
  //   return key;
  // }

  private async uploadToS3(
    buffer: Buffer,
    contentType: string,
    key: string,
  ): Promise<void> {
    const s3Params = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(s3Params);
    await this.s3Client.send(command);
  }

  async getSignedUrl(key: string): Promise<string> {
    const presignedUrlParams: GetObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
    };

    return await getSignedUrl(
      this.s3Client,
      new GetObjectCommand(presignedUrlParams),
      { expiresIn: 3600 },
    );
  }

  async remove(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
