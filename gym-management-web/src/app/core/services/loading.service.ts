import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pendingRequests = new BehaviorSubject<number>(0);
  private readonly currentMessage = new BehaviorSubject<string>('Working on it...');
  readonly isLoading$ = this.pendingRequests.asObservable();
  readonly currentMessage$ = this.currentMessage.asObservable();

  show(message?: string): void {
    if (message) {
      this.currentMessage.next(message);
    }
    this.pendingRequests.next(this.pendingRequests.value + 1);
  }

  hide(): void {
    const nextValue = Math.max(0, this.pendingRequests.value - 1);
    this.pendingRequests.next(nextValue);
    if (nextValue === 0) {
      this.currentMessage.next('Working on it...');
    }
  }
}
