import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps every successful response in `{ data, message }` to match the
 * frontend `ApiResponse<T>` envelope. Already-paginated payloads
 * ({ data, total, page, pageSize }) are passed through untouched.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in payload &&
          'total' in payload &&
          'pageSize' in payload
        ) {
          return payload; // paginated envelope
        }
        return { data: payload ?? null };
      }),
    );
  }
}
