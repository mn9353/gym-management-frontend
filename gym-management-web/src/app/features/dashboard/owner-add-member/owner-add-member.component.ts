import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { MemberService } from '../../../core/services/member.service';
import { ExistingMemberSummary } from '../../../core/models/member.models';

@Component({
  selector: 'app-owner-add-member',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent],
  templateUrl: './owner-add-member.component.html',
  styleUrl: './owner-add-member.component.css'
})
export class OwnerAddMemberComponent implements OnDestroy {
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  profileImagePreviewUrl: string | null = null;
  profileImageName = '';
  duplicateMember: ExistingMemberSummary | null = null;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly memberService: MemberService
  ) {
    this.form = this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      phone: ['', [Validators.maxLength(15)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      joinDate: ['', Validators.required],
      planStartDate: ['', Validators.required],
      planDurationMonths: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
      paymentStatus: ['PAID', Validators.required],
      amountPaid: [null as number | null]
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

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.duplicateMember = null;

    const value = this.form.getRawValue();
    this.memberService
      .createMember({
        fullName: value.fullName.trim(),
        phone: value.phone?.trim() || null,
        email: value.email?.trim().toLowerCase() || null,
        joinDate: value.joinDate,
        planStartDate: value.planStartDate,
        planDurationMonths: Number(value.planDurationMonths),
        paymentStatus: value.paymentStatus,
        amountPaid: value.amountPaid ?? null
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Member added successfully.';
          this.form.reset({
            fullName: '',
            phone: '',
            email: '',
            joinDate: '',
            planStartDate: '',
            planDurationMonths: 1,
            paymentStatus: 'PAID',
            amountPaid: null
          });
          this.clearProfileImage();
          this.isSubmitting = false;
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 409 && error.error?.existingMember) {
            this.duplicateMember = error.error.existingMember as ExistingMemberSummary;
            this.errorMessage = error.error?.message ?? 'Member already exists. You can renew this member instead.';
          } else {
            this.errorMessage = 'Unable to add member.';
          }
          this.isSubmitting = false;
        }
      });
  }

  renewExistingMember(): void {
    if (this.isSubmitting || !this.duplicateMember) {
      return;
    }

    const planStartDate = this.form.controls.planStartDate.value;
    const planDurationMonths = Number(this.form.controls.planDurationMonths.value);
    if (!planStartDate || !Number.isFinite(planDurationMonths) || planDurationMonths < 1) {
      this.errorMessage = 'Plan start date and duration are required for renewal.';
      return;
    }

    const value = this.form.getRawValue();
    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.memberService
      .renewMember(this.duplicateMember.id, {
        planStartDate,
        planDurationMonths,
        amountPaid: value.amountPaid ?? null,
        paymentStatus: value.paymentStatus,
        paymentDate: new Date().toISOString().split('T')[0]
      })
      .subscribe({
        next: () => {
          this.successMessage = `Renewal completed for ${this.duplicateMember?.fullName}.`;
          this.duplicateMember = null;
          this.form.reset({
            fullName: '',
            phone: '',
            email: '',
            joinDate: '',
            planStartDate: '',
            planDurationMonths: 1,
            paymentStatus: 'PAID',
            amountPaid: null
          });
          this.clearProfileImage();
          this.isSubmitting = false;
        },
        error: () => {
          this.errorMessage = 'Unable to renew member.';
          this.isSubmitting = false;
        }
      });
  }

  get computedPlanEndDateLabel(): string {
    const start = this.form.controls.planStartDate.value;
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

  private revokePreviewUrl(): void {
    if (this.profileImagePreviewUrl) {
      URL.revokeObjectURL(this.profileImagePreviewUrl);
    }
  }
}
