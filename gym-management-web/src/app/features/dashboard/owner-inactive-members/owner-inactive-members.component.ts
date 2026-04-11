import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  ColumnState,
  FilterChangedEvent,
  FilterModel,
  GridReadyEvent,
  SortChangedEvent
} from 'ag-grid-community';
import { MemberService } from '../../../core/services/member.service';
import { MemberListItem, MemberListQuery } from '../../../core/models/member.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';

@Component({
  selector: 'app-owner-inactive-members',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, AgGridAngular],
  templateUrl: './owner-inactive-members.component.html',
  styleUrl: './owner-inactive-members.component.css'
})
export class OwnerInactiveMembersComponent implements OnInit {
  isLoading = true;
  isLoadingMoreMobile = false;
  errorMessage = '';
  members: MemberListItem[] = [];
  mobileMembers: MemberListItem[] = [];
  totalCount = 0;
  totalPages = 1;
  hasMoreMobile = true;
  readonly mobileBreakpoint = 860;
  isMobileView = typeof window !== 'undefined' && window.innerWidth <= this.mobileBreakpoint;
  isMobileFilterOpen = false;
  private gridApi?: GridReadyEvent['api'];
  private readonly filterChanged$ = new Subject<void>();

  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly sortOptions = [
    { label: 'Plan End Date', value: 'planEndDate' },
    { label: 'Plan Start Date', value: 'planStartDate' },
    { label: 'Join Date', value: 'joinDate' },
    { label: 'Name', value: 'name' },
    { label: 'Phone', value: 'phone' },
    { label: 'Amount Paid', value: 'amountPaid' }
  ] as const;

  readonly defaultColDef: ColDef<MemberListItem> = {
    filter: true,
    floatingFilter: true,
    resizable: true,
    sortable: true
  };

  filters: MemberListQuery = {
    pageNumber: 1,
    pageSize: 20,
    sortBy: 'planEndDate',
    sortDirection: 'desc',
    includeAmount: false,
    searchTerm: '',
    phone: '',
    gender: '',
    planStartDate: '',
    planStartDateFrom: '',
    planStartDateTo: '',
    planEndDate: '',
    joinDateFrom: '',
    joinDateTo: '',
    planEndDateFrom: '',
    planEndDateTo: ''
  };

  readonly baseColumns: ColDef<MemberListItem>[] = [
    {
      colId: 'name',
      field: 'fullName',
      headerName: 'Name',
      filter: 'agTextColumnFilter',
      flex: 1.2,
      minWidth: 160
    },
    {
      colId: 'phone',
      field: 'phone',
      headerName: 'Phone',
      filter: 'agTextColumnFilter',
      flex: 1.1,
      minWidth: 140
    },
    {
      colId: 'gender',
      field: 'gender',
      headerName: 'Gender',
      filter: 'agSetColumnFilter',
      filterParams: {
        values: ['M', 'F', 'MALE', 'FEMALE']
      },
      valueFormatter: (params) => this.formatGender(params.value),
      width: 100
    },
    {
      colId: 'planStartDate',
      field: 'planStartDate',
      headerName: 'Plan Start',
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => this.formatDate(params.value),
      minWidth: 150
    },
    {
      colId: 'planEndDate',
      field: 'planEndDate',
      headerName: 'Plan End',
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => this.formatDate(params.value),
      minWidth: 150
    },
    {
      colId: 'status',
      field: 'status',
      headerName: 'Status',
      filter: false,
      width: 120
    }
  ];

  get columnDefs(): ColDef<MemberListItem>[] {
    if (!this.filters.includeAmount) {
      return this.baseColumns;
    }

    return [
      ...this.baseColumns,
      {
        colId: 'amountPaid',
        field: 'amountPaid',
        headerName: 'Amount',
        filter: false,
        width: 130,
        valueFormatter: (params) => this.formatAmount(params.value)
      }
    ];
  }

  constructor(private readonly memberService: MemberService) {}

  ngOnInit(): void {
    this.filterChanged$.pipe(debounceTime(350)).subscribe(() => {
      this.filters.pageNumber = 1;
      this.fetchMembers();
    });
    this.fetchMembers();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const wasMobile = this.isMobileView;
    this.isMobileView = window.innerWidth <= this.mobileBreakpoint;

    if (this.isMobileView !== wasMobile) {
      this.filters.pageNumber = 1;
      this.mobileMembers = [];
      this.hasMoreMobile = true;
      this.fetchMembers();
    }
  }

  fetchMembers(appendForMobile = false): void {
    if (appendForMobile) {
      this.isLoadingMoreMobile = true;
    } else {
      this.isLoading = true;
    }
    this.errorMessage = '';
    const requestedPage = this.filters.pageNumber ?? 1;

    this.memberService.getInactiveMembersList(this.filters).subscribe({
      next: (response) => {
        this.members = response.items;
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.filters.pageNumber = response.pageNumber;
        this.filters.pageSize = response.pageSize;
        if (this.isMobileView) {
          if (appendForMobile && requestedPage > 1) {
            this.mobileMembers = [...this.mobileMembers, ...response.items];
          } else {
            this.mobileMembers = response.items;
          }
          this.hasMoreMobile = (this.filters.pageNumber ?? 1) < this.totalPages;
        }
        this.isLoading = false;
        this.isLoadingMoreMobile = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load inactive users.';
        this.isLoading = false;
        this.isLoadingMoreMobile = false;
      }
    });
  }

