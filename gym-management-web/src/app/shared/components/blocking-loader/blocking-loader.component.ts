import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { map } from 'rxjs';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-blocking-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blocking-loader.component.html',
  styleUrl: './blocking-loader.component.css'
})
export class BlockingLoaderComponent {
  readonly isVisible$;
  readonly currentMessage$;
  constructor(private readonly loadingService: LoadingService) {
    this.isVisible$ = this.loadingService.isLoading$.pipe(map((count) => count > 0));
    this.currentMessage$ = this.loadingService.currentMessage$;
  }
}
