import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MemberService } from '../../../core/services/member.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CreateMemberDto, ExistingMemberSummary, RenewMemberDto } from '../../../core/models/member.models';

@Component({
  selector: 'app-owner-add-member',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent, ConfirmDialogComponent],
  templateUrl: './owner-add-member.component.html',
  styleUrl: './owner-add-member.component.css'
})
export class OwnerAddMemberComponent implements OnDestroy {
  isSubmitting = false;
  submitAttempted = false;
  successMessage = '';
  errorMessage = '';
  profileImagePreviewUrl: string | null = null;
  profileImageName = '';
  duplicateMember: ExistingMemberSummary | null = null;
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

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly memberService: MemberService,
    private readonly notificationService: NotificationService
  ) {
    this.form = this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      joinDate: ['', Validators.required],
      planDurationMonths: [1, [Validators.required, Validators.min(1), Validators.max(24)]],
      amountToPay: [null as number | null, [Validators.required, Validators.min(0)]],
      amountPaid: [0 as number | null, [Validators.min(0)]],
      paymentMode: ['UPI' as 'CASH' | 'UPI' | 'CARD']
    });
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select a valid image file.';
      return;
    }

    this.revokePreviewUrl();
    this.profileImagePreviewUrl = URL.createObjectURL(file);
    this.profileImageName = file.name;
    this.errorMessage = '';
  }

  clearProfileImage(): void {
    this.revokePreviewUrl();
    this.profileImagePreviewUrl = null;
    this.profileImageName = '';
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = (input.value || '').replace(/\D/g, '').slice(0, 10);
    if (digitsOnly !== input.value) {
      input.value = digitsOnly;
    }
    this.form.controls.phone.setValue(digitsOnly, { emitEvent: false });
  }

  submit(): void {
    this.submitAttempted = true;
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';
    this.duplicateMember = null;

    const value = this.form.getRawValue();
    const phoneDigits = (value.phone || '').replace(/\D/g, '');
    if (!phoneDigits) {
      this.errorMessage = 'Phone is required.';
      this.notificationService.warning(this.errorMessage);
      return;
    }
    if (phoneDigits.length !== 10) {
      this.errorMessage = 'Phone must be exactly 10 digits.';
      this.notificationService.warning(this.errorMessage);
      return;
    }
    const amountToPay = Number(value.amountToPay ?? 0);
    const amountPaid = Number(value.amountPaid ?? 0);
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
      this.errorMessage = 'Amount to pay is required and must be greater than 0.';
      this.notificationService.warning(this.errorMessage);
      return;
    }
    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      this.errorMessage = 'Amount paid cannot be negative.';
      this.notificationService.warning(this.errorMessage);
      return;
    }
    if (amountPaid > amountToPay) {
      this.errorMessage = 'Amount paid cannot be more than amount to pay.';
      this.notificationService.warning(this.errorMessage);
      return;
    }
    const paymentMode = (value.paymentMode || '').trim().toUpperCase();
    if (amountPaid > 0 && !paymentMode) {
      this.errorMessage = 'Payment mode is required when amount paid is greater than 0.';
      this.notificationService.warning(this.errorMessage);
      return;
    }

    const paymentStatus = this.resolvePaymentStatus(amountPaid, amountToPay);
    this.pendingAction = 'create';
    this.pendingCreatePayload = {
      fullName: value.fullName.trim(),
      phone: `+91${phoneDigits}`,
      email: value.email?.trim().toLowerCase() || null,
      joinDate: value.joinDate,
      planStartDate: value.joinDate,
      planDurationMonths: Number(value.planDurationMonths),
      amountToPay,
      paymentStatus,
      amountPaid,
      paymentMode: amountPaid > 0 ? (paymentMode as 'CASH' | 'UPI' | 'CARD') : null
    };
    this.openConfirmDialog(
      'Confirm Add Member',
      [
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
      this.errorMessage = 'Plan start date and duration are required for renewal.';
      this.notificationService.warning(this.errorMessage);
      return;
    }

    const value = this.form.getRawValue();
    const amountToPay = Number(value.amountToPay ?? 0);
    const amountPaid = Number(value.amountPaid ?? 0);
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
      this.errorMessage = 'Amount to pay is required and must be greater than 0.';
      this.notificationService.warning(this.errorMessage);
      return;
    }
    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      this.errorMessage = 'Amount paid cannot be negative.';
      this.notificationService.warning(this.errorMessage);
      return;
    }
    if (amountPaid > amountToPay) {
      this.errorMessage = 'Amount paid cannot be more than amount to pay.';
      this.notificationService.warning(this.errorMessage);
      return;
    }
    const paymentMode = (value.paymentMode || '').trim().toUpperCase();
    if (amountPaid > 0 && !paymentMode) {
      this.errorMessage = 'Payment mode is required when amount paid is greater than 0.';
      this.notificationService.warning(this.errorMessage);
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
    return (this.submitAttempted || control.touched) && control.hasError('pattern');
  }

  private revokePreviewUrl(): void {
    if (this.profileImagePreviewUrl) {
      URL.revokeObjectURL(this.profileImagePreviewUrl);
    }
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
      next: () => {
        this.successMessage = 'Member added successfully.';
        this.notificationService.success(this.successMessage);
        this.form.reset({
          fullName: '',
          phone: '',
          email: '',
          joinDate: '',
          planDurationMonths: 1,
          amountToPay: null,
          amountPaid: 0,
          paymentMode: 'UPI'
        });
        this.clearProfileImage();
        this.submitAttempted = false;
        this.isSubmitting = false;
        this.onConfirmDialogClose();
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 409 && error.error?.existingMember) {
          this.duplicateMember = error.error.existingMember as ExistingMemberSummary;
          this.errorMessage = error.error?.message ?? 'Member already exists. You can renew this member instead.';
          this.notificationService.warning(this.errorMessage);
        } else {
          this.errorMessage = 'Unable to add member.';
          this.notificationService.error(this.errorMessage);
        }
        this.isSubmitting = false;
        this.onConfirmDialogClose();
      }
    });
  }

  private executeRenew(memberId: string, payload: RenewMemberDto): void {
    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.memberService.renewMember(memberId, payload).subscribe({
      next: () => {
        this.successMessage = `Renewal completed for ${this.duplicateMember?.fullName}.`;
        this.notificationService.success(this.successMessage);
        this.duplicateMember = null;
        this.form.reset({
          fullName: '',
          phone: '',
          email: '',
          joinDate: '',
          planDurationMonths: 1,
          amountToPay: null,
          amountPaid: 0,
          paymentMode: 'UPI'
        });
        this.clearProfileImage();
        this.submitAttempted = false;
        this.isSubmitting = false;
        this.onConfirmDialogClose();
      },
      error: () => {
        this.errorMessage = 'Unable to renew member.';
        this.notificationService.error(this.errorMessage);
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
}
