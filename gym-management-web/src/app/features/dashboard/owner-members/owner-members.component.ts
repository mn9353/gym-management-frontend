import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';
import { MemberListItem, MemberListQuery, MemberSegmentCounts } from '../../../core/models/member.models';
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
    searchTerm: ''
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

  getSegmentCount(segment: MemberSegment): number {
    return this.segmentCounts[segment] ?? 0;
  }
}
