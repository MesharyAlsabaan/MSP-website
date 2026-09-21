import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Request log for the vendor service: method, path, status, elapsed — and
 * nothing else. The query string is dropped (it can carry lease tokens),
 * long opaque path segments are masked, and bodies/headers are never logged.
 */
@Injectable()
export class SafeLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const start = Date.now();
    const path = safePath(String(req.originalUrl ?? req.url ?? ''));
    return next.handle().pipe(tap(() => this.logger.log(`${req.method} ${path} ${res.statusCode} ${Date.now() - start}ms`)));
  }
}

export function safePath(url: string): string {
  const [path] = url.split('?');
  return path
    .split('/')
    .map((seg) => (/^[A-Za-z0-9_-]{32,}$/.test(seg) && !/^[0-9a-f-]{36}$/.test(seg) ? '***' : seg))
    .join('/');
}
