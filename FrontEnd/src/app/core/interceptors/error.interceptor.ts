import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Central HTTP error handling. For now it logs; user-facing notifications
 * (toasts) will be wired in when the notification feature lands.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error(
        `[API] ${error.status} ${req.method} ${req.url} — ${error.message}`,
      );
      return throwError(() => error);
    }),
  );
