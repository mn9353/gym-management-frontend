import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';
import {
  MemberListItem,
  MemberListQuery,
  MemberSegmentCounts,
  OwnerPaymentUpdateDto,
  OwnerRenewMemberDto
} from '../../../core/models/member.models';
import { MemberService } from '../../../core/services/member.service';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';

type MemberSegment = 'all' | 'active' | 'expiring' | 'inactive';

@Component({
  selector: 'app-owner-members',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './owner-members.component.html',
  styleUrl: './owner-members.component.css'
})
export class OwnerMembersComponent implements OnInit {
  isLoading = true;
  isCountsLoading = true;
  errorMessage = '';
  members: MemberListItem[] = [];
  totalCount = 0;
  totalPages = 1;

  selectedMember: MemberListItem | null = null;
  isPaymentDrawerOpen = false;
  isSavingPayment = false;
  isSavingRenewal = false;
  activeDrawerAction: 'payment' | 'renewal' = 'payment';
  paymentErrorMessage = '';
  paymentSuccessMessage = '';

  paymentDraft = {
    amountPaidNow: null as number | null,
    paymentDate: this.todayIsoDate(),
    paymentMode: 'UPI' as 'CASH' | 'UPI' | 'CARD',
    remarks: ''
  };

  renewalDraft = {
    planStartDate: '',
    planDurationMonths: 1,
    amountToPayIncrement: null as number | null,
    amountPaidNow: 0 as number,
    paymentDate: this.todayIsoDate(),
    paymentMode: 'UPI' as 'CASH' | 'UPI' | 'CARD',
    remarks: ''
  };

  readonly segmentTabs: Array<{ label: string; value: MemberSegment; tone: 'all' | 'active' | 'expiring' | 'inactive' }> = [
    { label: 'All', value: 'all', tone: 'all' },
    { label: 'Active', value: 'active', tone: 'active' },
    { label: 'Expiring', value: 'expiring', tone: 'expiring' },
    { label: 'Inactive', value: 'inactive', tone: 'inactive' }
  ];

  segmentCounts: MemberSegmentCounts = {
    all: 0,
    active: 0,
    expiring: 0,
    inactive: 0
  };

  selectedSegment: MemberSegment = 'all';
  private readonly searchChanged$ = new Subject<void>();

  query: MemberListQuery = {
    pageNumber: 1,
    pageSize: 10,
    sortBy: 'planEndDate',
    sortDirection: 'asc',
    includeAmount: true,
    upcomingDays: 7,
    searchTerm: '',
    phone: '',
    email: ''
  };

  constructor(private readonly memberService: MemberService) {}

  ngOnInit(): void {
    this.searchChanged$.pipe(debounceTime(350)).subscribe(() => {
      this.query.pageNumber = 1;
      this.fetchMembers();
    });
    this.fetchSegmentCounts();
    this.fetchMembers();
  }

  onSearchChange(): void {
    this.searchChanged$.next();
  }

  onDateFilterChange(): void {
    this.query.pageNumber = 1;
    this.fetchMembers();
  }

  onContactFilterChange(): void {
    this.searchChanged$.next();
  }

  clearDateFilters(): void {
    this.query.joinDateFrom = undefined;
    this.query.joinDateTo = undefined;
    this.query.planEndDateFrom = undefined;
    this.query.planEndDateTo = undefined;
    this.query.pageNumber = 1;
    this.fetchMembers();
  }

  setSegment(segment: MemberSegment): void {
    if (this.selectedSegment === segment) {
      return;
    }

    this.selectedSegment = segment;
    this.query.pageNumber = 1;
    this.fetchMembers();
  }

  fetchMembers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.members = [];
    this.totalCount = 0;
    this.totalPages = 1;

