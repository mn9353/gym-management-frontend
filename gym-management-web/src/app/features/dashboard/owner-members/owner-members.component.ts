import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
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
import { AuthService } from '../../../core/services/auth.service';

type MemberSegment = 'all' | 'active' | 'expiring' | 'inactive';

@Component({
  selector: 'app-owner-members',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, ConfirmDialogComponent],
  templateUrl: './owner-members.component.html',
  styleUrl: './owner-members.component.css'
})
export class OwnerMembersComponent implements OnInit {
  pageTitle = 'Members';
  pageSubtitle = 'Track active, expiring, and inactive members in one place.';
  currentView: 'default' | 'active' | 'upcoming' | 'inactive' | 'new-joins' | 'plans-ending' | 'pending-members' = 'default';
  isLoading = true;
  isCountsLoading = true;
  errorMessage = '';
  members: MemberListItem[] = [];
  totalCount = 0;
  totalPages = 1;
  isSendingReminders = false;
  selectAllMatchingFilters = false;
  selectedMemberIds = new Set<string>();

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

  pendingConfirmAction: 'payment' | 'renewal' | 'delete' | 'edit' | null = null;
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
  readonly isTrainerView: boolean;
  readonly isOwnerView: boolean;
  
  isEditDrawerOpen = false;
  isSavingEdit = false;
  editDraft = {
    fullName: '',
    email: '',
    phone: '',
    gender: 'MALE',
    notes: ''
  };
  editImagePreviewUrl: string | null = null;
  editImageDataUrl: string | null = null;
  editImageName = '';
  private editImageObjectUrl: string | null = null;

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

  viewType: 'default' | 'pending' | 'new-joins' | 'expiring' = 'default';
  totalPendingAmount = 0;
  totalFilteredCount = 0;

