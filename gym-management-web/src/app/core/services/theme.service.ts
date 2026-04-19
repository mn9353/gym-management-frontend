import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'gym_app_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private currentTheme: AppTheme = 'light';
  private readonly themeSubject = new BehaviorSubject<AppTheme>(this.currentTheme);
  readonly theme$ = this.themeSubject.asObservable();

  init(): void {
    const saved = this.readStoredTheme();
    if (saved) {
      this.applyTheme(saved, false);
      return;
    }

    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    this.applyTheme(prefersDark ? 'dark' : 'light', false);
  }

  getTheme(): AppTheme {
    return this.currentTheme;
  }

  isDark(): boolean {
    return this.currentTheme === 'dark';
  }

  toggleTheme(): void {
    this.applyTheme(this.currentTheme === 'dark' ? 'light' : 'dark', true);
  }

  applyTheme(theme: AppTheme, persist = true): void {
    this.currentTheme = theme;
    this.themeSubject.next(theme);

    if (typeof document !== 'undefined') {
      const classesToRemove = ['theme-light', 'theme-dark'];
      document.documentElement.classList.remove(...classesToRemove);
      document.body.classList.remove(...classesToRemove);

      const activeClass = theme === 'dark' ? 'theme-dark' : 'theme-light';
      document.documentElement.classList.add(activeClass);
      document.body.classList.add(activeClass);
    }

    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }

  private readStoredTheme(): AppTheme | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  }
}
