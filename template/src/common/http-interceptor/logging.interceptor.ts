import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLogger } from '../logger/winston.logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, headers, body, query } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(async (responseBody) => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const messageCode = responseBody?.messageCode ?? statusCode;
        const message = responseBody?.message ?? '';

        const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms | Message Code: ${messageCode} | Message: ${message}`;
        if (statusCode >= 500) {
          AppLogger.error(logMessage);
        } else if (statusCode >= 400) {
          AppLogger.warn(logMessage);
        } else {
          AppLogger.info(logMessage);
        }

        try {
          await this.prisma.log.create({
            data: {
              method,
              path: originalUrl,
              statusCode,
              messageCode: messageCode.toString(),
              message,
              headers: headers as any,
              body: body as any,
              query: query as any,
              duration,
            },
          });
        } catch (dbError) {
          AppLogger.error('Failed to save log in DB: ' + dbError.message);
        }
      }),
      catchError((error) => {
        const duration = Date.now() - start;
        const statusCode = error?.status ?? 500;
        const messageCode = error?.response?.messageCode ?? statusCode;
        const message =
          error?.response?.message ?? error.message ?? 'Unknown error';

        const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms | Message Code: ${messageCode} | Message: ${message}`;
        AppLogger.error(logMessage);

        this.prisma.log
          .create({
            data: {
              method,
              path: originalUrl,
              statusCode,
              messageCode: messageCode.toString(),
              message,
              headers: headers as any,
              body: body as any,
              query: query as any,
              duration,
            },
          })
          .catch((dbError) => {
            AppLogger.error(
              'Failed to save error log in DB: ' + dbError.message,
            );
          });

        return throwError(() => error);
      }),
    );
  }
}