  constructor(
    private readonly memberService: MemberService,
    private readonly notificationService: NotificationService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {
    this.isTrainerView = this.authService.isTrainer();
    this.isOwnerView = this.authService.getCurrentUser()?.role === 'OWNER';
  }

  ngOnInit(): void {
    this.applyInitialQueryParams();
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
    this.clearMemberSelection();
    this.query.pageNumber = 1;
    this.query.planEndDateFrom = '';
    this.query.planEndDateTo = '';
    this.expiryDateMode = 'any';
    this.syncMembersQueryParams();
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

        // Calculate view-specific summaries
        if (this.viewType === 'pending') {
          this.totalPendingAmount = response.totalPendingAmount ?? this.members.reduce((acc, m) => acc + this.getRemainingAmount(m), 0);
        }
        this.totalFilteredCount = response.totalCount;
        if (this.selectAllMatchingFilters) {
          this.selectedMemberIds.clear();
        }
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
    this.clearMemberSelection();
    this.fetchMembers();
  }

  previousPage(): void {
    if ((this.query.pageNumber ?? 1) <= 1) {
      return;
    }
    this.query.pageNumber = (this.query.pageNumber ?? 1) - 1;
    this.clearMemberSelection();
    this.fetchMembers();
  }

  canSendReminders(): boolean {
    return this.currentView === 'upcoming'
      || this.currentView === 'inactive'
      || this.currentView === 'plans-ending'
      || this.selectedSegment === 'expiring'
      || this.selectedSegment === 'inactive';
  }

  isMemberSelected(memberId: string): boolean {
    if (this.selectAllMatchingFilters) {
      return true;
    }
    return this.selectedMemberIds.has(memberId);
  }

  toggleMemberSelection(memberId: string, checked: boolean): void {
    if (this.selectAllMatchingFilters) {
      this.selectAllMatchingFilters = false;
      this.selectedMemberIds.clear();
    }

    if (checked) {
      this.selectedMemberIds.add(memberId);
    } else {
      this.selectedMemberIds.delete(memberId);
    }
  }

  toggleSelectAllMatchingFilters(): void {
    this.selectAllMatchingFilters = !this.selectAllMatchingFilters;
    if (this.selectAllMatchingFilters) {
      this.selectedMemberIds.clear();
    }
  }

  clearMemberSelection(): void {
    this.selectAllMatchingFilters = false;
    this.selectedMemberIds.clear();
  }

  get selectionSummaryText(): string {
    if (!this.canSendReminders()) {
      return '';
    }

    if (this.selectAllMatchingFilters) {
      return `All ${this.totalCount} filtered members are selected.`;
    }

    const count = this.selectedMemberIds.size;
    if (count === 0) {
      return 'Select members to send reminder mail.';
    }
    return `${count} member${count > 1 ? 's are' : ' is'} selected.`;
  }

  sendSelectedReminderMails(): void {
    if (!this.canSendReminders() || this.isSendingReminders) {
      return;
    }

    if (!this.selectAllMatchingFilters && this.selectedMemberIds.size === 0) {
      this.notificationService.warning('Select at least one member or choose Select All.');
      return;
    }

    const stage = this.resolveReminderStage();
    const payload = {
      selectAll: this.selectAllMatchingFilters,
      memberIds: this.selectAllMatchingFilters ? [] : Array.from(this.selectedMemberIds),
      stage,
      segment: this.selectedSegment,
      filters: { ...this.query }
    };

    this.isSendingReminders = true;
    this.memberService.sendSubscriptionReminders(payload).subscribe({
      next: (response) => {
        this.isSendingReminders = false;
        this.notificationService.success(
          `Mail sent: ${response.sentCount} success, ${response.failedCount} failed, ${response.skippedAlreadySentCount} already-sent, ${response.skippedNoEmailCount} no-email.`
        );
        this.clearMemberSelection();
      },
      error: (error) => {
        this.isSendingReminders = false;
        this.notificationService.error(extractApiErrorMessage(error, 'Unable to send reminder mails.'));
      }
    });
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
    const start = this.parseDateOnlyToUtcDate(planStartDate);
    const end = this.parseDateOnlyToUtcDate(planEndDate);
    if (!start || !end || end.getTime() < start.getTime()) {
      return 'Plan -';
    }

    const exactMonths = this.getExactMonthDuration(start, end);
    if (exactMonths !== null) {
      return `Plan ${exactMonths} month${exactMonths > 1 ? 's' : ''}`;
    }

    // Fallback for irregular legacy ranges: use rounded 30-day month approximation.
    const inclusiveDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    const months = Math.max(1, Math.round(inclusiveDays / 30));
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

  openEditDrawer(member: MemberListItem): void {
    if (!this.isOwnerView) return;
    this.selectedMember = member;
    this.isEditDrawerOpen = true;
    this.editDraft = {
      fullName: member.fullName,
      email: member.email || '',
      phone: member.phone || '',
      gender: member.gender || 'MALE',
      notes: (member as { notes?: string }).notes || ''
    };
    this.editImagePreviewUrl = member.profileImageUrl || null;
    this.editImageDataUrl = null;
    this.editImageName = '';
  }

  requestEditMember(member: MemberListItem): void {
    if (!this.isOwnerView) return;
    this.selectedMember = member;
    this.pendingConfirmAction = 'edit';
    this.openConfirmDialog(
      'Edit Member',
      [
        `Do you want to edit ${member.fullName}?`,
        'You can review and change details in the edit panel.'
      ],
      'Continue',
      'primary'
    );
  }

  closeEditDrawer(): void {
    if (this.isSavingEdit) return;
    this.isEditDrawerOpen = false;
    this.selectedMember = null;
    this.resetEditImageState();
  }

  submitEdit(): void {
    if (!this.selectedMember || !this.isOwnerView) return;
    this.isSavingEdit = true;
    const payload = {
      fullName: this.editDraft.fullName,
      email: this.editDraft.email,
      phone: this.editDraft.phone,
      gender: this.editDraft.gender,
      notes: this.editDraft.notes,
      profileImageUrl: this.editImageDataUrl ?? undefined
    };
    this.memberService.updateMember(this.selectedMember.id, payload).subscribe({
      next: () => {
        this.isSavingEdit = false;
        this.notificationService.success('Member updated successfully. If email changed, new login info was sent.');
        this.closeEditDrawer();
        this.fetchMembers();
      },
      error: (err) => {
        this.isSavingEdit = false;
        this.notificationService.error(extractApiErrorMessage(err, 'Failed to update member.'));
      }
    });
  }

  async onEditImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notificationService.warning('Please select a valid image file.');
      return;
    }

    this.revokeEditImageObjectUrl();
    this.editImageObjectUrl = URL.createObjectURL(file);
    this.editImagePreviewUrl = this.editImageObjectUrl;
    this.editImageName = file.name;

    try {
      this.editImageDataUrl = await this.compressFileToBase64(file);
    } catch {
      this.notificationService.error('Unable to process selected image.');
      this.clearEditImage();
    }
  }

