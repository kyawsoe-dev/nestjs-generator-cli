import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { AppLogger } from '../logger/winston.logger';
import { Request, Response } from 'express';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, headers } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap((responseBody) => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;

        const messageCode = responseBody?.messageCode ?? statusCode;
        const message = responseBody?.message ?? '';

        const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms | Message Code: ${messageCode} | Message: ${message} | Headers: ${JSON.stringify(
          headers,
        )}`;

        if (statusCode >= 500) {
          AppLogger.error(logMessage);
        } else if (statusCode >= 400) {
          AppLogger.warn(logMessage);
        } else {
          AppLogger.info(logMessage);
        }
      }),
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }
}
