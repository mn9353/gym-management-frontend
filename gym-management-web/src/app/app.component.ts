import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BlockingLoaderComponent } from './shared/components/blocking-loader/blocking-loader.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BlockingLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {}
