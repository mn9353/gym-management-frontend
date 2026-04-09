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
  isSubmitting = false;
  errorMessage = '';
  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
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
      .login({ email: payload.email ?? '', password: payload.password ?? '' })
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
}
