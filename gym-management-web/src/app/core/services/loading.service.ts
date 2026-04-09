import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pendingRequests = new BehaviorSubject<number>(0);
  readonly isLoading$ = this.pendingRequests.asObservable();

  show(): void {
    this.pendingRequests.next(this.pendingRequests.value + 1);
  }

  hide(): void {
    const nextValue = Math.max(0, this.pendingRequests.value - 1);
    this.pendingRequests.next(nextValue);
  }
}
