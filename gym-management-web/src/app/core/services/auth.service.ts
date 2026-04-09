import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, of, tap } from 'rxjs';
import { LoginRequest, LoginResponse, RefreshTokenResponse, UserProfile, UserRole } from '../models/auth.models';
import { API_PATHS } from '../constants/api-paths';
import { buildApiUrl } from '../constants/api-url';

const ACCESS_TOKEN_KEY = 'gm_access_token';
const REFRESH_TOKEN_KEY = 'gm_refresh_token';
const USER_KEY = 'gm_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<UserProfile | null>(this.readUserFromStorage());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(buildApiUrl(API_PATHS.auth.base, API_PATHS.auth.login), payload).pipe(
      tap((res) => {
        if (res.success && res.user && res.accessToken && res.refreshToken) {
          this.storeSession(res.user, res.accessToken, res.refreshToken);
        }
      })
    );
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<RefreshTokenResponse>(buildApiUrl(API_PATHS.auth.base, API_PATHS.auth.refreshToken), { refreshToken })
      .pipe(
        tap((res) => {
          if (res.success && res.accessToken && res.refreshToken) {
            localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
          }
        })
      );
  }

  fetchCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(buildApiUrl(API_PATHS.auth.base, API_PATHS.auth.me)).pipe(
      tap((user) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  logout(): Observable<unknown> {
    const refreshToken = this.getRefreshToken();
    return this.http.post(buildApiUrl(API_PATHS.auth.base, API_PATHS.auth.logout), { refreshToken }).pipe(
      tap(() => this.clearSession())
    );
  }

  verifyToken(): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(buildApiUrl(API_PATHS.auth.base, API_PATHS.auth.verify));
  }

  forceLogout(): void {
    this.clearSession();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const role = this.getCurrentUser()?.role;
    return !!role && roles.includes(role);
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'ADMIN';
  }

  isOwnerOrStaff(): boolean {
    const role = this.getCurrentUser()?.role;
    return role === 'OWNER' || role === 'STAFF';
  }

  resolveDefaultRoute(): string {
    const role = this.getCurrentUser()?.role;
    if (role === 'ADMIN') {
      return '/admin/dashboard';
    }

    return '/owner/dashboard';
  }

  ensureProfileLoaded(): Observable<UserProfile | null> {
    if (!this.isAuthenticated()) {
      return of(null);
    }

    if (this.getCurrentUser()) {
      return this.currentUser$.pipe(map((user) => user));
    }

    return this.fetchCurrentUser().pipe(map((user) => user));
  }

  private storeSession(user: UserProfile, accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  private readUserFromStorage(): UserProfile | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
