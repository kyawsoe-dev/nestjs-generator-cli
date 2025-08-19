import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DBErrorCode, MESSAGE_CODE } from '../enums';
import { AppLogger } from '../logger/winston.logger';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    console.log(exception, 'exception');
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let messageCode: string | number = status;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = capitalizeFirst(exceptionResponse);
        messageCode = MESSAGE_CODE.INVALID;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res: any = exceptionResponse;
        const rawMessage = Array.isArray(res.message)
          ? res.message[0]
          : (res.message ?? message);

        message = capitalizeFirst(rawMessage);
        messageCode =
          res.messageCode ??
          (status === HttpStatus.BAD_REQUEST ? MESSAGE_CODE.INVALID : status);
      } else {
        message = capitalizeFirst(exception.message);
        messageCode = status;
      }
    } else if (typeof exception === 'object' && exception !== null) {
      const ex: any = exception;
      if (ex.code) {
        switch (ex.code) {
          case DBErrorCode.PgUniqueConstraintViolation:
            status = HttpStatus.CONFLICT;
            message = 'Unique constraint violated';
            messageCode = MESSAGE_CODE.INVALID;
            break;
          case DBErrorCode.PgForeignKeyConstraintViolation:
            status = HttpStatus.CONFLICT;
            message = 'Foreign key constraint violated';
            messageCode = MESSAGE_CODE.INVALID;
            break;
          case DBErrorCode.PgNotNullConstraintViolation:
            status = HttpStatus.BAD_REQUEST;
            message = 'Not null constraint violated';
            messageCode = MESSAGE_CODE.INVALID;
            break;
          default:
            message = capitalizeFirst(ex.message || 'Database exception');
            messageCode = status;
        }
      }
    }

    const duration = Date.now() - (request as any).__startTime || 0;
    const logMessage = `${request.method} ${request.originalUrl} ${status} - ${duration}ms | Message Code: ${messageCode} | Message: ${message} | Headers: ${JSON.stringify(request.headers)}`;

    if (status >= 500) {
      AppLogger.error(logMessage);
    } else {
      AppLogger.warn(logMessage);
    }

    response.status(status).json({
      statusCode: status,
      messageCode,
      message,
    });
  }
}

function capitalizeFirst(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
