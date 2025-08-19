import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class HttpResponseInterceptor<T> implements NestInterceptor<T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpResponseMeta =
      this.reflector.get('httpResponseMeta', context.getHandler()) || {};

    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'messageCode' in data &&
          'message' in data &&
          'data' in data
        ) {
          return data;
        }

        return {
          statusCode: httpResponseMeta.statusCode ?? 200,
          messageCode: httpResponseMeta.messageCode ?? 203,
          message: httpResponseMeta.message ?? 'Success',
          data: data ?? {},
        };
      }),
    );
  }
}
