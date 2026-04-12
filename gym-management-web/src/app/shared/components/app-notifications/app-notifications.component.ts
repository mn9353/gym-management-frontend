import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-notifications.component.html',
  styleUrl: './app-notifications.component.css'
})
export class AppNotificationsComponent {
  protected readonly notifications = inject(NotificationService);
}