  clearEditImage(): void {
    this.revokeEditImageObjectUrl();
    this.editImagePreviewUrl = null;
    this.editImageDataUrl = '';
    this.editImageName = '';
  }

  deleteMember(member: MemberListItem): void {
    if (!this.isOwnerView) return;
    this.pendingConfirmAction = 'delete';
    this.selectedMember = member;
    this.openConfirmDialog(
      'Delete Member',
      [
        `Are you sure you want to permanently delete ${member.fullName}?`,
        'This action cannot be undone.'
      ],
      'Delete',
      'warning'
    );
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
    if (this.pendingConfirmAction === 'delete' || this.pendingConfirmAction === 'edit') {
      this.selectedMember = null;
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
      return;
    }
    if (this.pendingConfirmAction === 'delete' && this.selectedMember) {
      this.executeDelete(this.selectedMember.id);
      return;
    }
    if (this.pendingConfirmAction === 'edit' && this.selectedMember) {
      const member = this.selectedMember;
      this.onConfirmDialogClose();
      this.openEditDrawer(member);
    }
  }

  executeDelete(memberId: string): void {
    this.isSavingPayment = true; // reusing existing busy flag
    this.memberService.deleteMember(memberId).subscribe({
      next: () => {
        this.isSavingPayment = false;
        this.notificationService.success('Member deleted successfully.');
        this.onConfirmDialogClose();
        this.fetchMembers();
      },
      error: (err) => {
        this.isSavingPayment = false;
        this.notificationService.error(extractApiErrorMessage(err, 'Failed to delete member.'));
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

  private resetEditImageState(): void {
    this.revokeEditImageObjectUrl();
    this.editImagePreviewUrl = null;
    this.editImageDataUrl = null;
    this.editImageName = '';
  }

  private revokeEditImageObjectUrl(): void {
    if (this.editImageObjectUrl) {
      URL.revokeObjectURL(this.editImageObjectUrl);
      this.editImageObjectUrl = null;
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
        const paymentMsg = response.payment ? `Payment recorded: ${this.formatAmount(response.payment.amount)}.` : 'Payment amount updated.';
        this.notificationService.success(`${paymentMsg} Pending: ${this.formatAmount(response.pendingAmount)}.`);
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

  getDisplayPhone(member: MemberListItem): string {
    if (this.isTrainerView) {
      return 'Hidden';
    }
    return member.phone || '-';
  }

  getWhatsAppLink(phone?: string | null): string | null {
    if (!phone || this.isTrainerView) {
      return null;
    }
    const digits = phone.replace(/\D/g, '');
    if (!digits) {
      return null;
    }
    return `https://wa.me/${digits}`;
  }

  private applyInitialQueryParams(): void {
    const routePath = this.route.snapshot.routeConfig?.path ?? '';
    const params = this.route.snapshot.queryParamMap;

    // First handle route-based defaults
    switch (routePath) {
      case 'users/active':
        this.currentView = 'active';
        this.pageTitle = 'Active Members';
        this.pageSubtitle = 'Members currently active in your gym.';
        this.selectedSegment = 'active';
        break;
      case 'users/upcoming-renewals':
        this.currentView = 'upcoming';
        this.pageTitle = 'Upcoming Renewals';
        this.pageSubtitle = 'Members whose plans are ending soon.';
        this.selectedSegment = 'expiring';
        break;
      case 'users/inactive':
        this.currentView = 'inactive';
        this.pageTitle = 'Inactive Members';
        this.pageSubtitle = 'Members with expired plans.';
        this.selectedSegment = 'inactive';
        break;
      case 'users/new-joins':
        this.currentView = 'new-joins';
        this.pageTitle = 'New Joins';
        this.pageSubtitle = 'Members who joined this month.';
        break;
      case 'users/plans-ending':
        this.currentView = 'plans-ending';
        this.pageTitle = 'Plans Ending This Month';
        this.pageSubtitle = 'Includes both expiring soon and already inactive members this month.';
        break;
      case 'users/pending-members':
        this.currentView = 'pending-members';
        this.pageTitle = 'Pending Members';
        this.pageSubtitle = 'Members with pending or partial payment.';
        this.query.paymentStatus = 'PENDING,PARTIAL';
        this.viewType = 'pending';
        break;
      default:
        this.currentView = 'default';
        break;
    }

    // Then override/merge with Query Params (Unified Logic)
    const segmentParam = params.get('segment');
    if (segmentParam === 'all' || segmentParam === 'active' || segmentParam === 'expiring' || segmentParam === 'inactive') {
      this.selectedSegment = segmentParam;
      // If segment is specified via query param, ensure the view is appropriate
      if (segmentParam === 'expiring') {
        this.pageTitle = 'Expiring Members';
        this.pageSubtitle = 'Viewing members nearing their plan end dates.';
      }
    }

    const viewParam = params.get('view');
    if (viewParam === 'pending') {
      this.viewType = 'pending';
      this.pageTitle = 'Collection Tracker';
      this.pageSubtitle = 'Showing members with outstanding balances to collect.';
    }

    const statusParam = params.get('paymentStatus');
    if (statusParam) {
      this.query.paymentStatus = statusParam;
    }

    const endingMonth = params.get('endingMonth');
    if (endingMonth === 'current') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.query.planEndDateFrom = this.toIsoDate(monthStart);
      this.query.planEndDateTo = this.toIsoDate(monthEnd);
      this.expiryDateMode = 'range';
      this.draftExpiryDateMode = 'range';
    }

    const joinedMonth = params.get('joinedMonth');
    if (joinedMonth === 'current') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.query.joinDateFrom = this.toIsoDate(monthStart);
      this.query.joinDateTo = this.toIsoDate(monthEnd);
      this.joinedDateMode = 'range';
      this.draftJoinedDateMode = 'range';
    }

  }

  private resolveReminderStage(): 'AUTO' | 'EXPIRING' | 'INACTIVE' {
    if (this.currentView === 'plans-ending') {
      return 'AUTO';
    }
    if (this.selectedSegment === 'inactive' || this.currentView === 'inactive') {
      return 'INACTIVE';
    }
    if (this.selectedSegment === 'expiring' || this.currentView === 'upcoming') {
      return 'EXPIRING';
    }
    return 'AUTO';
  }

  private syncMembersQueryParams(): void {
    const queryParams: Record<string, string> = { segment: this.selectedSegment };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  private toIsoDate(value: Date): string {
    return value.toISOString().split('T')[0];
  }

  private parseDateOnlyToUtcDate(value: string): Date | null {
    const parts = (value || '').split('-').map((p) => Number(p));
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }
    const [year, month, day] = parts;
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
  }

  private getExactMonthDuration(start: Date, end: Date): number | null {
    for (let months = 1; months <= 24; months++) {
      const computedEnd = this.addDaysUtc(this.addMonthsUtcClamped(start, months), -1);
      if (computedEnd.getTime() === end.getTime()) {
        return months;
      }
    }
    return null;
  }

  private addMonthsUtcClamped(base: Date, months: number): Date {
    const year = base.getUTCFullYear();
    const monthIndex = base.getUTCMonth();
    const day = base.getUTCDate();

    const targetMonthIndex = monthIndex + months;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const normalizedTargetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedTargetMonth + 1, 0)).getUTCDate();
    const clampedDay = Math.min(day, lastDayOfTargetMonth);
    return new Date(Date.UTC(targetYear, normalizedTargetMonth, clampedDay));
  }

  private addDaysUtc(base: Date, days: number): Date {
    return new Date(base.getTime() + days * 86400000);
  }

  resetFiltersAndReturn(): void {
    this.query = {
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
    this.viewType = 'default';
    this.selectedSegment = 'all';
    this.pageTitle = 'Gym Members';
    this.pageSubtitle = 'Manage and track all members from here.';
    this.router.navigate(['/owner/members'], { queryParams: {} });
    this.fetchMembers();
    this.fetchSegmentCounts();
  }
}
