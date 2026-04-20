import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MemberService } from '../../../core/services/member.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CreateMemberDto, ExistingMemberSummary, RenewMemberDto } from '../../../core/models/member.models';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-owner-add-member',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent, ConfirmDialogComponent],
  templateUrl: './owner-add-member.component.html',
  styleUrl: './owner-add-member.component.css'
})
export class OwnerAddMemberComponent implements OnInit, OnDestroy {
  private readonly strictEmailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  private readonly phoneRegex = /^\+91\d{10}$/;
  private readonly destroy$ = new Subject<void>();

  isSubmitting = false;
  submitAttempted = false;
  profileImagePreviewUrl: string | null = null;
  profileImageName = '';
  duplicateMember: ExistingMemberSummary | null = null;
  trainers: string[] = [];
  loadingTrainers = false;
  pendingAction: 'create' | 'renew' | null = null;
  pendingCreatePayload: CreateMemberDto | null = null;
  pendingRenewPayload: { memberId: string; payload: RenewMemberDto } | null = null;
  confirmDialog = {
    open: false,
    title: '',
    lines: [] as string[],
    confirmText: 'Confirm',
    tone: 'primary' as 'primary' | 'warning'
  };
  
  isCameraOpen = false;
  cameraStream: MediaStream | null = null;
  cameraError: string | null = null;
  cameraFacingMode: 'user' | 'environment' = 'user';
  private scrollLockActive = false;
  private previousBodyOverflow = '';
  private previousHtmlOverflow = '';

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly memberService: MemberService,
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService,
    private readonly adminService: AdminService
  ) {
    this.form = this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      phone: ['+91', [Validators.required, Validators.pattern(this.phoneRegex)]],
      email: ['', [Validators.pattern(this.strictEmailRegex), Validators.maxLength(100)]],
      trainingType: ['GENERAL' as 'GENERAL' | 'PERSONAL'],
      trainerAssigned: [''],
      leadSource: [''],
      targetWeight: [null as number | null, [Validators.min(0)]],
      joinDate: ['', Validators.required],
      planDurationMonths: [1, [Validators.required, Validators.min(1), Validators.max(24)]],
      amountToPay: [null as number | null, [Validators.required, Validators.min(0)]],
      amountPaid: [0 as number | null, [Validators.min(0)]],
      paymentMode: ['UPI' as 'CASH' | 'UPI' | 'CARD']
    });
  }

  ngOnInit(): void {
    this.setupTrainingTypeBehavior();
    this.applyContextDefaults();
    this.loadTrainersForOwnerContext();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.closeCamera();
    this.setCameraScrollLock(false);
    this.revokePreviewUrl();
  }

  private profileImageBase64: string | null = null;

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
      this.notificationService.error('Unable to process the selected image.');
      this.clearProfileImage();
    }
  }

  async openCamera(): Promise<void> {
    this.isCameraOpen = true;
    this.cameraError = null;
    this.cameraFacingMode = 'user';
    this.setCameraScrollLock(true);
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
      this.profileImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      this.profileImagePreviewUrl = this.profileImageBase64;
      this.profileImageName = 'camera_capture.jpg';
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
    this.setCameraScrollLock(false);
  }

  clearProfileImage(): void {
    this.revokePreviewUrl();
    this.profileImagePreviewUrl = null;
    this.profileImageName = '';
    this.profileImageBase64 = null;
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalized = this.normalizeIndianPhoneInput(input.value);
    input.value = normalized;
    this.form.controls.phone.setValue(normalized, { emitEvent: false });
  }

  submit(): void {
    this.submitAttempted = true;
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.duplicateMember = null;

    const value = this.form.getRawValue();
    const phone = this.normalizeIndianPhoneInput(value.phone);
    if (!this.phoneRegex.test(phone)) {
      this.notificationService.warning('Phone must be in +91XXXXXXXXXX format.');
      return;
    }

    const amountToPay = Number(value.amountToPay ?? 0);
    const amountPaid = Number(value.amountPaid ?? 0);
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
      this.notificationService.warning('Amount to pay is required and must be greater than 0.');
      return;
    }
    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      this.notificationService.warning('Amount paid cannot be negative.');
      return;
    }
    if (amountPaid > amountToPay) {
      this.notificationService.warning('Amount paid cannot be more than amount to pay.');
      return;
    }

    const trainingType = value.trainingType === 'PERSONAL' ? 'PERSONAL' : 'GENERAL';
    const trainerAssigned = this.resolveTrainerAssigned(trainingType, value.trainerAssigned);
    if (trainingType === 'PERSONAL' && !trainerAssigned) {
      this.notificationService.warning('Please choose a trainer for PERSONAL training.');
      return;
    }

    const paymentMode = (value.paymentMode || '').trim().toUpperCase();
    if (amountPaid > 0 && !paymentMode) {
      this.notificationService.warning('Payment mode is required when amount paid is greater than 0.');
      return;
    }

    const paymentStatus = this.resolvePaymentStatus(amountPaid, amountToPay);
    const leadSource = (value.leadSource || '').trim();
    const parsedTargetWeight = Number(value.targetWeight);
    const targetWeight = Number.isFinite(parsedTargetWeight) && parsedTargetWeight > 0 ? parsedTargetWeight : null;

    this.pendingAction = 'create';
    this.pendingCreatePayload = {
      fullName: value.fullName.trim(),
      phone,
      email: value.email?.trim().toLowerCase() || null,
      joinDate: value.joinDate,
      planStartDate: value.joinDate,
      planDurationMonths: Number(value.planDurationMonths),
      amountToPay,
      paymentStatus,
      amountPaid,
      paymentMode: amountPaid > 0 ? (paymentMode as 'CASH' | 'UPI' | 'CARD') : null,
      trainingType,
      trainerAssigned: trainerAssigned || null,
      leadSource: leadSource || null,
      targetWeight,
      profileImageUrl: this.profileImageBase64
    };

    this.openConfirmDialog(
      'Confirm Add Member',
      [
        `Training type: ${trainingType}`,
        ...(trainerAssigned ? [`Assigned trainer: ${trainerAssigned}`] : []),
        `Amount to pay: ${this.formatAmount(amountToPay)}`,
        `Amount paid now: ${this.formatAmount(amountPaid)}`,
        ...(amountPaid > 0 ? [`Payment mode: ${paymentMode}`] : []),
        `Payment status will be ${paymentStatus}.`,
        amountPaid <= 0 ? 'You are adding this member with zero payment. Are you sure?' : 'Do you want to continue?'
      ],
      'Add Member',
      amountPaid <= 0 ? 'warning' : 'primary'
    );
  }

  renewExistingMember(): void {
    if (this.isSubmitting || !this.duplicateMember) {
      return;
    }

    const planStartDate = this.form.controls.joinDate.value;
    const planDurationMonths = Number(this.form.controls.planDurationMonths.value);
    if (!planStartDate || !Number.isFinite(planDurationMonths) || planDurationMonths < 1) {
      this.notificationService.warning('Plan start date and duration are required for renewal.');
      return;
    }

    const value = this.form.getRawValue();
    const amountToPay = Number(value.amountToPay ?? 0);
    const amountPaid = Number(value.amountPaid ?? 0);
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
      this.notificationService.warning('Amount to pay is required and must be greater than 0.');
      return;
    }
    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      this.notificationService.warning('Amount paid cannot be negative.');
      return;
    }
    if (amountPaid > amountToPay) {
      this.notificationService.warning('Amount paid cannot be more than amount to pay.');
      return;
    }

    const paymentMode = (value.paymentMode || '').trim().toUpperCase();
    if (amountPaid > 0 && !paymentMode) {
      this.notificationService.warning('Payment mode is required when amount paid is greater than 0.');
      return;
    }

    const paymentStatus = this.resolvePaymentStatus(amountPaid, amountToPay);
    this.pendingAction = 'renew';
    this.pendingRenewPayload = {
      memberId: this.duplicateMember.id,
      payload: {
        planStartDate,
        planDurationMonths,
        amountToPay,
        amountPaid,
        paymentStatus,
        paymentMode: amountPaid > 0 ? (paymentMode as 'CASH' | 'UPI' | 'CARD') : null,
        paymentDate: new Date().toISOString().split('T')[0]
      }
    };

    this.openConfirmDialog(
      'Confirm Renewal',
      [
        `Amount to pay: ${this.formatAmount(amountToPay)}`,
        `Amount paid now: ${this.formatAmount(amountPaid)}`,
        ...(amountPaid > 0 ? [`Payment mode: ${paymentMode}`] : []),
        `Payment status will be ${paymentStatus}.`,
        amountPaid <= 0 ? 'You are renewing with zero payment. Are you sure?' : 'Do you want to continue?'
      ],
      'Confirm Renewal',
      amountPaid <= 0 ? 'warning' : 'primary'
    );
  }

  onConfirmDialogClose(): void {
    if (this.isSubmitting) {
      return;
    }
    this.confirmDialog.open = false;
    this.pendingAction = null;
    this.pendingCreatePayload = null;
    this.pendingRenewPayload = null;
  }

  onConfirmDialogSubmit(): void {
    if (this.isSubmitting || !this.pendingAction) {
      return;
    }

    if (this.pendingAction === 'create' && this.pendingCreatePayload) {
      this.executeCreate(this.pendingCreatePayload);
      return;
    }

    if (this.pendingAction === 'renew' && this.pendingRenewPayload) {
      this.executeRenew(this.pendingRenewPayload.memberId, this.pendingRenewPayload.payload);
    }
  }

  get computedPlanEndDateLabel(): string {
    const start = this.form.controls.joinDate.value;
    const months = Number(this.form.controls.planDurationMonths.value);
    if (!start || !Number.isFinite(months) || months < 1) {
      return '-';
    }

    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) {
      return '-';
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setDate(endDate.getDate() - 1);
    return endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get computedMembershipTypeLabel(): string {
    const months = Number(this.form.controls.planDurationMonths.value);
    if (!Number.isFinite(months) || months < 1) {
      return '-';
    }

    if (months >= 12) {
      return 'yearly';
    }
    if (months >= 6) {
      return 'half yearly';
    }
    if (months >= 3) {
      return 'quarterly';
    }
    if (months === 1) {
      return 'monthly';
    }
    return `${months} months`;
  }

  get shouldShowTrainerField(): boolean {
    return this.form.controls.trainingType.value === 'PERSONAL';
  }

  showRequired(controlName: 'fullName' | 'phone' | 'joinDate' | 'planDurationMonths' | 'amountToPay'): boolean {
    const control = this.form.controls[controlName];
    return (this.submitAttempted || control.touched) && control.hasError('required');
  }

  showRangeError(controlName: 'planDurationMonths'): boolean {
    const control = this.form.controls[controlName];
    return (this.submitAttempted || control.touched) && (control.hasError('min') || control.hasError('max'));
  }

  showPaymentModeRequired(): boolean {
    const amountPaid = Number(this.form.controls.amountPaid.value ?? 0);
    const paymentMode = (this.form.controls.paymentMode.value || '').trim();
    return (this.submitAttempted || this.form.controls.paymentMode.touched) && amountPaid > 0 && !paymentMode;
  }

  showPhoneFormatError(): boolean {
    const control = this.form.controls.phone;
    return (this.submitAttempted || control.touched) && !!control.value && control.hasError('pattern');
  }

  showEmailFormatError(): boolean {
    const control = this.form.controls.email;
    return (this.submitAttempted || control.touched) && !!control.value && control.hasError('pattern');
  }

  showTrainerRequiredError(): boolean {
    const control = this.form.controls.trainerAssigned;
    return (
      this.shouldShowTrainerField &&
      !this.isTrainerContext &&
      (this.submitAttempted || control.touched) &&
      !control.value?.trim()
    );
  }

  get pageTitle(): string {
    return this.isTrainerContext ? 'Add Member (Trainer)' : 'Add Member';
  }

  get pageSubtitle(): string {
    return this.isTrainerContext
      ? 'Create a new member in your gym. Trainer assignment is auto-filled for PERSONAL training.'
      : 'Create a new member for your gym with training and plan details.';
  }

  get contextHint(): string {
    const gymName = this.currentUser?.gymName || 'your gym';
    return `This member will be created under ${gymName} based on your logged-in account.`;
  }

  get isTrainerContext(): boolean {
    return this.currentUser?.role === 'TRAINER';
  }

  private get currentUser() {
    return this.authService.getCurrentUser();
  }

  private setupTrainingTypeBehavior(): void {
    this.form.controls.trainingType.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value === 'PERSONAL') {
          if (this.isTrainerContext) {
            this.form.controls.trainerAssigned.setValue(this.currentUser?.fullName || '', { emitEvent: false });
            this.form.controls.trainerAssigned.disable({ emitEvent: false });
          } else {
            this.form.controls.trainerAssigned.enable({ emitEvent: false });
          }
          return;
        }

        this.form.controls.trainerAssigned.setValue('', { emitEvent: false });
        this.form.controls.trainerAssigned.enable({ emitEvent: false });
      });
  }

  private loadTrainersForOwnerContext(): void {
    if (this.isTrainerContext) {
      return;
    }

    this.loadingTrainers = true;
    this.adminService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.trainers = users
            .filter((u) => u.role === 'TRAINER' && u.isActive)
            .map((u) => u.fullName)
            .sort((a, b) => a.localeCompare(b));
          this.loadingTrainers = false;
        },
        error: () => {
          this.loadingTrainers = false;
          this.notificationService.warning('Unable to load trainer list right now.');
        }
      });
  }

  private revokePreviewUrl(): void {
    if (this.profileImagePreviewUrl) {
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

  private openConfirmDialog(
    title: string,
    lines: string[],
    confirmText: string,
    tone: 'primary' | 'warning'
  ): void {
    this.confirmDialog = {
      open: true,
      title,
      lines,
      confirmText,
      tone
    };
  }

  private executeCreate(payload: CreateMemberDto): void {
    this.isSubmitting = true;
    this.memberService.createMember(payload).subscribe({
      next: (createdMember) => {
        this.notificationService.success('Member added successfully.');
        if (createdMember.welcomeEmailSent === false) {
          this.notificationService.warning(
            `Member created, but welcome email failed: ${createdMember.welcomeEmailMessage || 'Unknown error'}`
          );
        }
        this.resetFormForContext();
        this.clearProfileImage();
        this.submitAttempted = false;
        this.isSubmitting = false;
        this.onConfirmDialogClose();
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 409 && error.error?.existingMember) {
          this.duplicateMember = error.error.existingMember as ExistingMemberSummary;
          this.notificationService.warning(error.error?.message ?? 'Member already exists. You can renew this member instead.');
        } else {
          this.notificationService.error('Unable to add member.');
        }
        this.isSubmitting = false;
        this.onConfirmDialogClose();
      }
    });
  }

  private executeRenew(memberId: string, payload: RenewMemberDto): void {
    this.isSubmitting = true;
    this.memberService.renewMember(memberId, payload).subscribe({
      next: () => {
        this.notificationService.success(`Renewal completed for ${this.duplicateMember?.fullName}.`);
        this.duplicateMember = null;
        this.resetFormForContext();
        this.clearProfileImage();
        this.submitAttempted = false;
        this.isSubmitting = false;
        this.onConfirmDialogClose();
      },
      error: () => {
        this.notificationService.error('Unable to renew member.');
        this.isSubmitting = false;
        this.onConfirmDialogClose();
      }
    });
  }

  private resolvePaymentStatus(amountPaid: number, amountToPay: number): 'PAID' | 'PARTIAL' | 'PENDING' {
    if (amountPaid <= 0) {
      return 'PENDING';
    }
    if (amountPaid >= amountToPay) {
      return 'PAID';
    }
    return 'PARTIAL';
  }

  private formatAmount(value: number): string {
    return value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  }

  private resolveTrainerAssigned(trainingType: 'GENERAL' | 'PERSONAL', selectedTrainer: string): string | null {
    if (trainingType !== 'PERSONAL') {
      return null;
    }
    if (this.isTrainerContext) {
      return this.currentUser?.fullName || null;
    }
    const trainer = (selectedTrainer || '').trim();
    return trainer || null;
  }

  private applyContextDefaults(): void {
    if (this.isTrainerContext) {
      this.form.controls.leadSource.setValue('Trainer Desk', { emitEvent: false });
    }
  }

  private resetFormForContext(): void {
    this.form.reset({
      fullName: '',
      phone: '+91',
      email: '',
      trainingType: 'GENERAL',
      trainerAssigned: '',
      leadSource: this.isTrainerContext ? 'Trainer Desk' : '',
      targetWeight: null,
      joinDate: '',
      planDurationMonths: 1,
      amountToPay: null,
      amountPaid: 0,
      paymentMode: 'UPI'
    });
  }

  private normalizeIndianPhoneInput(value: string | null | undefined): string {
    const raw = (value ?? '').trim();
    if (!raw) {
      return '+91';
    }

    const digits = raw.replace(/\D/g, '');
    const tenDigits = digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(0, 10);
    return `+91${tenDigits}`;
  }

  private setCameraScrollLock(lock: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (lock && !this.scrollLockActive) {
      this.previousBodyOverflow = document.body.style.overflow;
      this.previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      this.scrollLockActive = true;
      return;
    }

    if (!lock && this.scrollLockActive) {
      document.body.style.overflow = this.previousBodyOverflow;
      document.documentElement.style.overflow = this.previousHtmlOverflow;
      this.scrollLockActive = false;
    }
  }
}
