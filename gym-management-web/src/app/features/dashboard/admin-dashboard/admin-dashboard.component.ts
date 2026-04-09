import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AppUserDto, GymDto } from '../../../core/models/admin.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  isLoading = true;
  gyms: GymDto[] = [];
  users: AppUserDto[] = [];
  errorMessage = '';
  readonly cardSkeletons = Array.from({ length: 4 }, (_, index) => index);
  readonly tableSkeletons = Array.from({ length: 5 }, (_, index) => index);

  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    forkJoin({
      gyms: this.adminService.getGyms(),
      users: this.adminService.getUsers()
    }).subscribe({
      next: ({ gyms, users }) => {
        this.gyms = gyms;
        this.users = users;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load admin dashboard data.';
        this.isLoading = false;
      }
    });
  }

  get activeGyms(): number {
    return this.gyms.filter((g) => g.isActive).length;
  }

  get totalOwners(): number {
    return this.visibleUsers.filter((u) => u.role === 'OWNER').length;
  }

  get visibleUsers(): AppUserDto[] {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId) {
      return this.users;
    }

    return this.users.filter((u) => u.id !== currentUserId);
  }
}
