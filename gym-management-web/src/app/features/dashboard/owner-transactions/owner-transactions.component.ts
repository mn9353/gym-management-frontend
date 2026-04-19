import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { PaymentListItem, PaymentListQuery } from '../../../core/models/payment.models';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';

@Component({
  selector: 'app-owner-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './owner-transactions.component.html',
  styleUrl: './owner-transactions.component.css'
})
export class OwnerTransactionsComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  items: PaymentListItem[] = [];
  totalCount = 0;
  totalPages = 1;

  paymentDateMode: 'any' | 'range' | 'single' = 'any';
  draftPaymentDateMode: 'any' | 'range' | 'single' = 'any';
  isAdvancedFiltersOpen = false;
  advancedFilterDraft: {
    paymentMode: '' | 'UPI' | 'CARD' | 'CASH';
    paymentStatus: '' | 'PAID' | 'PARTIAL' | 'PENDING';
    paymentDateFrom?: string;
    paymentDateTo?: string;
    amountMin?: number;
    amountMax?: number;
  } = {
    paymentMode: '',
    paymentStatus: ''
  };

  query: PaymentListQuery = {
    pageNumber: 1,
    pageSize: 10,
    sortBy: 'paymentDate',
    sortDirection: 'desc',
    searchTerm: '',
    paymentMode: '',
    paymentStatus: '',
    paymentDateFrom: '',
    paymentDateTo: '',
    paymentDate: '',
    amountMin: undefined,
    amountMax: undefined
  };

  private readonly searchChanged$ = new Subject<void>();

  constructor(
    private readonly paymentService: PaymentService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user?.gymSubscriptionPlan?.toLowerCase() === 'basic') {
      this.router.navigate(['/owner/dashboard']);
      return;
    }

    this.searchChanged$.pipe(debounceTime(350)).subscribe(() => {
      this.query.pageNumber = 1;
      this.fetchTransactions();
    });
    this.fetchTransactions();
    this.syncDraft();
  }

  onSearchChange(): void {
    this.searchChanged$.next();
  }

  onFilterChange(): void {
    this.query.pageNumber = 1;
    this.fetchTransactions();
  }

  onPaymentDateModeChange(mode: 'any' | 'range' | 'single'): void {
    this.paymentDateMode = mode;
    if (mode === 'any') {
      this.query.paymentDate = '';
      this.query.paymentDateFrom = '';
      this.query.paymentDateTo = '';
    } else if (mode === 'single') {
      this.query.paymentDateFrom = '';
      this.query.paymentDateTo = '';
    } else {
      this.query.paymentDate = '';
    }
    this.onFilterChange();
  }

  openAdvancedFilters(): void {
    this.syncDraft();
    this.isAdvancedFiltersOpen = true;
  }

  closeAdvancedFilters(): void {
    this.isAdvancedFiltersOpen = false;
  }

  onDraftPaymentDateModeChange(mode: 'any' | 'range' | 'single'): void {
    this.draftPaymentDateMode = mode;
    if (mode === 'any') {
      this.advancedFilterDraft.paymentDateFrom = '';
      this.advancedFilterDraft.paymentDateTo = '';
    } else if (mode === 'single') {
      this.advancedFilterDraft.paymentDateTo = '';
    }
  }

  applyAdvancedFilters(): void {
    this.query.paymentMode = this.advancedFilterDraft.paymentMode;
    this.query.paymentStatus = this.advancedFilterDraft.paymentStatus;
    this.query.amountMin = this.advancedFilterDraft.amountMin;
    this.query.amountMax = this.advancedFilterDraft.amountMax;
    this.paymentDateMode = this.draftPaymentDateMode;
    const dateFrom = this.advancedFilterDraft.paymentDateFrom || '';
    const dateTo = this.advancedFilterDraft.paymentDateTo || '';
    if (this.draftPaymentDateMode === 'any') {
      this.query.paymentDate = '';
      this.query.paymentDateFrom = '';
      this.query.paymentDateTo = '';
    } else if (this.draftPaymentDateMode === 'single') {
      this.query.paymentDate = dateFrom;
      this.query.paymentDateFrom = '';
      this.query.paymentDateTo = '';
    } else {
      this.query.paymentDate = '';
      this.query.paymentDateFrom = dateFrom;
      this.query.paymentDateTo = dateTo;
    }
    this.query.pageNumber = 1;
    this.fetchTransactions();
    this.closeAdvancedFilters();
  }

  resetAdvancedFilters(): void {
    this.advancedFilterDraft = {
      paymentMode: '',
      paymentStatus: '',
      paymentDateFrom: '',
      paymentDateTo: '',
      amountMin: undefined,
      amountMax: undefined
    };
    this.draftPaymentDateMode = 'any';
  }

  clearFilters(): void {
    this.query.searchTerm = '';
    this.query.paymentMode = '';
    this.query.paymentStatus = '';
    this.query.paymentDate = '';
    this.query.paymentDateFrom = '';
    this.query.paymentDateTo = '';
    this.query.amountMin = undefined;
    this.query.amountMax = undefined;
    this.query.pageNumber = 1;
    this.fetchTransactions();
  }

  nextPage(): void {
    if ((this.query.pageNumber ?? 1) >= this.totalPages) {
      return;
    }
    this.query.pageNumber = (this.query.pageNumber ?? 1) + 1;
    this.fetchTransactions();
  }

  previousPage(): void {
    if ((this.query.pageNumber ?? 1) <= 1) {
      return;
    }
    this.query.pageNumber = (this.query.pageNumber ?? 1) - 1;
    this.fetchTransactions();
  }

  formatCurrency(value?: number | null): string {
    return (value ?? 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  private fetchTransactions(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.items = [];

    const payload: PaymentListQuery = {
      ...this.query,
      paymentDate: this.paymentDateMode === 'single' ? this.query.paymentDate : '',
      paymentDateFrom: this.paymentDateMode === 'range' ? this.query.paymentDateFrom : '',
      paymentDateTo: this.paymentDateMode === 'range' ? this.query.paymentDateTo : ''
    };

    this.paymentService.getPayments(payload).subscribe({
      next: (response) => {
        this.items = response.items;
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.query.pageNumber = response.pageNumber;
        this.query.pageSize = response.pageSize;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = extractApiErrorMessage(error, 'Unable to load transactions.');
        this.isLoading = false;
      }
    });
  }

  private syncDraft(): void {
    this.advancedFilterDraft = {
      paymentMode: this.query.paymentMode || '',
      paymentStatus: this.query.paymentStatus || '',
      paymentDateFrom: this.query.paymentDateFrom || this.query.paymentDate || '',
      paymentDateTo: this.query.paymentDateTo || '',
      amountMin: this.query.amountMin,
      amountMax: this.query.amountMax
    };
    this.draftPaymentDateMode = this.paymentDateMode;
  }
}
