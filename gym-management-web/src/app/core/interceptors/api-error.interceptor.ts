import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      notificationService.error(extractApiErrorMessage(error, 'Request failed. Please try again.'));
      return throwError(() => error);
    })
  );
};

function extractApiErrorMessage(error: HttpErrorResponse, fallback: string): string {
  const payload = error?.error as { message?: string; errors?: Record<string, string[] | string> } | null | undefined;
  const details = payload?.errors;
  if (details && typeof details === 'object') {
    for (const value of Object.values(details)) {
      if (Array.isArray(value) && value.length > 0) {
        return value[0];
      }
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }

  return payload?.message || fallback;
}

