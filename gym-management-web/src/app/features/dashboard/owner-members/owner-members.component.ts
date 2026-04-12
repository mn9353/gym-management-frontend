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
import { NotificationService } from '../../../core/services/notification.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';

type MemberSegment = 'all' | 'active' | 'expiring' | 'inactive';

@Component({
  selector: 'app-owner-members',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, ConfirmDialogComponent],
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
  paymentSubmitAttempted = false;
  renewalSubmitAttempted = false;
  activeDrawerAction: 'payment' | 'renewal' = 'payment';

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

  pendingConfirmAction: 'payment' | 'renewal' | null = null;
  pendingPaymentRequest: { memberId: string; payload: OwnerPaymentUpdateDto } | null = null;
  pendingRenewalRequest: { memberId: string; payload: OwnerRenewMemberDto } | null = null;
  confirmDialog = {
    open: false,
    title: '',
    lines: [] as string[],
    confirmText: 'Confirm',
    tone: 'primary' as 'primary' | 'warning'
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
  joinedDateMode: 'any' | 'single' | 'range' = 'any';
  expiryDateMode: 'any' | 'single' | 'range' = 'any';
  isAdvancedFiltersOpen = false;
  draftJoinedDateMode: 'any' | 'single' | 'range' = 'any';
  draftExpiryDateMode: 'any' | 'single' | 'range' = 'any';
  advancedFilterDraft: {
    phone: string;
    email: string;
    paymentStatus: string;
    joinDateFrom?: string;
    joinDateTo?: string;
    planEndDateFrom?: string;
    planEndDateTo?: string;
  } = {
    phone: '',
    email: '',
    paymentStatus: ''
  };
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
    email: '',
    paymentStatus: ''
  };

  constructor(
    private readonly memberService: MemberService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.searchChanged$.pipe(debounceTime(350)).subscribe(() => {
      this.query.pageNumber = 1;
      this.fetchMembers();
    });
    this.fetchSegmentCounts();
    this.fetchMembers();
    this.syncAdvancedFilterDraft();
  }

  onSearchChange(): void {
    this.searchChanged$.next();
  }

  onDateFilterChange(): void {
    this.query.pageNumber = 1;
    this.fetchMembers();
  }

  onJoinedDateModeChange(mode: 'any' | 'single' | 'range'): void {
    this.joinedDateMode = mode;
    if (mode === 'any') {
      this.query.joinDateFrom = '';
      this.query.joinDateTo = '';
    } else if (mode === 'single') {
      this.query.joinDateFrom = this.query.joinDateFrom || this.query.joinDateTo || '';
      this.query.joinDateTo = '';
    } else {
      this.query.joinDateTo = this.query.joinDateTo || this.query.joinDateFrom || '';
    }
    this.onDateFilterChange();
  }

  onExpiryDateModeChange(mode: 'any' | 'single' | 'range'): void {
    this.expiryDateMode = mode;
    if (mode === 'any') {
      this.query.planEndDateFrom = '';
      this.query.planEndDateTo = '';
    } else if (mode === 'single') {
      this.query.planEndDateFrom = this.query.planEndDateFrom || this.query.planEndDateTo || '';
      this.query.planEndDateTo = '';
    } else {
      this.query.planEndDateTo = this.query.planEndDateTo || this.query.planEndDateFrom || '';
    }
    this.onDateFilterChange();
  }

  onContactFilterChange(): void {
    this.searchChanged$.next();
  }

  onPaymentStatusChange(): void {
    this.query.pageNumber = 1;
    this.fetchMembers();
  }

  clearDateFilters(): void {
    this.query.joinDateFrom = undefined;
    this.query.joinDateTo = undefined;
    this.query.planEndDateFrom = undefined;
    this.query.planEndDateTo = undefined;
    this.joinedDateMode = 'any';
    this.expiryDateMode = 'any';
    this.query.pageNumber = 1;
    this.fetchMembers();
  }

  openAdvancedFilters(): void {
    this.syncAdvancedFilterDraft();
    this.isAdvancedFiltersOpen = true;
  }

  closeAdvancedFilters(): void {
    this.isAdvancedFiltersOpen = false;
  }

  onDraftJoinedDateModeChange(mode: 'any' | 'single' | 'range'): void {
    this.draftJoinedDateMode = mode;
    if (mode === 'any') {
      this.advancedFilterDraft.joinDateFrom = '';
      this.advancedFilterDraft.joinDateTo = '';
    } else if (mode === 'single') {
      this.advancedFilterDraft.joinDateFrom = this.advancedFilterDraft.joinDateFrom || this.advancedFilterDraft.joinDateTo || '';
      this.advancedFilterDraft.joinDateTo = '';
    } else {
      this.advancedFilterDraft.joinDateTo = this.advancedFilterDraft.joinDateTo || this.advancedFilterDraft.joinDateFrom || '';
    }
  }

  onDraftExpiryDateModeChange(mode: 'any' | 'single' | 'range'): void {
    this.draftExpiryDateMode = mode;
    if (mode === 'any') {
      this.advancedFilterDraft.planEndDateFrom = '';
      this.advancedFilterDraft.planEndDateTo = '';
    } else if (mode === 'single') {
      this.advancedFilterDraft.planEndDateFrom = this.advancedFilterDraft.planEndDateFrom || this.advancedFilterDraft.planEndDateTo || '';
      this.advancedFilterDraft.planEndDateTo = '';
    } else {
      this.advancedFilterDraft.planEndDateTo = this.advancedFilterDraft.planEndDateTo || this.advancedFilterDraft.planEndDateFrom || '';
    }
  }

  applyAdvancedFilters(): void {
    this.query.phone = this.advancedFilterDraft.phone;
    this.query.email = this.advancedFilterDraft.email;
    this.query.paymentStatus = this.advancedFilterDraft.paymentStatus;

    const joinFrom = this.advancedFilterDraft.joinDateFrom || '';
    const joinTo = this.advancedFilterDraft.joinDateTo || '';
    if (this.draftJoinedDateMode === 'any') {
      this.query.joinDateFrom = '';
      this.query.joinDateTo = '';
    } else if (this.draftJoinedDateMode === 'single') {
      this.query.joinDateFrom = joinFrom;
      this.query.joinDateTo = joinFrom;
    } else {
      this.query.joinDateFrom = joinFrom;
      this.query.joinDateTo = joinTo;
    }

    const endFrom = this.advancedFilterDraft.planEndDateFrom || '';
    const endTo = this.advancedFilterDraft.planEndDateTo || '';
    if (this.draftExpiryDateMode === 'any') {
      this.query.planEndDateFrom = '';
      this.query.planEndDateTo = '';
    } else if (this.draftExpiryDateMode === 'single') {
      this.query.planEndDateFrom = endFrom;
      this.query.planEndDateTo = endFrom;
    } else {
      this.query.planEndDateFrom = endFrom;
      this.query.planEndDateTo = endTo;
    }

    this.joinedDateMode = this.draftJoinedDateMode;
    this.expiryDateMode = this.draftExpiryDateMode;
    this.query.pageNumber = 1;
    this.fetchMembers();
    this.closeAdvancedFilters();
  }

  resetAdvancedFilters(): void {
    this.advancedFilterDraft = {
      phone: '',
      email: '',
      paymentStatus: '',
      joinDateFrom: '',
      joinDateTo: '',
      planEndDateFrom: '',
      planEndDateTo: ''
    };
    this.draftJoinedDateMode = 'any';
    this.draftExpiryDateMode = 'any';
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
      error: (error) => {
        this.errorMessage = extractApiErrorMessage(error, 'Unable to load members.');
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

    return `${this.formatAmount(paid)} / ${this.formatAmount(total)} paid | ${this.formatAmount(pending)} pending`;
  }

  getRemainingAmount(member: MemberListItem | null = this.selectedMember): number {
    if (!member) {
      return 0;
    }

    const total = member.amountToPay ?? 0;
    const paid = member.amountPaid ?? 0;
    return Math.max(0, total - paid);
  }

  getSegmentCount(segment: MemberSegment): number {
    return this.segmentCounts[segment] ?? 0;
  }

  getSegmentIcon(segment: MemberSegment): string {
    switch (segment) {
      case 'active':
        return 'check_circle';
      case 'expiring':
        return 'timer';
      case 'inactive':
        return 'person_off';
      default:
        return 'groups';
    }
  }

  openPaymentDrawer(member: MemberListItem): void {
    this.selectedMember = member;
    this.isPaymentDrawerOpen = true;
    this.activeDrawerAction = 'payment';
    this.paymentSubmitAttempted = false;
    this.renewalSubmitAttempted = false;

    this.paymentDraft.amountPaidNow = null;
    this.paymentDraft.paymentDate = this.todayIsoDate();
    this.paymentDraft.paymentMode = 'UPI';
    this.paymentDraft.remarks = '';

    this.renewalDraft.planStartDate = this.getDefaultRenewalStartDate(member.planEndDate);
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
    this.paymentSubmitAttempted = false;
    this.renewalSubmitAttempted = false;
    this.onConfirmDialogClose();
  }

  openRenewalDrawer(member: MemberListItem): void {
    this.selectedMember = member;
    this.isPaymentDrawerOpen = true;
    this.activeDrawerAction = 'renewal';
    this.paymentSubmitAttempted = false;
    this.renewalSubmitAttempted = false;

    this.paymentDraft.amountPaidNow = null;
    this.paymentDraft.paymentDate = this.todayIsoDate();
    this.paymentDraft.paymentMode = 'UPI';
    this.paymentDraft.remarks = '';

    this.renewalDraft.planStartDate = this.getDefaultRenewalStartDate(member.planEndDate);
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
    this.paymentSubmitAttempted = true;

    const amountPaidNow = this.normalizeOptionalNumber(this.paymentDraft.amountPaidNow);
    if (!amountPaidNow || amountPaidNow <= 0) {
      this.notificationService.warning('Enter a valid amount in Paying Now.');
      return;
    }
    if (!this.paymentDraft.paymentDate) {
      this.notificationService.warning('Payment date is required.');
      return;
    }
    if (!this.paymentDraft.paymentMode) {
      this.notificationService.warning('Payment mode is required.');
      return;
    }

    const remaining = this.getRemainingAmount(this.selectedMember);
    if (amountPaidNow > remaining) {
      this.notificationService.warning(`Cannot collect more than remaining amount ${this.formatAmount(remaining)}.`);
      return;
    }

    const payload: OwnerPaymentUpdateDto = {
      amountPaidNow,
      paymentDate: this.paymentDraft.paymentDate || undefined,
      paymentMode: this.paymentDraft.paymentMode,
      remarks: this.paymentDraft.remarks?.trim() || undefined
    };

    this.pendingConfirmAction = 'payment';
    this.pendingPaymentRequest = { memberId: this.selectedMember.id, payload };
    this.openConfirmDialog(
      'Confirm Payment Collection',
      [
        `Member: ${this.selectedMember.fullName}`,
        `Paying now: ${this.formatAmount(amountPaidNow)}`,
        `Remaining after payment: ${this.getPendingAmountPreview()}`,
        'Do you want to save this payment update?'
      ],
      'Save Payment',
      'primary'
    );
  }

  saveRenewal(): void {
    if (!this.selectedMember) {
      return;
    }
    this.renewalSubmitAttempted = true;

    if (!this.renewalDraft.planStartDate) {
      this.notificationService.warning('Plan start date is required.');
      return;
    }
    const duration = Number(this.renewalDraft.planDurationMonths || 1);
    if (!Number.isFinite(duration) || duration < 1 || duration > 24) {
      this.notificationService.warning('Duration must be between 1 and 24 months.');
      return;
    }
    if (!this.renewalDraft.paymentDate) {
      this.notificationService.warning('Payment date is required.');
      return;
    }
    if (!this.renewalDraft.paymentMode) {
      this.notificationService.warning('Payment mode is required.');
      return;
    }

    const amountToPayIncrement = this.normalizeOptionalNumber(this.renewalDraft.amountToPayIncrement);
    if (!amountToPayIncrement || amountToPayIncrement <= 0) {
      this.notificationService.warning('Enter valid renewal amount to pay.');
      return;
    }
    if (this.isRenewalPayingNowExceeded()) {
      this.notificationService.warning('Cannot exceed amount to pay for this renewal.');
      return;
    }

    const payload: OwnerRenewMemberDto = {
      planStartDate: this.renewalDraft.planStartDate,
      planDurationMonths: Math.max(1, Math.min(24, duration)),
      amountToPayIncrement,
      amountPaidNow: Math.max(0, Number(this.renewalDraft.amountPaidNow || 0)),
      paymentDate: this.renewalDraft.paymentDate || undefined,
      paymentMode: this.renewalDraft.paymentMode,
      remarks: this.renewalDraft.remarks?.trim() || undefined
    };

    const isZeroPaid = payload.amountPaidNow <= 0;
    this.pendingConfirmAction = 'renewal';
    this.pendingRenewalRequest = { memberId: this.selectedMember.id, payload };
    this.openConfirmDialog(
      'Confirm Renew / Extend',
      [
        `Member: ${this.selectedMember.fullName}`,
        `Plan amount: ${this.formatAmount(amountToPayIncrement)}`,
        `Amount paying now: ${this.formatAmount(payload.amountPaidNow)}`,
        isZeroPaid
          ? 'You are renewing with zero payment. Pending amount will be increased. Continue?'
          : 'Do you want to save this renewal?'
      ],
      'Save Renewal',
      isZeroPaid ? 'warning' : 'primary'
    );
  }

  onConfirmDialogClose(): void {
    if (this.isSavingPayment || this.isSavingRenewal) {
      return;
    }
    this.confirmDialog.open = false;
    this.pendingConfirmAction = null;
    this.pendingPaymentRequest = null;
    this.pendingRenewalRequest = null;
  }

  onConfirmDialogSubmit(): void {
    if (this.pendingConfirmAction === 'payment' && this.pendingPaymentRequest) {
      this.executePaymentUpdate(this.pendingPaymentRequest.memberId, this.pendingPaymentRequest.payload);
      return;
    }
    if (this.pendingConfirmAction === 'renewal' && this.pendingRenewalRequest) {
      this.executeRenewal(this.pendingRenewalRequest.memberId, this.pendingRenewalRequest.payload);
    }
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
    const today = this.todayIsoDate();
    if (new Date(this.selectedMember.planEndDate) < new Date(today)) {
      return today;
    }
    return this.getDefaultRenewalStartDate(this.selectedMember.planEndDate);
  }

  isRenewalPayingNowExceeded(): boolean {
    const amountToPayIncrement = this.normalizeOptionalNumber(this.renewalDraft.amountToPayIncrement) ?? 0;
    const amountPayingNow = this.normalizeOptionalNumber(this.renewalDraft.amountPaidNow) ?? 0;
    return amountToPayIncrement > 0 && amountPayingNow > amountToPayIncrement;
  }

  canEditRenewalStartDate(): boolean {
    if (!this.selectedMember) {
      return false;
    }
    return new Date(this.selectedMember.planEndDate) < new Date(this.todayIsoDate());
  }

  showPaymentRequired(field: 'amountPaidNow' | 'paymentDate' | 'paymentMode'): boolean {
    if (!this.paymentSubmitAttempted || this.activeDrawerAction !== 'payment') {
      return false;
    }
    if (field === 'amountPaidNow') {
      const amount = this.normalizeOptionalNumber(this.paymentDraft.amountPaidNow);
      return !amount || amount <= 0;
    }
    if (field === 'paymentDate') {
      return !this.paymentDraft.paymentDate;
    }
    return !this.paymentDraft.paymentMode;
  }

  showRenewalRequired(field: 'planStartDate' | 'amountToPayIncrement' | 'paymentDate' | 'paymentMode'): boolean {
    if (!this.renewalSubmitAttempted || this.activeDrawerAction !== 'renewal') {
      return false;
    }
    if (field === 'planStartDate') {
      return !this.renewalDraft.planStartDate;
    }
    if (field === 'amountToPayIncrement') {
      const amount = this.normalizeOptionalNumber(this.renewalDraft.amountToPayIncrement);
      return !amount || amount <= 0;
    }
    if (field === 'paymentDate') {
      return !this.renewalDraft.paymentDate;
    }
    return !this.renewalDraft.paymentMode;
  }

  showRenewalDurationError(): boolean {
    if (!this.renewalSubmitAttempted || this.activeDrawerAction !== 'renewal') {
      return false;
    }
    const duration = Number(this.renewalDraft.planDurationMonths || 1);
    return !Number.isFinite(duration) || duration < 1 || duration > 24;
  }

  isExpiredMember(member: MemberListItem): boolean {
    const status = (member.status || '').toUpperCase();
    if (status === 'EXPIRED') {
      return true;
    }
    return new Date(member.planEndDate) < new Date(this.todayIsoDate());
  }

  isExpiringMember(member: MemberListItem): boolean {
    if (this.isExpiredMember(member)) {
      return false;
    }
    const dayDiff =
      Math.ceil(
        (new Date(member.planEndDate).getTime() - new Date(this.todayIsoDate()).getTime()) /
          (1000 * 60 * 60 * 24)
      );
    return dayDiff <= (this.query.upcomingDays ?? 7);
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

  private getDefaultRenewalStartDate(planEndDate: string): string {
    const nextPlanDate = this.nextDate(planEndDate);
    const today = this.todayIsoDate();
    return nextPlanDate > today ? nextPlanDate : today;
  }

  private syncAdvancedFilterDraft(): void {
    this.advancedFilterDraft = {
      phone: this.query.phone || '',
      email: this.query.email || '',
      paymentStatus: this.query.paymentStatus || '',
      joinDateFrom: this.query.joinDateFrom || '',
      joinDateTo: this.query.joinDateTo || '',
      planEndDateFrom: this.query.planEndDateFrom || '',
      planEndDateTo: this.query.planEndDateTo || ''
    };
    this.draftJoinedDateMode = this.joinedDateMode;
    this.draftExpiryDateMode = this.expiryDateMode;
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

  private executePaymentUpdate(memberId: string, payload: OwnerPaymentUpdateDto): void {
    this.isSavingPayment = true;
    this.memberService.updatePaidAmountWithTransaction(memberId, payload).subscribe({
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
        this.notificationService.success(`Payment recorded: ${this.formatAmount(response.payment.amount)}. Pending: ${this.formatAmount(response.pendingAmount)}.`);
        this.isSavingPayment = false;
        this.paymentSubmitAttempted = false;
        this.onConfirmDialogClose();
        this.closePaymentDrawer();
      },
      error: (error) => {
        this.notificationService.error(extractApiErrorMessage(error, 'Unable to update payment.'));
        this.isSavingPayment = false;
      }
    });
  }

  private executeRenewal(memberId: string, payload: OwnerRenewMemberDto): void {
    this.isSavingRenewal = true;
    this.memberService.renewMemberWithTransaction(memberId, payload).subscribe({
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
        this.renewalDraft.planStartDate = this.getDefaultRenewalStartDate(response.planEndDate);
        this.notificationService.success(`Renewal saved. New plan until ${this.formatDate(response.planEndDate)}. Pending: ${this.formatAmount(response.pendingAmount)}.`);
        this.renewalSubmitAttempted = false;
        this.isSavingRenewal = false;
        this.onConfirmDialogClose();
      },
      error: (error) => {
        this.notificationService.error(extractApiErrorMessage(error, 'Unable to save renewal.'));
        this.isSavingRenewal = false;
      }
    });
  }
}
