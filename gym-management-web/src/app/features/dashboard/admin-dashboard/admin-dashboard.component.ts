import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import {
  AppUserDto,
  CreateGymDto,
  CreateGymOwnerDto,
  CreateGymWithOwnersDto,
  CreateUserDto,
  GymDto,
  UpdateUserDto
} from '../../../core/models/admin.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly phoneRegex = /^\+91\d{10}$/;
  private readonly emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  isLoading = true;
  isStatsLoading = true;
  totalMembers = 0;
  totalRevenueThisMonth = 0;
  totalRevenueAllTime = 0;
  gyms: GymDto[] = [];
  users: AppUserDto[] = [];
  errorMessage = '';
  readonly cardSkeletons = Array.from({ length: 4 }, (_, index) => index);
  readonly tableSkeletons = Array.from({ length: 5 }, (_, index) => index);
  updatingUser = false;
  deletingGymId: string | null = null;
  deletingUserId: string | null = null;
  selectedGymFilter = '';
  userSearchTerm = '';
  userRoleFilter: 'ALL' | AppUserDto['role'] = 'ALL';
  userStatusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';
  readonly editRoleOptions: Array<CreateUserDto['role']> = ['OWNER', 'TRAINER', 'STAFF'];
  readonly staffTrainerRoleOptions: Array<'STAFF' | 'TRAINER'> = ['TRAINER', 'STAFF'];
  editingUserId: string | null = null;
  deleteDialog:
    | { kind: 'gym'; id: string; name: string }
    | { kind: 'user'; id: string; name: string; role: string }
    | null = null;

  activeCreateTab: 'gymOwners' | 'staffTrainer' = 'gymOwners';
  creatingGymWithOwners = false;
  creatingOwnerForGym = false;
  creatingStaffTrainer = false;
  enableSecondOwner = false;

  createGymForm: CreateGymDto = {
    gymName: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    subscriptionPlan: 'basic'
  };

  primaryOwnerForm: CreateGymOwnerDto = {
    fullName: '',
    email: '',
    phone: ''
  };

  secondaryOwnerForm: CreateGymOwnerDto = {
    fullName: '',
    email: '',
    phone: ''
  };

  addOwnerForExistingGymForm = {
    gymId: '',
    fullName: '',
    email: '',
    phone: ''
  };

  createStaffTrainerForm: CreateUserDto = {
    gymId: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'TRAINER'
  };

  editUserForm: UpdateUserDto = {
    fullName: '',
    email: '',
    phone: '',
    role: 'STAFF',
    isActive: true
  };

  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    forkJoin({
      gyms: this.adminService.getGyms(),
      users: this.adminService.getUsers()
    }).subscribe({
      next: ({ gyms, users }) => {
        if (gyms) {
          this.gyms = gyms;
          this.totalMembers = this.gyms.reduce((sum, gym) => sum + (gym.membersCount || 0), 0);
          this.totalRevenueThisMonth = this.totalMembers * 1500;
          this.totalRevenueAllTime = this.totalMembers * 1500 * 6;
          this.isStatsLoading = false;
        }
        this.users = users;

        if (!this.addOwnerForExistingGymForm.gymId && gyms.length > 0) {
          this.addOwnerForExistingGymForm.gymId = gyms[0].id;
        }
        if (!this.createStaffTrainerForm.gymId && gyms.length > 0) {
          this.createStaffTrainerForm.gymId = gyms[0].id;
        }

        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load admin dashboard data.';
        this.notificationService.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  get activeGyms(): number {
    return this.gyms.filter((g) => g.isActive).length;
  }

  get totalOwners(): number {
    return this.users.filter((u) => u.role === 'OWNER').length;
  }

  get visibleUsers(): AppUserDto[] {
    const currentUserId = this.authService.getCurrentUser()?.id;
    let filtered = currentUserId ? this.users.filter((u) => u.id !== currentUserId) : [...this.users];

    if (this.selectedGymFilter) {
      filtered = filtered.filter((u) => u.gymId === this.selectedGymFilter);
    }

    if (this.userRoleFilter !== 'ALL') {
      filtered = filtered.filter((u) => u.role === this.userRoleFilter);
    }

    if (this.userStatusFilter !== 'ALL') {
      filtered = filtered.filter((u) => (this.userStatusFilter === 'ACTIVE' ? u.isActive : !u.isActive));
    }

    const query = this.userSearchTerm.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((u) =>
        u.fullName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.phone ?? '').toLowerCase().includes(query));
    }

    return filtered;
  }

  get trainersAndStaffCount(): number {
    return this.users.filter((u) => u.role === 'TRAINER' || u.role === 'STAFF').length;
  }

  get gymsAtOwnerCapacity(): number {
    return this.gyms.filter((gym) => this.getOwnerCountForGym(gym.id) >= 2).length;
  }

  get ownerCapacityAlerts(): Array<{ gym: GymDto; ownerCount: number; type: 'FULL' | 'NONE' }> {
    return this.gyms
      .map((gym) => {
        const ownerCount = this.getOwnerCountForGym(gym.id);
        if (ownerCount >= 2) {
          return { gym, ownerCount, type: 'FULL' as const };
        }
        if (ownerCount === 0) {
          return { gym, ownerCount, type: 'NONE' as const };
        }
        return null;
      })
      .filter((item): item is { gym: GymDto; ownerCount: number; type: 'FULL' | 'NONE' } => item !== null);
  }

  onCreateGymWithOwners(): void {
    if (!this.createGymForm.gymName.trim() || !this.createGymForm.ownerName.trim()) {
      this.notificationService.warning('Gym name and owner name are required.');
      return;
    }
    if (!this.isValidPhoneOptional(this.createGymForm.phone)) {
      this.notificationService.warning('Gym phone must be in +91XXXXXXXXXX format.');
      return;
    }
    if (!this.isValidEmailOptional(this.createGymForm.email)) {
      this.notificationService.warning('Please enter a valid gym email address.');
      return;
    }
    if (!this.primaryOwnerForm.fullName.trim() || !this.primaryOwnerForm.email.trim()) {
      this.notificationService.warning('Primary owner name and email are required.');
      return;
    }
    if (!this.isValidEmailOptional(this.primaryOwnerForm.email)) {
      this.notificationService.warning('Please enter a valid primary owner email.');
      return;
    }
    if (!this.isValidPhoneOptional(this.primaryOwnerForm.phone)) {
      this.notificationService.warning('Primary owner phone must be in +91XXXXXXXXXX format.');
      return;
    }
    if (
      this.enableSecondOwner &&
      (!this.secondaryOwnerForm.fullName.trim() || !this.secondaryOwnerForm.email.trim())
    ) {
      this.notificationService.warning('Second owner name and email are required.');
      return;
    }
    if (this.enableSecondOwner && !this.isValidEmailOptional(this.secondaryOwnerForm.email)) {
      this.notificationService.warning('Please enter a valid second owner email.');
      return;
    }
    if (this.enableSecondOwner && !this.isValidPhoneOptional(this.secondaryOwnerForm.phone)) {
      this.notificationService.warning('Second owner phone must be in +91XXXXXXXXXX format.');
      return;
    }
    const owners: CreateGymOwnerDto[] = [
      {
        fullName: this.primaryOwnerForm.fullName.trim(),
        email: this.primaryOwnerForm.email.trim(),
        phone: this.primaryOwnerForm.phone?.trim() || null
      }
    ];

    if (this.enableSecondOwner) {
      owners.push({
        fullName: this.secondaryOwnerForm.fullName.trim(),
        email: this.secondaryOwnerForm.email.trim(),
        phone: this.secondaryOwnerForm.phone?.trim() || null
      });
    }

    const payload: CreateGymWithOwnersDto = {
      gym: {
        gymName: this.createGymForm.gymName.trim(),
        ownerName: this.createGymForm.ownerName.trim(),
        phone: this.createGymForm.phone?.trim() || null,
        email: this.createGymForm.email?.trim() || null,
        address: this.createGymForm.address?.trim() || null,
        city: this.createGymForm.city?.trim() || null,
        state: this.createGymForm.state?.trim() || null,
        subscriptionPlan: this.createGymForm.subscriptionPlan?.trim() || 'basic'
      },
      owners
    };

    this.creatingGymWithOwners = true;
    this.adminService.createGymWithOwners(payload).subscribe({
      next: (response) => {
        this.gyms = [response.gym, ...this.gyms];
        this.users = [...response.owners, ...this.users];
        this.creatingGymWithOwners = false;

        this.resetCreateGymAndOwnersForm(response.gym.id);
        this.notificationService.success('Gym and owner accounts created successfully. Login credentials were emailed.');
        const failedOwnerEmails = response.owners
          .filter((owner) => owner.welcomeEmailSent === false)
          .map((owner) => owner.email);
        if (failedOwnerEmails.length > 0) {
          this.notificationService.warning(
            `Created successfully, but welcome email failed for: ${failedOwnerEmails.join(', ')}.`
          );
        }
        if (response.gym.notificationEmailSent === false) {
          this.notificationService.warning(
            `Gym notification email failed: ${response.gym.notificationEmailMessage || 'Unknown error'}`
          );
        }
      },
      error: (err) => {
        this.creatingGymWithOwners = false;
        this.notificationService.error(this.getApiErrorMessage(err, 'Failed to create gym and owners.'));
      }
    });
  }

  onAddOwnerForExistingGym(): void {
    if (!this.addOwnerForExistingGymForm.gymId) {
      this.notificationService.warning('Please select a gym.');
      return;
    }
    if (!this.addOwnerForExistingGymForm.fullName.trim() || !this.addOwnerForExistingGymForm.email.trim()) {
      this.notificationService.warning('Owner name and email are required.');
      return;
    }
    if (!this.isValidEmailOptional(this.addOwnerForExistingGymForm.email)) {
      this.notificationService.warning('Please enter a valid owner email.');
      return;
    }
    if (!this.isValidPhoneOptional(this.addOwnerForExistingGymForm.phone)) {
      this.notificationService.warning('Owner phone must be in +91XXXXXXXXXX format.');
      return;
    }
    const payload: CreateUserDto = {
      gymId: this.addOwnerForExistingGymForm.gymId,
      fullName: this.addOwnerForExistingGymForm.fullName.trim(),
      email: this.addOwnerForExistingGymForm.email.trim(),
      phone: this.addOwnerForExistingGymForm.phone?.trim() || null,
      role: 'OWNER'
    };

    this.creatingOwnerForGym = true;
    this.adminService.createUser(payload).subscribe({
      next: (createdUser) => {
        this.users = [createdUser, ...this.users];
        this.creatingOwnerForGym = false;
        this.addOwnerForExistingGymForm = {
          gymId: this.addOwnerForExistingGymForm.gymId,
          fullName: '',
          email: '',
          phone: ''
        };
        this.notificationService.success('Owner added successfully. Login credentials were emailed.');
        if (createdUser.welcomeEmailSent === false) {
          this.notificationService.warning(
            `User created, but welcome email failed: ${createdUser.welcomeEmailMessage || 'Unknown error'}`
          );
        }
      },
      error: (err) => {
        this.creatingOwnerForGym = false;
        this.notificationService.error(this.getApiErrorMessage(err, 'Failed to add owner.'));
      }
    });
  }

  onCreateStaffTrainer(): void {
    if (!this.createStaffTrainerForm.gymId) {
      this.notificationService.warning('Please select a gym.');
      return;
    }
    if (!this.createStaffTrainerForm.fullName.trim() || !this.createStaffTrainerForm.email.trim()) {
      this.notificationService.warning('Name and email are required.');
      return;
    }
    if (!this.isValidEmailOptional(this.createStaffTrainerForm.email)) {
      this.notificationService.warning('Please enter a valid email.');
      return;
    }
    if (!this.isValidPhoneOptional(this.createStaffTrainerForm.phone)) {
      this.notificationService.warning('Phone must be in +91XXXXXXXXXX format.');
      return;
    }
    this.creatingStaffTrainer = true;
    this.adminService.createUser({
      ...this.createStaffTrainerForm,
      fullName: this.createStaffTrainerForm.fullName.trim(),
      email: this.createStaffTrainerForm.email.trim(),
      phone: this.createStaffTrainerForm.phone?.trim() || null
    }).subscribe({
      next: (createdUser) => {
        this.users = [createdUser, ...this.users];
        this.creatingStaffTrainer = false;
        this.createStaffTrainerForm = {
          gymId: this.createStaffTrainerForm.gymId,
          fullName: '',
          email: '',
          phone: '',
          role: 'TRAINER'
        };
        this.notificationService.success(`${createdUser.role} user created successfully. Login credentials were emailed.`);
        if (createdUser.welcomeEmailSent === false) {
          this.notificationService.warning(
            `User created, but welcome email failed: ${createdUser.welcomeEmailMessage || 'Unknown error'}`
          );
        }
      },
      error: (err) => {
        this.creatingStaffTrainer = false;
        this.notificationService.error(this.getApiErrorMessage(err, 'Failed to create user.'));
      }
    });
  }

  startEditUser(user: AppUserDto): void {
    this.editingUserId = user.id;
    this.editUserForm = {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive
    };
  }

  cancelEditUser(): void {
    this.editingUserId = null;
    this.updatingUser = false;
  }

  onUpdateUser(): void {
    if (!this.editingUserId) {
      return;
    }
    if (!this.editUserForm.email?.trim()) {
      this.notificationService.warning('Email is required.');
      return;
    }
    if (!this.isValidEmailOptional(this.editUserForm.email)) {
      this.notificationService.warning('Please enter a valid email.');
      return;
    }
    if (!this.isValidPhoneOptional(this.editUserForm.phone)) {
      this.notificationService.warning('Phone must be in +91XXXXXXXXXX format.');
      return;
    }

    this.updatingUser = true;
    this.adminService.updateUser(this.editingUserId, this.editUserForm).subscribe({
      next: (updated) => {
        this.users = this.users.map((u) => (u.id === updated.id ? updated : u));
        this.updatingUser = false;
        this.editingUserId = null;
        this.notificationService.success('User updated successfully.');
      },
      error: (err) => {
        this.updatingUser = false;
        this.notificationService.error(this.getApiErrorMessage(err, 'Failed to update user.'));
      }
    });
  }

  onDeleteGym(gym: GymDto): void {
    this.deletingGymId = gym.id;
    this.adminService.deleteGym(gym.id).subscribe({
      next: (res) => {
        this.gyms = this.gyms.filter((g) => g.id !== gym.id);
        this.users = this.users.filter((u) => u.gymId !== gym.id);
        this.deletingGymId = null;
        this.deleteDialog = null;
        this.notificationService.success(res?.message || 'Gym deleted successfully.');
      },
      error: (err) => {
        this.deletingGymId = null;
        this.deleteDialog = null;
        this.notificationService.error(this.getApiErrorMessage(err, 'Failed to delete gym.'));
      }
    });
  }

  onDeleteUser(user: AppUserDto): void {
    this.deletingUserId = user.id;
    this.adminService.deleteUser(user.id).subscribe({
      next: (res) => {
        this.users = this.users.filter((u) => u.id !== user.id);
        this.deletingUserId = null;
        this.deleteDialog = null;
        if (this.editingUserId === user.id) {
          this.cancelEditUser();
        }
        this.notificationService.success(res?.message || 'User deleted successfully.');
      },
      error: (err) => {
        this.deletingUserId = null;
        this.deleteDialog = null;
        this.notificationService.error(this.getApiErrorMessage(err, 'Failed to delete user.'));
      }
    });
  }

  openDeleteGymDialog(gym: GymDto): void {
    this.deleteDialog = { kind: 'gym', id: gym.id, name: gym.gymName };
  }

  openDeleteUserDialog(user: AppUserDto): void {
    this.deleteDialog = { kind: 'user', id: user.id, name: user.fullName, role: user.role };
  }

  closeDeleteDialog(): void {
    if (this.deletingGymId || this.deletingUserId) {
      return;
    }
    this.deleteDialog = null;
  }

  confirmDelete(): void {
    if (!this.deleteDialog) {
      return;
    }

    if (this.deleteDialog.kind === 'gym') {
      const gym = this.gyms.find((g) => g.id === this.deleteDialog!.id);
      if (!gym) {
        this.deleteDialog = null;
        return;
      }
      this.onDeleteGym(gym);
      return;
    }

    const user = this.users.find((u) => u.id === this.deleteDialog!.id);
    if (!user) {
      this.deleteDialog = null;
      return;
    }
    this.onDeleteUser(user);
  }

  get isDeleteInProgress(): boolean {
    return !!this.deletingGymId || !!this.deletingUserId;
  }

  normalizeIndianPhoneInput(value: string | null | undefined): string {
    const raw = (value ?? '').trim();
    if (!raw) {
      return '';
    }

    const digits = raw.replace(/\D/g, '');
    const tenDigits = digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(0, 10);
    if (!tenDigits) {
      return '+91';
    }

    return `+91${tenDigits}`;
  }

  getOwnerCountForGym(gymId: string): number {
    return this.users.filter((u) => u.gymId === gymId && u.role === 'OWNER').length;
  }

  getOwnerCapacityLabel(gymId: string): string {
    return `${this.getOwnerCountForGym(gymId)}/2`;
  }

  exportGymsCsv(): void {
    const rows = this.gyms.map((g) => ({
      gymName: g.gymName,
      ownerName: g.ownerName,
      ownerCapacity: this.getOwnerCapacityLabel(g.id),
      city: g.city || '',
      plan: g.subscriptionPlan,
      isActive: g.isActive ? 'Yes' : 'No',
      usersCount: g.usersCount ?? 0,
      membersCount: g.membersCount ?? 0,
      revenueThisMonth: g.revenueThisMonth ?? 0,
      revenueLastMonth: g.revenueLastMonth ?? 0,
      revenueTotal: g.revenueTotal ?? 0
    }));

    this.downloadCsv(rows, `admin-gyms-${new Date().toISOString().slice(0, 10)}.csv`);
    this.notificationService.success('Gym report exported.');
  }

  exportVisibleUsersCsv(): void {
    const rows = this.visibleUsers.map((u) => ({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      gymId: u.gymId || '',
      isActive: u.isActive ? 'Yes' : 'No',
      createdAt: new Date(u.createdAt).toISOString()
    }));

    this.downloadCsv(rows, `admin-users-${new Date().toISOString().slice(0, 10)}.csv`);
    this.notificationService.success('User report exported.');
  }

  private resetCreateGymAndOwnersForm(createdGymId: string): void {
    this.createGymForm = {
      gymName: '',
      ownerName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      subscriptionPlan: 'basic'
    };
    this.primaryOwnerForm = {
      fullName: '',
      email: '',
      phone: ''
    };
    this.secondaryOwnerForm = {
      fullName: '',
      email: '',
      phone: ''
    };
    this.enableSecondOwner = false;

    this.addOwnerForExistingGymForm.gymId = createdGymId;
    this.addOwnerForExistingGymForm.fullName = '';
    this.addOwnerForExistingGymForm.email = '';
    this.addOwnerForExistingGymForm.phone = '';

    this.createStaffTrainerForm.gymId = createdGymId;
  }

  private isValidEmailOptional(value: string | null | undefined): boolean {
    const input = (value ?? '').trim();
    if (!input) {
      return true;
    }
    return this.emailRegex.test(input);
  }

  private isValidPhoneOptional(value: string | null | undefined): boolean {
    const input = (value ?? '').trim();
    if (!input) {
      return true;
    }
    return this.phoneRegex.test(input);
  }

  private getApiErrorMessage(error: unknown, fallback: string): string {
    const err = error as { error?: { message?: string; errors?: Record<string, string[] | string> } };
    const details = err?.error?.errors;
    if (details && typeof details === 'object') {
      for (const value of Object.values(details)) {
        if (Array.isArray(value) && value.length > 0) {
          return value[0];
        }
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
    }

    return err?.error?.message || fallback;
  }

  private downloadCsv(rows: Record<string, string | number>[], filename: string): void {
    if (!rows.length) {
      this.notificationService.warning('No rows available to export.');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const raw = String(row[header] ?? '');
            return `"${raw.replace(/"/g, '""')}"`;
          })
          .join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
