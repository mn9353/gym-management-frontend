import { AfterViewChecked, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardOverview, MonthlyMemberFlow, MonthlyRevenueTrend, RecentMember, WeeklyMemberGrowth } from '../../../core/models/dashboard.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, registerables } from 'chart.js';
import { MemberService } from '../../../core/services/member.service';
import { MemberDto } from '../../../core/models/member.models';

Chart.register(...registerables);

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.css'
})
export class OwnerDashboardComponent implements OnInit, AfterViewChecked {
  private readonly destroyRef = inject(DestroyRef);
  private revenueChart: Chart<'bar'> | null = null;
  private flowChart: Chart<'bar'> | null = null;
  private revenueChartNeedsRender = false;
  private flowChartNeedsRender = false;

  @ViewChild('revenueChartCanvas') revenueChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('flowChartCanvas') flowChartCanvas?: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  isRevenueChartLoading = false;
  isFlowChartLoading = false;
  overview: DashboardOverview | null = null;
  errorMessage = '';
  partialLoadWarning = false;

  revenueTrends: MonthlyRevenueTrend[] = [];
  memberFlowTrends: MonthlyMemberFlow[] = [];
  weeklyGrowth: WeeklyMemberGrowth[] = [];
  recentMembers: RecentMember[] = [];
  expiringSoon: MemberDto[] = [];

  readonly monthOptions = [6, 12, 24] as const;
  revenueMonths: (typeof this.monthOptions)[number] = 12;
  flowMonths: (typeof this.monthOptions)[number] = 12;
  readonly flowViewOptions = ['BOTH', 'NEW', 'INACTIVE'] as const;
  flowView: (typeof this.flowViewOptions)[number] = 'BOTH';

  readonly cardSkeletons = Array.from({ length: 6 }, (_, index) => index);
  readonly rowSkeletons = Array.from({ length: 4 }, (_, index) => index);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly memberService: MemberService
  ) {}

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.destroyCharts());
    this.loadDashboardData();
  }

  ngAfterViewChecked(): void {
    if (this.revenueChartNeedsRender && this.revenueChartCanvas?.nativeElement) {
      this.renderRevenueChart();
      this.revenueChartNeedsRender = false;
    }

    if (this.flowChartNeedsRender && this.flowChartCanvas?.nativeElement) {
      this.renderFlowChart();
      this.flowChartNeedsRender = false;
    }
  }

  onRevenueRangeChange(months: (typeof this.monthOptions)[number]): void {
    if (this.revenueMonths === months) {
      return;
    }

    this.revenueMonths = months;
    this.isRevenueChartLoading = true;
    this.dashboardService
      .getRevenueTrends(this.revenueMonths)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.revenueTrends = data;
          this.revenueChartNeedsRender = true;
          this.isRevenueChartLoading = false;
        },
        error: () => {
          this.isRevenueChartLoading = false;
        }
      });
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

  get revenueDeltaPercent(): number {
    if (!this.overview) {
      return 0;
    }
    const last = this.overview.stats.revenueLastMonth;
    if (!last) {
      return this.overview.stats.revenueThisMonth > 0 ? 100 : 0;
    }
    return ((this.overview.stats.revenueThisMonth - last) / last) * 100;
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
    return Math.min(4, Math.max(1, Math.ceil(day / 7)));
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
      revenue: this.dashboardService.getRevenueTrends(this.revenueMonths).pipe(
        catchError(() => {
          this.partialLoadWarning = true;
          return of([]);
        })
      ),
      flow: this.dashboardService.getMemberFlow(this.flowMonths).pipe(
        catchError(() => {
          this.partialLoadWarning = true;
          return of([]);
        })
      ),
      weekly: this.dashboardService.getWeeklyGrowth(4).pipe(
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
      expiring: this.memberService.getUpcomingRenewals(7, 10).pipe(
        catchError(() => {
          this.partialLoadWarning = true;
          return of([]);
        })
      )
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result.overview) {
          this.errorMessage = 'Unable to load dashboard summary.';
          this.isLoading = false;
          return;
        }

        this.overview = result.overview;
        this.revenueTrends = result.revenue;
        this.memberFlowTrends = result.flow;
        this.weeklyGrowth = result.weekly;
        this.recentMembers = result.recent;
        this.expiringSoon = result.expiring;
        this.revenueChartNeedsRender = true;
        this.flowChartNeedsRender = true;
        this.isLoading = false;
      });
  }

  private renderRevenueChart(): void {
    if (!this.revenueChartCanvas?.nativeElement) {
      return;
    }

    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }

    this.revenueChart = new Chart(this.revenueChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.revenueTrends.map((item) => item.month),
        datasets: [
          {
            label: 'Revenue (INR)',
            data: this.revenueTrends.map((item) => Number(item.revenue || 0)),
            borderRadius: 8,
            maxBarThickness: 44,
            backgroundColor: [
              '#d7ddf0',
              '#d0d7ef',
              '#c8d0ef',
              '#bec8ee',
              '#adb9ec',
              '#9ca9e9',
              '#8597e6',
              '#6f82e1',
              '#586cdc',
              '#4256d3',
              '#2f45b0',
              '#23358d'
            ]
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `Revenue: ${this.formatCurrency(Number(context.raw ?? 0))}`
            }
          }
        },
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#edf1f7' },
            ticks: {
              callback: (value) => this.formatCompactCurrencyAxis(value)
            }
          }
        }
      }
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
            position: 'top'
          }
        },
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#edf1f7' }
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
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }

    if (this.flowChart) {
      this.flowChart.destroy();
      this.flowChart = null;
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value ?? 0);
  }

  formatChange(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}`;
  }

  formatPercent(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
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

  private formatCompactCurrencyAxis(value: string | number): string {
    const numeric = Number(value) || 0;
    if (numeric >= 100000) {
      const lakhs = numeric / 100000;
      return `${this.trimTrailingZero(lakhs)}L`;
    }
    if (numeric >= 1000) {
      const thousands = numeric / 1000;
      return `${this.trimTrailingZero(thousands)}K`;
    }
    return `${Math.round(numeric)}`;
  }

  private trimTrailingZero(value: number): string {
    const fixed = value.toFixed(1);
    return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  }
}
