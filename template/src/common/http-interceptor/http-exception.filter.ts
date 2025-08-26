import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import * as moment from "moment";
import { PrismaService } from "src/prisma/prisma.service";
import { AppLogger } from "../logger/winston.logger";
import { DBErrorCode, MESSAGE_CODE } from "../enums";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    console.log(exception, "exception");
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, originalUrl, headers, body, query } = request;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal Server Error";
    let messageCode: string | number = statusCode;
    let validationErrors: Record<string, string[]> | null = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exRes = exception.getResponse();
      if (
        statusCode === HttpStatus.BAD_REQUEST &&
        typeof exRes === "object" &&
        Array.isArray((exRes as any).message)
      ) {
        const errors = (exRes as any).message;
        validationErrors = {};
        errors.forEach((msg: string) => {
          const field = msg.split(" ")[0];
          if (!validationErrors![field]) validationErrors![field] = [];
          validationErrors![field].push(msg);
        });
        message = "Validation failed with invalid inputs.";
        messageCode = MESSAGE_CODE.INVALID;
      } else if (typeof exRes === "string") {
        message = capitalizeFirst(exRes);
        messageCode = MESSAGE_CODE.INVALID;
      } else if (typeof exRes === "object" && exRes !== null) {
        const res: any = exRes;
        const rawMessage = Array.isArray(res.message)
          ? res.message[0]
          : res.message ?? message;
        message = capitalizeFirst(rawMessage);
        messageCode =
          res.messageCode ??
          (statusCode === HttpStatus.BAD_REQUEST
            ? MESSAGE_CODE.INVALID
            : statusCode);
      } else {
        message = capitalizeFirst(exception.message);
        messageCode = statusCode;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      switch (exception.code) {
        case "P2002":
          statusCode = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string) || "field";
          message = `Duplicate entry: ${target
            .replace("tbl_", "")
            .replace("_key", "")} already exists.`;
          messageCode = MESSAGE_CODE.INVALID;
          break;
        case DBErrorCode.PgForeignKeyConstraintViolation:
          statusCode = HttpStatus.CONFLICT;
          message = "Foreign key constraint violated";
          messageCode = MESSAGE_CODE.INVALID;
          break;
        case DBErrorCode.PgNotNullConstraintViolation:
          statusCode = HttpStatus.BAD_REQUEST;
          message = "Not null constraint violated";
          messageCode = MESSAGE_CODE.INVALID;
          break;
        default:
          message = capitalizeFirst(exception.message || "Database exception");
          messageCode = statusCode;
      }
    } else if (exception instanceof Error) {
      message = capitalizeFirst(exception.message) || message;
      messageCode = statusCode;
    }

    const duration = Date.now() - ((request as any).__startTime || Date.now());
    const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms | MessageCode: ${messageCode} | Message: ${message} | Headers: ${JSON.stringify(
      headers
    )}`;

    if (statusCode >= 500) AppLogger.error(logMessage);
    else AppLogger.warn(logMessage);

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
    } catch (err) {
      AppLogger.error("Failed to save log to DB: " + err.message);
    }

    return response.status(statusCode).json({
      status: false,
      statusCode,
      messageCode,
      path: originalUrl,
      message,
      validationErrors,
      timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
    });
  }
}

function capitalizeFirst(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
