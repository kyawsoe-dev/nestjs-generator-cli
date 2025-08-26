import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { S3Module } from 'src/common/s3/s3.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [S3Module, PrismaModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
