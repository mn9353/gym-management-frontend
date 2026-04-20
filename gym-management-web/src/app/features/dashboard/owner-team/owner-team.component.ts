import { Component, OnDestroy, OnInit } from '@angular/core';
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
export class OwnerTeamComponent implements OnInit, OnDestroy {
  private readonly phoneRegex = /^\+91\d{10}$/;
  private readonly emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  users: AppUserDto[] = [];
  isLoading = true;
  errorMessage = '';
  isSubmitting = false;
  profileImagePreviewUrl: string | null = null;
  profileImageName = '';
  isCameraOpen = false;
  cameraStream: MediaStream | null = null;
  cameraError: string | null = null;
  cameraFacingMode: 'user' | 'environment' = 'user';
  private profileImageBase64: string | null = null;

  readonly form;

  constructor(
    private readonly adminService: AdminService,
    private readonly fb: FormBuilder,
    private readonly notificationService: NotificationService
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.pattern(this.emailRegex), Validators.maxLength(100)]],
      phone: ['', [Validators.pattern(this.phoneRegex)]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.closeCamera();
    this.revokePreviewUrl();
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
        profileImageUrl: this.profileImageBase64,
        role: 'TRAINER'
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (createdUser) => {
          this.form.reset({
            fullName: '',
            email: '',
            phone: ''
          });
          this.clearProfileImage();
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

  async onProfileImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.clearProfileImage();
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notificationService.warning('Please select a valid image file.');
      return;
    }

    this.revokePreviewUrl();
    this.profileImagePreviewUrl = URL.createObjectURL(file);
    this.profileImageName = file.name;

    try {
      this.profileImageBase64 = await this.compressFileToBase64(file);
    } catch {
      this.notificationService.error('Unable to process selected image.');
      this.clearProfileImage();
    }
  }

  async openCamera(): Promise<void> {
    this.isCameraOpen = true;
    this.cameraError = null;
    this.cameraFacingMode = 'user';
    await this.startCameraStream();
  }

  async toggleCameraFacingMode(): Promise<void> {
    this.cameraFacingMode = this.cameraFacingMode === 'user' ? 'environment' : 'user';
    await this.startCameraStream();
  }

  captureFromCamera(video: HTMLVideoElement): void {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      this.profileImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
      this.revokePreviewUrl();
      this.profileImagePreviewUrl = this.profileImageBase64;
      this.profileImageName = 'trainer_capture.jpg';
      this.closeCamera();
    }
  }

  closeCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.isCameraOpen = false;
    this.cameraError = null;
    this.cameraFacingMode = 'user';
  }

  clearProfileImage(): void {
    this.revokePreviewUrl();
    this.profileImagePreviewUrl = null;
    this.profileImageName = '';
    this.profileImageBase64 = null;
  }

  getAvatarLabel(user: AppUserDto): string {
    return (user.fullName || '?').trim().charAt(0).toUpperCase() || '?';
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

  private revokePreviewUrl(): void {
    if (this.profileImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.profileImagePreviewUrl);
    }
  }

  private async startCameraStream(): Promise<void> {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      this.cameraError = null;
    } catch {
      this.cameraError = 'Could not access camera. Please check permissions.';
      this.notificationService.error('Camera access denied or not available.');
    }
  }

  private compressFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const targetWidth = Math.max(1, Math.round(image.width * scale));
        const targetHeight = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image decode failed'));
      };
      image.src = objectUrl;
    });
  }

  isControlInvalid(controlName: 'fullName' | 'email' | 'phone'): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getControlError(controlName: 'fullName' | 'email' | 'phone'): string {
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
