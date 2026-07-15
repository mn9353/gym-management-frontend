import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,100}$/;
  isSubmitting = false;
  errorMessage = '';
  resetMessage = '';
  isResetModalOpen = false;
  resetStage: 'request' | 'verify' | 'change' = 'request';
  readonly form;
  readonly resetForm;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.form = this.fb.group({
      identifier: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
    this.resetForm = this.fb.group({
      identifier: ['', [Validators.required]],
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword: ['', [Validators.required, Validators.pattern(this.passwordRule)]]
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService
      .login({ identifier: (payload.identifier ?? '').trim(), password: payload.password ?? '' })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.errorMessage = res.message || 'Login failed';
            return;
          }

          this.router.navigate([this.authService.resolveDefaultRoute()]);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Unable to login. Please check credentials.';
        }
      });
  }

  sendResetCode(): void {
    const identifier = (this.resetForm.controls.identifier.value ?? '').trim();
    if (!identifier || this.isSubmitting) {
      this.resetForm.controls.identifier.markAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.resetMessage = '';
    this.authService.forgotPassword({ identifier })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res) => {
          this.resetStage = 'verify';
          this.resetMessage = res.message || 'Reset code sent.';
        },
        error: (err) => {
          this.resetMessage = err?.error?.message || 'Unable to send reset code.';
        }
      });
  }

  resetPassword(): void {
    if (this.resetForm.invalid || this.isSubmitting) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const value = this.resetForm.getRawValue();
    this.isSubmitting = true;
    this.resetMessage = '';
    this.authService.resetPassword({
      identifier: (value.identifier ?? '').trim(),
      code: (value.code ?? '').trim(),
      newPassword: value.newPassword ?? ''
    })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res) => {
          this.resetMessage = res.message || 'Password updated. Please login.';
          this.resetForm.controls.code.reset('');
          this.resetForm.controls.newPassword.reset('');
          this.resetStage = 'request';
          this.isResetModalOpen = false;
        },
        error: (err) => {
          this.resetMessage = err?.error?.message || 'Unable to reset password.';
        }
      });
  }

  openResetModal(): void {
    this.isResetModalOpen = true;
    this.resetStage = 'request';
    this.resetMessage = '';
    this.resetForm.reset({
      identifier: this.form.controls.identifier.value ?? '',
      code: '',
      newPassword: ''
    });
  }

  closeResetModal(): void {
    if (this.isSubmitting) {
      return;
    }
    this.isResetModalOpen = false;
    this.resetStage = 'request';
    this.resetMessage = '';
  }

  verifyResetCode(): void {
    if (this.isSubmitting) {
      return;
    }
    const identifier = (this.resetForm.controls.identifier.value ?? '').trim();
    const code = (this.resetForm.controls.code.value ?? '').trim();
    if (!identifier || !/^\d{6}$/.test(code)) {
      this.resetForm.controls.identifier.markAsTouched();
      this.resetForm.controls.code.markAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.resetMessage = '';
    this.authService.verifyResetCode({ identifier, code })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res) => {
          this.resetStage = 'change';
          this.resetMessage = res.message || 'Code verified. Set new password.';
        },
        error: (err) => {
          this.resetMessage = err?.error?.message || 'Invalid/expired code.';
        }
      });
  }

  useDemoCredentials(): void {
    this.form.patchValue({
      identifier: 'demo@gmail.com',
      password: 'demo@1234'
    });
    this.submit();
  }
}
