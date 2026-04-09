import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, finalize, switchMap, take, throwError } from 'rxjs';
import { API_PATHS } from '../constants/api-paths';
import { FORCE_GLOBAL_LOADER, LOADING_MESSAGE, SKIP_GLOBAL_LOADER } from './loading-context';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const loadingService = inject(LoadingService);

  const shouldShowLoader = resolveShouldShowLoader(req);
  if (shouldShowLoader) {
    const message = req.context.get(LOADING_MESSAGE);
    loadingService.show(message);
  }

  const accessToken = authService.getAccessToken();
  const authReq = accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        req.url.includes(`${API_PATHS.auth.base}${API_PATHS.auth.login}`) ||
        req.url.includes(`${API_PATHS.auth.base}${API_PATHS.auth.refreshToken}`)
      ) {
        return throwError(() => error);
      }

      const refreshToken = authService.getRefreshToken();
      if (!refreshToken) {
        authService.forceLogout();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        return authService.refreshToken().pipe(
          switchMap((res) => {
            if (!res.success || !res.accessToken) {
              throw new Error('Token refresh failed.');
            }

            refreshTokenSubject.next(res.accessToken);
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }));
          }),
          catchError((refreshError) => {
            authService.forceLogout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
          finalize(() => {
            isRefreshing = false;
          })
        );
      }

      return refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })))
      );
    }),
    finalize(() => {
      if (shouldShowLoader) {
        loadingService.hide();
      }
    })
  );
};

function resolveShouldShowLoader(req: HttpRequest<unknown>): boolean {
  const force = req.context.get(FORCE_GLOBAL_LOADER);
  const skip = req.context.get(SKIP_GLOBAL_LOADER);

  if (skip) {
    return false;
  }

  return force || req.method !== 'GET';
}
