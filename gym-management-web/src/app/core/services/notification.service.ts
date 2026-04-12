import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'warning' | 'error';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);
  private nextId = 1;

  show(message: string, type: NotificationType = 'success', timeoutMs = 4000): void {
    const id = this.nextId++;
    this.notifications.update((items) => [...items, { id, type, message }]);

    if (timeoutMs > 0) {
      setTimeout(() => this.dismiss(id), timeoutMs);
    }
  }

  success(message: string, timeoutMs = 3500): void {
    this.show(message, 'success', timeoutMs);
  }

  warning(message: string, timeoutMs = 4000): void {
    this.show(message, 'warning', timeoutMs);
  }

  error(message: string, timeoutMs = 4500): void {
    this.show(message, 'error', timeoutMs);
  }

  dismiss(id: number): void {
    this.notifications.update((items) => items.filter((item) => item.id !== id));
  }
}