    this.memberService.getMembersList(this.query, this.selectedSegment).subscribe({
      next: (response) => {
        this.members = response.items;
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.query.pageNumber = response.pageNumber;
        this.query.pageSize = response.pageSize;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load members.';
        this.isLoading = false;
      }
    });
  }

  fetchSegmentCounts(): void {
    this.isCountsLoading = true;
    this.memberService.getSegmentCounts(this.query.upcomingDays ?? 7).subscribe({
      next: (counts) => {
        this.segmentCounts = counts;
        this.isCountsLoading = false;
      },
      error: () => {
        this.isCountsLoading = false;
      }
    });
  }

  nextPage(): void {
    if ((this.query.pageNumber ?? 1) >= this.totalPages) {
      return;
    }
    this.query.pageNumber = (this.query.pageNumber ?? 1) + 1;
    this.fetchMembers();
  }

  previousPage(): void {
    if ((this.query.pageNumber ?? 1) <= 1) {
      return;
    }
    this.query.pageNumber = (this.query.pageNumber ?? 1) - 1;
    this.fetchMembers();
  }

  getAvatarText(fullName: string): string {
    const words = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return '?';
    }
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  getBadge(member: MemberListItem): { label: string; className: string } {
    const today = new Date();
    const end = new Date(member.planEndDate);
    const dayDiff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const status = (member.status || '').toUpperCase();

    if (status === 'EXPIRED' || dayDiff < 0) {
      return { label: 'INACTIVE', className: 'inactive' };
    }
    if (dayDiff <= (this.query.upcomingDays ?? 7)) {
      return { label: 'EXPIRING', className: 'expiring' };
    }
    return { label: 'ACTIVE', className: 'active' };
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmount(value?: number | null): string {
    return (value ?? 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  }

  getPlanMonthsLabel(planStartDate: string, planEndDate: string): string {
    const start = new Date(planStartDate);
    const end = new Date(planEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 'Plan -';
    }

    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1;
    return `Plan ${Math.max(1, months)} month${months > 1 ? 's' : ''}`;
  }

  hasOutstandingPayment(member: MemberListItem): boolean {
    const total = member.amountToPay ?? 0;
    const paid = member.amountPaid ?? 0;
    return total > 0 && paid < total;
  }

  getPaymentProgressText(member: MemberListItem): string {
    const total = member.amountToPay ?? 0;
    const paid = member.amountPaid ?? 0;
    const pending = Math.max(0, total - paid);

    if (total <= 0 || pending <= 0) {
      return '';
    }

    if (paid <= 0) {
      return `${this.formatAmount(pending)} pending`;
    }

    return `${this.formatAmount(paid)} / ${this.formatAmount(total)} paid · ${this.formatAmount(pending)} pending`;
  }

  getSegmentCount(segment: MemberSegment): number {
    return this.segmentCounts[segment] ?? 0;
  }

  openPaymentDrawer(member: MemberListItem): void {
    this.selectedMember = member;
    this.isPaymentDrawerOpen = true;
    this.activeDrawerAction = 'payment';
    this.paymentErrorMessage = '';
    this.paymentSuccessMessage = '';

    this.paymentDraft.amountPaidNow = null;
    this.paymentDraft.paymentDate = this.todayIsoDate();
    this.paymentDraft.paymentMode = 'UPI';
    this.paymentDraft.remarks = '';

    this.renewalDraft.planStartDate = this.nextDate(member.planEndDate);
    this.renewalDraft.planDurationMonths = 1;
    this.renewalDraft.amountToPayIncrement = null;
    this.renewalDraft.amountPaidNow = 0;
    this.renewalDraft.paymentDate = this.todayIsoDate();
    this.renewalDraft.paymentMode = 'UPI';
    this.renewalDraft.remarks = '';
  }

  closePaymentDrawer(): void {
    if (this.isSavingPayment || this.isSavingRenewal) {
      return;
    }

    this.isPaymentDrawerOpen = false;
    this.selectedMember = null;
    this.paymentErrorMessage = '';
    this.paymentSuccessMessage = '';
  }

  openRenewalDrawer(member: MemberListItem): void {
    this.selectedMember = member;
    this.isPaymentDrawerOpen = true;
    this.activeDrawerAction = 'renewal';
    this.paymentErrorMessage = '';
    this.paymentSuccessMessage = '';

    this.paymentDraft.amountPaidNow = null;
    this.paymentDraft.paymentDate = this.todayIsoDate();
    this.paymentDraft.paymentMode = 'UPI';
    this.paymentDraft.remarks = '';

    this.renewalDraft.planStartDate = this.nextDate(member.planEndDate);
    this.renewalDraft.planDurationMonths = 1;
    this.renewalDraft.amountToPayIncrement = null;
    this.renewalDraft.amountPaidNow = 0;
    this.renewalDraft.paymentDate = this.todayIsoDate();
    this.renewalDraft.paymentMode = 'UPI';
    this.renewalDraft.remarks = '';
  }

  savePaymentUpdate(): void {
    if (!this.selectedMember) {
      return;
    }

    const amountPaidNow = this.normalizeOptionalNumber(this.paymentDraft.amountPaidNow);
    if (!amountPaidNow || amountPaidNow <= 0) {
      this.paymentErrorMessage = 'Enter valid amount paid now.';
      return;
    }

    const payload: OwnerPaymentUpdateDto = {
      amountPaidNow,
      paymentDate: this.paymentDraft.paymentDate || undefined,
      paymentMode: this.paymentDraft.paymentMode,
      remarks: this.paymentDraft.remarks?.trim() || undefined
    };

    this.isSavingPayment = true;
    this.paymentErrorMessage = '';
    this.paymentSuccessMessage = '';

    this.memberService.updatePaidAmountWithTransaction(this.selectedMember.id, payload).subscribe({
      next: (response) => {
        this.syncMemberInList({
          id: response.memberId,
          amountPaid: response.amountPaid,
          amountToPay: response.amountToPay,
          paymentStatus: response.paymentStatus
        });
        this.paymentDraft.amountPaidNow = null;
        this.paymentDraft.remarks = '';
        this.paymentDraft.paymentDate = this.todayIsoDate();
        this.paymentSuccessMessage = `Payment of ${this.formatAmount(response.payment.amount)} recorded. Pending: ${this.formatAmount(response.pendingAmount)}.`;
        this.isSavingPayment = false;
      },
      error: (error) => {
        this.paymentErrorMessage = error?.error?.message ?? 'Unable to update payment.';
        this.isSavingPayment = false;
      }
    });
  }

  saveRenewal(): void {
    if (!this.selectedMember) {
      return;
    }

    const amountToPayIncrement = this.normalizeOptionalNumber(this.renewalDraft.amountToPayIncrement);
    if (!amountToPayIncrement || amountToPayIncrement <= 0) {
      this.paymentErrorMessage = 'Enter valid renewal amount to pay.';
      return;
    }

    const payload: OwnerRenewMemberDto = {
      planStartDate: this.renewalDraft.planStartDate,
      planDurationMonths: Math.max(1, Math.min(20, Number(this.renewalDraft.planDurationMonths || 1))),
      amountToPayIncrement,
      amountPaidNow: Math.max(0, Number(this.renewalDraft.amountPaidNow || 0)),
      paymentDate: this.renewalDraft.paymentDate || undefined,
      paymentMode: this.renewalDraft.paymentMode,
      remarks: this.renewalDraft.remarks?.trim() || undefined
    };

    this.isSavingRenewal = true;
    this.paymentErrorMessage = '';
    this.paymentSuccessMessage = '';

    this.memberService.renewMemberWithTransaction(this.selectedMember.id, payload).subscribe({
      next: (response) => {
        this.syncMemberInList({
          id: response.memberId,
          amountPaid: response.amountPaid,
          amountToPay: response.amountToPay,
          paymentStatus: response.paymentStatus
        });
        this.paymentDraft.amountPaidNow = null;
        this.renewalDraft.amountToPayIncrement = null;
        this.renewalDraft.amountPaidNow = 0;
        this.renewalDraft.remarks = '';
        this.renewalDraft.paymentDate = this.todayIsoDate();
        this.renewalDraft.planStartDate = this.nextDate(response.planEndDate);
        this.paymentSuccessMessage = `Renewal saved. New plan until ${this.formatDate(response.planEndDate)}. Pending: ${this.formatAmount(response.pendingAmount)}.`;
        this.isSavingRenewal = false;
      },
      error: (error) => {
        this.paymentErrorMessage = error?.error?.message ?? 'Unable to save renewal.';
        this.isSavingRenewal = false;
      }
    });
  }

  getPendingAmountPreview(): string {
    const toPay = this.selectedMember?.amountToPay ?? 0;
    const currentPaid = this.selectedMember?.amountPaid ?? 0;
    const paidNow = this.normalizeOptionalNumber(this.paymentDraft.amountPaidNow) ?? 0;
    const paid = currentPaid + paidNow;
    const pending = Math.max(0, toPay - paid);
    return this.formatAmount(pending);
  }

  getMinimumRenewalDate(): string {
    if (!this.selectedMember) {
      return this.todayIsoDate();
    }
    return this.nextDate(this.selectedMember.planEndDate);
  }

  private syncMemberInList(update: { id: string; amountPaid?: number | null; amountToPay?: number | null; paymentStatus?: string }): void {
    const index = this.members.findIndex((member) => member.id === update.id);
    if (index < 0) {
      return;
    }

    const existing = this.members[index];
    const next = {
      ...existing,
      amountPaid: update.amountPaid ?? existing.amountPaid ?? null,
      amountToPay: update.amountToPay ?? existing.amountToPay ?? null,
      paymentStatus: update.paymentStatus ?? existing.paymentStatus
    };
    this.members = [
      ...this.members.slice(0, index),
      next,
      ...this.members.slice(index + 1)
    ];
    if (this.selectedMember?.id === update.id) {
      this.selectedMember = next;
    }
  }

  private normalizeOptionalNumber(value: number | null): number | null {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null;
    }
    return Number(value);
  }

  private todayIsoDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  private nextDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.todayIsoDate();
    }
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }
}
