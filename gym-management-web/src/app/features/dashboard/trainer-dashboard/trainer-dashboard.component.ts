import { AfterViewChecked, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardOverview, MonthlyMemberFlow, RecentMember, WeeklyMemberGrowth } from '../../../core/models/dashboard.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, registerables } from 'chart.js';
import { MemberService } from '../../../core/services/member.service';
import { MemberDto } from '../../../core/models/member.models';
import { ThemeService } from '../../../core/services/theme.service';

Chart.register(...registerables);

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './trainer-dashboard.component.html',
  styleUrl: './trainer-dashboard.component.css'
})
export class TrainerDashboardComponent implements OnInit, AfterViewChecked {
  private readonly expiringPageSize = 10;
  private expiringOffset = 0;
  private readonly destroyRef = inject(DestroyRef);
  private flowChart: Chart<'bar'> | null = null;
  private flowChartNeedsRender = false;

  @ViewChild('flowChartCanvas') flowChartCanvas?: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  isFlowChartLoading = false;
  overview: DashboardOverview | null = null;
  errorMessage = '';
  partialLoadWarning = false;

  memberFlowTrends: MonthlyMemberFlow[] = [];
  weeklyGrowth: WeeklyMemberGrowth[] = [];
  recentMembers: RecentMember[] = [];
  expiringSoon: MemberDto[] = [];
  isExpiringLoadingMore = false;
  hasMoreExpiring = false;

  readonly monthOptions = [6, 12, 24] as const;
  flowMonths: (typeof this.monthOptions)[number] = 12;
  readonly flowViewOptions = ['BOTH', 'NEW', 'INACTIVE'] as const;
  flowView: (typeof this.flowViewOptions)[number] = 'BOTH';

