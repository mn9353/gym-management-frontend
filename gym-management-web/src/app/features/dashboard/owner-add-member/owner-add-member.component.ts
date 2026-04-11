import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { MemberService } from '../../../core/services/member.service';

@Component({
  selector: 'app-owner-add-member',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent],
  templateUrl: './owner-add-member.component.html',
  styleUrl: './owner-add-member.component.css'
})
export class OwnerAddMemberComponent {
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly memberService: MemberService
  ) {
    this.form = this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      phone: ['', [Validators.maxLength(15)]],
      joinDate: ['', Validators.required],
      planStartDate: ['', Validators.required],
      planEndDate: ['', Validators.required],
      membershipType: [''],
      paymentStatus: ['PAID', Validators.required],
      amountPaid: [null as number | null]
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const value = this.form.getRawValue();
    this.memberService
      .createMember({
        fullName: value.fullName.trim(),
        phone: value.phone?.trim() || null,
        joinDate: value.joinDate,
        planStartDate: value.planStartDate,
        planEndDate: value.planEndDate,
        membershipType: value.membershipType?.trim() || null,
        paymentStatus: value.paymentStatus,
        amountPaid: value.amountPaid ?? null
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Member added successfully.';
          this.form.reset({
            fullName: '',
            phone: '',
            joinDate: '',
            planStartDate: '',
            planEndDate: '',
            membershipType: '',
            paymentStatus: 'PAID',
            amountPaid: null
          });
          this.isSubmitting = false;
        },
        error: () => {
          this.errorMessage = 'Unable to add member.';
          this.isSubmitting = false;
        }
      });
  }
}
