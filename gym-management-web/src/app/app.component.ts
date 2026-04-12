import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BlockingLoaderComponent } from './shared/components/blocking-loader/blocking-loader.component';
import { AppNotificationsComponent } from './shared/components/app-notifications/app-notifications.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BlockingLoaderComponent, AppNotificationsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {}