  readonly cardSkeletons = Array.from({ length: 5 }, (_, index) => index);
  readonly rowSkeletons = Array.from({ length: 4 }, (_, index) => index);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly memberService: MemberService,
    private readonly router: Router,
    private readonly themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.destroyCharts());
    this.themeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.flowChartNeedsRender = true;
      });
    this.loadDashboardData();
  }

  ngAfterViewChecked(): void {
    if (this.flowChartNeedsRender && this.flowChartCanvas?.nativeElement) {
      this.renderFlowChart();
      this.flowChartNeedsRender = false;
    }
  }

  onFlowRangeChange(months: (typeof this.monthOptions)[number]): void {
    if (this.flowMonths === months) {
      return;
    }

    this.flowMonths = months;
    this.isFlowChartLoading = true;
    this.dashboardService
      .getMemberFlow(this.flowMonths)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.memberFlowTrends = data;
          this.flowChartNeedsRender = true;
          this.isFlowChartLoading = false;
        },
        error: () => {
          this.isFlowChartLoading = false;
        }
      });
  }

  onFlowViewChange(value: string): void {
    if (!this.flowViewOptions.includes(value as (typeof this.flowViewOptions)[number])) {
      return;
    }

    this.flowView = value as (typeof this.flowViewOptions)[number];
    this.flowChartNeedsRender = true;
  }

  get activeDelta(): number {
    if (!this.overview) {
      return 0;
    }
    return this.overview.stats.totalActiveMembers - this.overview.stats.totalActiveMembersLastMonth;
  }

  get joinsDelta(): number {
    if (!this.overview) {
      return 0;
    }
    return this.overview.stats.newJoinsThisMonth - this.overview.stats.newJoinsLastMonth;
  }

  get weeklyInsight(): string {
    if (this.weeklyGrowth.length === 0) {
      return 'No weekly insight available yet.';
    }

    const maxWeek = this.weeklyGrowth.reduce((prev, current) =>
      current.newJoinees > prev.newJoinees ? current : prev
    );
    return `Member joins peaked in ${maxWeek.week} with ${maxWeek.newJoinees} joins.`;
  }

  get weeklyProgressNote(): string {
    const currentWeek = this.currentWeekOfMonth;
    if (currentWeek <= 1) {
      return 'Month just started. Remaining weeks will fill automatically.';
    }
    if (currentWeek >= 4) {
      return 'Full-month weekly view is available.';
    }
    return `Month in progress: data currently through Week ${currentWeek}.`;
  }

  get maxWeeklyJoin(): number {
    if (this.weeklyGrowth.length === 0) {
      return 1;
    }
    return Math.max(...this.weeklyGrowth.map((w) => w.newJoinees), 1);
  }

  get maxWeeklyInactive(): number {
    if (this.weeklyGrowth.length === 0) {
      return 1;
    }
    return Math.max(...this.weeklyGrowth.map((w) => w.inactiveMembers), 1);
  }

  get weeklyTotalJoins(): number {
    return this.weeklyGrowth.reduce((sum, w) => sum + w.newJoinees, 0);
  }

  get weeklyTotalInactive(): number {
    if (this.overview) {
      return this.overview.stats.expiringThisMonth;
    }
    return this.weeklyGrowth.reduce((sum, w) => sum + w.inactiveMembers, 0);
  }

  get currentWeekOfMonth(): number {
    const day = new Date().getDate();
    const totalBuckets = Math.max(this.weeklyGrowth.length, 1);
    return Math.min(totalBuckets, Math.max(1, Math.ceil(day / 7)));
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.partialLoadWarning = false;

    forkJoin({
      overview: this.dashboardService.getOverview().pipe(
        catchError(() => {
          this.partialLoadWarning = true;
          return of(null);
        })
      ),
      flow: this.dashboardService.getMemberFlow(this.flowMonths).pipe(
        catchError(() => {
          this.partialLoadWarning = true;
          return of([]);
        })
      ),
      weekly: this.dashboardService.getWeeklyGrowth(0).pipe(
        catchError(() => {
          this.partialLoadWarning = true;
          return of([]);
        })
      ),
      recent: this.dashboardService.getRecentMembers(5).pipe(
        catchError(() => {
          this.partialLoadWarning = true;
          return of([]);
        })
      ),
      expiring: this.memberService.getUpcomingRenewals(7, this.expiringPageSize, 0).pipe(
        catchError(() => {
          this.partialLoadWarning = true;
          return of([]);
        })
      )
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result.overview) {
          this.errorMessage = 'Unable to load trainer dashboard.';
          this.isLoading = false;
          return;
        }

        this.overview = result.overview;
        this.memberFlowTrends = result.flow;
        this.weeklyGrowth = result.weekly;
        this.recentMembers = result.recent;
        this.expiringSoon = result.expiring;
        this.expiringOffset = this.expiringSoon.length;
        this.hasMoreExpiring =
          result.expiring.length === this.expiringPageSize
          && this.expiringSoon.length < this.overview.stats.expiringInNext7Days;
        this.flowChartNeedsRender = true;
        this.isLoading = false;
      });
  }

  onExpiringListScroll(event: Event): void {
    if (!this.hasMoreExpiring || this.isExpiringLoadingMore || this.isLoading) {
      return;
    }

    const container = event.target as HTMLElement | null;
    if (!container) {
      return;
    }

    const threshold = 28;
    const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
    if (!nearBottom) {
      return;
    }

    this.isExpiringLoadingMore = true;
    this.memberService
      .getUpcomingRenewals(7, this.expiringPageSize, this.expiringOffset)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.partialLoadWarning = true;
          return of([]);
        })
      )
      .subscribe((nextBatch) => {
        if (nextBatch.length > 0) {
          this.expiringSoon = [...this.expiringSoon, ...nextBatch];
          this.expiringOffset += nextBatch.length;
        }

        const expectedTotal = this.overview?.stats.expiringInNext7Days ?? 0;
        this.hasMoreExpiring =
          nextBatch.length === this.expiringPageSize
          && this.expiringOffset < expectedTotal;
        this.isExpiringLoadingMore = false;
      });
  }

  private renderFlowChart(): void {
    if (!this.flowChartCanvas?.nativeElement) {
      return;
    }

    if (this.flowChart) {
      this.flowChart.destroy();
      this.flowChart = null;
    }

    this.flowChart = new Chart(this.flowChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.memberFlowTrends.map((item) => item.month),
        datasets: this.buildMemberFlowDatasets()
      },
      options: {
        plugins: {
          legend: {
            position: 'top',
            labels: { color: this.getCssVar('--text') }
          }
        },
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: this.getCssVar('--text-dim') }
          },
          y: {
            beginAtZero: true,
            grid: { color: this.alphaColor(this.getCssVar('--line'), 0.5) },
            ticks: { color: this.getCssVar('--text-dim') }
          }
        }
      }
    });
  }

  private buildMemberFlowDatasets() {
    const datasets: {
      label: string;
      data: number[];
      borderRadius: number;
      backgroundColor: string;
      maxBarThickness: number;
    }[] = [];

    if (this.flowView === 'BOTH' || this.flowView === 'NEW') {
      datasets.push({
        label: 'New Joinees',
        data: this.memberFlowTrends.map((item) => item.newJoinees),
        borderRadius: 6,
        backgroundColor: '#16a34a',
        maxBarThickness: 24
      });
    }

    if (this.flowView === 'BOTH' || this.flowView === 'INACTIVE') {
      datasets.push({
        label: 'Inactive Members',
        data: this.memberFlowTrends.map((item) => item.inactiveMembers),
        borderRadius: 6,
        backgroundColor: '#dc2626',
        maxBarThickness: 24
      });
    }

    return datasets;
  }

  private destroyCharts(): void {
    if (this.flowChart) {
      this.flowChart.destroy();
      this.flowChart = null;
    }
  }

  private getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#5d6b80';
  }

  private alphaColor(hexOrRgb: string, alpha: number): string {
    if (hexOrRgb.startsWith('#')) {
      const hex = hexOrRgb.replace('#', '');
      const normalized = hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex;
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hexOrRgb;
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

  getPlanMonthsLabel(planStartDate: string, planEndDate: string): string {
    const start = new Date(planStartDate);
    const end = new Date(planEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return '';
    }

    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1;
    return `${Math.max(1, months)} month${months > 1 ? 's' : ''}`;
  }

  openMembersBySegment(segment: 'all' | 'active' | 'expiring' | 'inactive'): void {
    this.router.navigate(['/trainer/members'], {
      queryParams: { segment }
    });
  }

  openNewJoins(): void {
    this.router.navigate(['/trainer/members'], {
      queryParams: { segment: 'all', joinedMonth: 'current' }
    });
  }

  openPlansEndingThisMonth(): void {
    this.router.navigate(['/trainer/members'], {
      queryParams: { segment: 'all', endingMonth: 'current' }
    });
  }
}
