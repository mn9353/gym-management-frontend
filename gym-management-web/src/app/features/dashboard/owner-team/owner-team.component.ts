import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AppUserDto } from '../../../core/models/admin.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-owner-team',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent],
  templateUrl: './owner-team.component.html',
  styleUrl: './owner-team.component.css'
})
export class OwnerTeamComponent implements OnInit {
  private readonly phoneRegex = /^\+91\d{10}$/;
  private readonly emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  users: AppUserDto[] = [];
  isLoading = true;
  errorMessage = '';
  isSubmitting = false;

  readonly form;

  constructor(
    private readonly adminService: AdminService,
    private readonly fb: FormBuilder,
    private readonly notificationService: NotificationService
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.pattern(this.emailRegex), Validators.maxLength(100)]],
      phone: ['', [Validators.pattern(this.phoneRegex)]],
      role: ['STAFF' as 'STAFF' | 'TRAINER', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      this.errorMessage = this.form.invalid
        ? 'Please fix the highlighted fields before submitting.'
        : this.errorMessage;
      if (this.form.invalid) {
        this.notificationService.warning(this.errorMessage);
      }
      return;
    }

    const value = this.form.getRawValue();
    this.isSubmitting = true;
    this.errorMessage = '';

    this.adminService
      .createOwnerUser({
        fullName: value.fullName ?? '',
        email: value.email ?? '',
        phone: value.phone || null,
        role: (value.role as 'STAFF' | 'TRAINER') ?? 'STAFF'
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (createdUser) => {
          this.form.reset({
            fullName: '',
            email: '',
            phone: '',
            role: 'STAFF'
          });
          this.notificationService.success('Team user added successfully. Login credentials were emailed.');
          if (createdUser.welcomeEmailSent === false) {
            this.notificationService.warning(
              `Team user created, but welcome email failed: ${createdUser.welcomeEmailMessage || 'Unknown error'}`
            );
          }
          this.loadUsers();
        },
        error: (err) => {
          this.errorMessage = this.extractErrorMessage(err, 'Unable to add team user.');
          this.notificationService.error(this.errorMessage);
        }
      });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = this.normalizeIndianPhoneInput(input.value);
    this.form.controls.phone.setValue(input.value, { emitEvent: false });
  }

  private normalizeIndianPhoneInput(value: string | null | undefined): string {
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

  private loadUsers(): void {
    this.isLoading = true;
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load team users.';
        this.notificationService.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  isControlInvalid(controlName: 'fullName' | 'email' | 'phone' | 'role'): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getControlError(controlName: 'fullName' | 'email' | 'phone' | 'role'): string {
    const control = this.form.controls[controlName];
    if (!control || !control.errors || !(control.touched || control.dirty)) {
      return '';
    }

    if (control.errors['required']) {
      return 'This field is required.';
    }
    if (control.errors['maxlength']) {
      return 'Maximum 100 characters allowed.';
    }

    if (controlName === 'email' && control.errors['pattern']) {
      return 'Enter a valid email address.';
    }
    if (controlName === 'phone' && control.errors['pattern']) {
      return 'Phone must be in +91XXXXXXXXXX format.';
    }
    return 'Invalid value.';
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
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
}
