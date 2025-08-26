import { RESPONSE_MESSAGE_METADATA } from './../decorator/response-message.decorator';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import * as moment from 'moment';

export type Response<T> = {
  status: boolean;
  statusCode: number;
  message: string;
  messageCode: number | string;
  path: string;
  data: T;
  previousPage?: number | null;
  nextPage?: number | null;
  currentPage?: number;
  firstPage?: number;
  lastPage?: number;
  total?: number;
  timestamp: string;
};

@Injectable()
export class HttpResponseInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next
      .handle()
      .pipe(map((res: unknown) => this.responseHandler(res, context)));
  }

  private responseHandler(res: any, context: ExecutionContext): Response<T> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const statusCode = response.statusCode ?? 200;

    const message =
      this.reflector.get<string>(
        RESPONSE_MESSAGE_METADATA,
        context.getHandler(),
      ) || 'Success';

    const messageCode =
      this.reflector.get<number | string>(
        'messageCode',
        context.getHandler(),
      ) ?? 200;

    const isPaginated =
      typeof res?.total === 'number' && Array.isArray(res?.data);

    return {
      status: true,
      statusCode,
      messageCode,
      message,
      path: request.url,
      data: res?.data ?? res ?? {},
      previousPage: isPaginated ? (res.previousPage ?? null) : undefined,
      nextPage: isPaginated ? (res.nextPage ?? null) : undefined,
      currentPage: isPaginated ? (res.currentPage ?? 1) : undefined,
      firstPage: isPaginated ? (res.firstPage ?? 1) : undefined,
      lastPage: isPaginated ? (res.lastPage ?? 1) : undefined,
      total: isPaginated ? (res.total ?? 0) : undefined,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    };
  }
}