  resetFilters(): void {
    this.filters = {
      pageNumber: 1,
      pageSize: 20,
      sortBy: 'planEndDate',
      sortDirection: 'desc',
      includeAmount: false,
      searchTerm: '',
      phone: '',
      gender: '',
      planStartDate: '',
      planStartDateFrom: '',
      planStartDateTo: '',
      planEndDate: '',
      joinDateFrom: '',
      joinDateTo: '',
      planEndDateFrom: '',
      planEndDateTo: ''
    };
    this.mobileMembers = [];
    this.hasMoreMobile = true;
    this.fetchMembers();
    this.gridApi?.setFilterModel(null);
  }

  onFilterChanged(): void {
    this.filterChanged$.next();
  }

  onDesktopGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  onDesktopFilterChanged(event: FilterChangedEvent): void {
    const filterModel = event.api.getFilterModel();
    this.applyAgGridFilterModel(filterModel);
  }

  onDesktopSortChanged(event: SortChangedEvent): void {
    const sortedState = (event.api.getColumnState() as ColumnState[]).find((s) => !!s.sort);
    if (!sortedState?.colId || !sortedState.sort) {
      return;
    }

    this.filters.sortBy = sortedState.colId as MemberListQuery['sortBy'];
    this.filters.sortDirection = sortedState.sort as MemberListQuery['sortDirection'];
    this.onFilterChanged();
  }

  toggleMobileFilters(): void {
    this.isMobileFilterOpen = !this.isMobileFilterOpen;
  }

  applyMobileFilters(): void {
    this.isMobileFilterOpen = false;
    this.filters.pageNumber = 1;
    this.mobileMembers = [];
    this.hasMoreMobile = true;
    this.onFilterChanged();
  }

  onPageScroll(container: HTMLElement): void {
    if (!this.isMobileView || this.isLoading || this.isLoadingMoreMobile || !this.hasMoreMobile) {
      return;
    }

    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (remaining <= 140) {
      this.loadMoreMobile();
    }
  }

  nextPage(): void {
    if ((this.filters.pageNumber ?? 1) < this.totalPages) {
      this.filters.pageNumber = (this.filters.pageNumber ?? 1) + 1;
      this.fetchMembers();
    }
  }

  previousPage(): void {
    if ((this.filters.pageNumber ?? 1) > 1) {
      this.filters.pageNumber = (this.filters.pageNumber ?? 1) - 1;
      this.fetchMembers();
    }
  }

  formatGender(gender?: string | null): string {
    const normalized = (gender ?? '').trim().toUpperCase();
    if (normalized === 'MALE' || normalized === 'M') {
      return 'M';
    }
    if (normalized === 'FEMALE' || normalized === 'F') {
      return 'F';
    }
    return '-';
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatAmount(value?: number | null): string {
    const amount = value ?? 0;
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  }

  private applyAgGridFilterModel(model: FilterModel): void {
    this.filters.searchTerm = this.getTextFilter(model, 'name') ?? '';
    this.filters.phone = this.getTextFilter(model, 'phone') ?? '';
    this.filters.gender = this.getSetFilter(model, 'gender') ?? '';

    const planStart = this.getDateFilter(model, 'planStartDate');
    this.filters.planStartDate = planStart.equals ?? '';
    this.filters.planStartDateFrom = planStart.from ?? '';
    this.filters.planStartDateTo = planStart.to ?? '';

    const planEnd = this.getDateFilter(model, 'planEndDate');
    this.filters.planEndDate = planEnd.equals ?? '';
    this.filters.planEndDateFrom = planEnd.from ?? '';
    this.filters.planEndDateTo = planEnd.to ?? '';

    this.onFilterChanged();
  }

  private getTextFilter(model: FilterModel, key: string): string | null {
    const item = model[key] as { filterType?: string; type?: string; filter?: string } | undefined;
    if (!item || item.filterType !== 'text') {
      return null;
    }
    return item.filter ?? null;
  }

  private getSetFilter(model: FilterModel, key: string): string | null {
    const item = model[key] as { filterType?: string; values?: string[] } | undefined;
    if (!item || item.filterType !== 'set' || !item.values?.length) {
      return null;
    }
    return item.values[0];
  }

  private getDateFilter(model: FilterModel, key: string): { equals?: string; from?: string; to?: string } {
    const item = model[key] as { filterType?: string; type?: string; dateFrom?: string; dateTo?: string } | undefined;
    if (!item || item.filterType !== 'date') {
      return {};
    }

    const dateFrom = this.normalizeAgDate(item.dateFrom);
    const dateTo = this.normalizeAgDate(item.dateTo);
    if (item.type === 'equals') {
      return { equals: dateFrom };
    }
    if (item.type === 'inRange') {
      return { from: dateFrom, to: dateTo };
    }

    return {};
  }

  private normalizeAgDate(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.includes(' ') ? value.split(' ')[0] : value;
  }

  private loadMoreMobile(): void {
    if (!this.hasMoreMobile || this.isLoadingMoreMobile) {
      return;
    }

    this.filters.pageNumber = (this.filters.pageNumber ?? 1) + 1;
    this.fetchMembers(true);
  }
}
