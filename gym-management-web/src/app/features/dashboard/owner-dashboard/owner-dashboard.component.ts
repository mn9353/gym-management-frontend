import { AfterViewChecked, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardOverview, IrregularMember, MonthlyMemberFlow, MonthlyRevenueTrend, PaginatedIrregularMembers, RecentMember, WeeklyMemberGrowth } from '../../../core/models/dashboard.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, registerables } from 'chart.js';
import { MemberService } from '../../../core/services/member.service';
import { MemberDto } from '../../../core/models/member.models';
import { ThemeService } from '../../../core/services/theme.service';

Chart.register(...registerables);

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.css'
})
export class OwnerDashboardComponent implements OnInit, AfterViewChecked {
  private readonly expiringPageSize = 10;
  private expiringOffset = 0;
  private readonly destroyRef = inject(DestroyRef);
  private revenueChart: Chart<'bar'> | null = null;
  private flowChart: Chart<'bar'> | null = null;
  private revenueChartNeedsRender = false;
  private flowChartNeedsRender = false;
  private readonly revenueDataLabelPlugin = {
    id: 'revenueDataLabelPlugin',
    afterDatasetsDraw: (chart: Chart<'bar'>) => {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const dataset = chart.data.datasets[0];

      if (!meta?.data?.length || !dataset?.data?.length) {
        return;
      }

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = this.getCssVar('--text-dim');
      ctx.font = '600 11px "Plus Jakarta Sans", "Manrope", sans-serif';

      meta.data.forEach((barElement, index) => {
        const raw = Number(dataset.data[index] ?? 0);
        if (raw <= 0) {
          return;
        }

        const point = barElement.tooltipPosition(true);
        if (point.x == null || point.y == null) {
          return;
        }

        ctx.fillText(this.formatCompactCurrencyAxis(raw), point.x, point.y - 6);
      });

      ctx.restore();
    }
  };

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
  irregularMembers: IrregularMember[] = [];
  isExpiringLoadingMore = false;
  hasMoreExpiring = false;

  readonly monthOptions = [6, 12, 24] as const;
  revenueMonths: (typeof this.monthOptions)[number] = 12;
  flowMonths: (typeof this.monthOptions)[number] = 12;
  readonly flowViewOptions = ['BOTH', 'NEW', 'INACTIVE'] as const;
  flowView: (typeof this.flowViewOptions)[number] = 'BOTH';

  readonly cardSkeletons = Array.from({ length: 6 }, (_, index) => index);
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
        this.revenueChartNeedsRender = true;
        this.flowChartNeedsRender = true;
      });
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
      ),
      irregular: this.dashboardService.getIrregularMembers(1, 10, 4).pipe(
        catchError(() => {
          this.partialLoadWarning = true;
          return of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 });
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
        
        // Defensive mapping to support both old flat-array and new paginated responses
        this.irregularMembers = Array.isArray(result.irregular) 
          ? result.irregular 
          : (result.irregular as any)?.items || [];
        this.expiringOffset = this.expiringSoon.length;
        this.hasMoreExpiring =
          result.expiring.length === this.expiringPageSize
          && this.expiringSoon.length < this.overview.stats.expiringInNext7Days;
        this.revenueChartNeedsRender = true;
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
      plugins: [this.revenueDataLabelPlugin],
      data: {
        labels: this.revenueTrends.map((item) => item.month),
        datasets: [
          {
            label: 'Revenue (INR)',
            data: this.revenueTrends.map((item) => Number(item.revenue || 0)),
            borderRadius: 8,
            maxBarThickness: 44,
            backgroundColor: this.buildRevenuePalette(this.revenueTrends.map((item) => Number(item.revenue || 0)))
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
            grid: { display: false },
            ticks: { color: this.getCssVar('--text-dim') }
          },
          y: {
            beginAtZero: true,
            grid: { color: this.alphaColor(this.getCssVar('--line'), 0.5) },
            ticks: {
              color: this.getCssVar('--text-dim'),
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

  private buildRevenuePalette(values: number[]): string[] {
    if (!values.length) {
      return ['#5a6fdf'];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const isDark = this.themeService.isDark();

    // Keep classic blue scale while adapting contrast for theme.
    const lowHex = isDark ? '#7f8bc0' : '#d6dced';
    const highHex = isDark ? '#2f45b0' : '#3349b0';

    return values.map((value) => {
      const t = (value - min) / span;
      return this.mixHexColors(lowHex, highHex, t);
    });
  }

  private mixHexColors(fromHex: string, toHex: string, factor: number): string {
    const clamped = Math.max(0, Math.min(1, factor));
    const a = this.hexToRgb(fromHex);
    const b = this.hexToRgb(toHex);
    const r = Math.round(a.r + (b.r - a.r) * clamped);
    const g = Math.round(a.g + (b.g - a.g) * clamped);
    const bCh = Math.round(a.b + (b.b - a.b) * clamped);
    return `rgb(${r}, ${g}, ${bCh})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.replace('#', '');
    const full = normalized.length === 3 ? normalized.split('').map((x) => x + x).join('') : normalized;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    };
  }

  openMembersBySegment(segment: 'all' | 'active' | 'expiring' | 'inactive'): void {
    if (segment === 'active') {
      this.router.navigate(['/owner/members'], { queryParams: { segment: 'active' } });
      return;
    }
    if (segment === 'expiring') {
      this.router.navigate(['/owner/members'], { queryParams: { segment: 'expiring' } });
      return;
    }
    if (segment === 'inactive') {
      this.router.navigate(['/owner/members'], { queryParams: { segment: 'inactive' } });
      return;
    }
    this.router.navigate(['/owner/members'], { queryParams: { segment: 'all' } });
  }

  openNewJoins(): void {
    this.router.navigate(['/owner/members'], {
      queryParams: { segment: 'all', joinedMonth: 'current' }
    });
  }

  openPlansEndingThisMonth(): void {
    this.router.navigate(['/owner/members'], {
      queryParams: { segment: 'all', endingMonth: 'current' }
    });
  }

  openPendingAmountMembers(): void {
    this.router.navigate(['/owner/members'], {
      queryParams: { segment: 'all', paymentStatus: 'PENDING,PARTIAL', view: 'pending' }
    });
  }

  openIrregularMembers(): void {
    this.router.navigate(['/owner/users/irregular']);
  }
}
