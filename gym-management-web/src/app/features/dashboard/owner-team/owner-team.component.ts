import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AppUserDto } from '../../../core/models/admin.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';

@Component({
  selector: 'app-owner-team',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent],
  templateUrl: './owner-team.component.html',
  styleUrl: './owner-team.component.css'
})
export class OwnerTeamComponent implements OnInit {
  users: AppUserDto[] = [];
  isLoading = true;
  errorMessage = '';
  isSubmitting = false;

  readonly form;

  constructor(
    private readonly adminService: AdminService,
    private readonly fb: FormBuilder
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      phone: ['', [Validators.maxLength(15)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
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
        password: value.password ?? '',
        role: 'STAFF'
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.form.reset();
          this.loadUsers();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Unable to add staff user.';
        }
      });
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
        this.isLoading = false;
      }
    });
  }
}
