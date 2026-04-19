import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IrregularMember } from '../../../core/models/dashboard.models';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-owner-irregular-members',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './owner-irregular-members.component.html',
  styleUrl: './owner-irregular-members.component.css'
})
export class OwnerIrregularMembersComponent implements OnInit {
  isLoading = true;
  members: IrregularMember[] = [];
  errorMessage = '';

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  private loadMembers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.dashboardService.getIrregularMembers(4, 300).subscribe({
      next: (items) => {
        this.members = items;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load irregular members.';
        this.notificationService.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }
}
