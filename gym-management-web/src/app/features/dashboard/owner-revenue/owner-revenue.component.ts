import { AfterViewChecked, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardStats, MonthlyJoinTrend, MonthlyRevenueTrend } from '../../../core/models/dashboard.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-owner-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './owner-revenue.component.html',
  styleUrl: './owner-revenue.component.css'
})
export class OwnerRevenueComponent implements OnInit, AfterViewChecked {
  private readonly destroyRef = inject(DestroyRef);
  private revenueChart: Chart<'line'> | null = null;
  private joinsChart: Chart<'bar'> | null = null;
  private revenueChartNeedsRender = false;
  private joinsChartNeedsRender = false;

  @ViewChild('revenueChartCanvas') revenueChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('joinsChartCanvas') joinsChartCanvas?: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  revenueChartLoading = false;
  joinsChartLoading = false;
  errorMessage = '';
  revenueError = '';
  joinsError = '';

  stats: DashboardStats | null = null;
  trends: MonthlyRevenueTrend[] = [];
  joinTrends: MonthlyJoinTrend[] = [];

  readonly monthOptions = [6, 12, 24] as const;
  revenueMonths: (typeof this.monthOptions)[number] = 6;
  joinsMonths: (typeof this.monthOptions)[number] = 6;
  readonly cardSkeletons = Array.from({ length: 3 }, (_, index) => index);
  readonly trendSkeletons = Array.from({ length: 6 }, (_, index) => index);

  constructor(private readonly dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.destroyCharts());
    this.loadInitialData();
  }

  ngAfterViewChecked(): void {
    if (this.revenueChartNeedsRender && this.revenueChartCanvas?.nativeElement) {
      this.renderRevenueChart();
      this.revenueChartNeedsRender = false;
    }

    if (this.joinsChartNeedsRender && this.joinsChartCanvas?.nativeElement) {
      this.renderJoinsChart();
      this.joinsChartNeedsRender = false;
    }
  }

  onRevenueRangeChange(value: number): void {
    const parsed = Number(value);
    if (!this.monthOptions.includes(parsed as (typeof this.monthOptions)[number])) {
      return;
    }

    if (this.revenueMonths === parsed) {
      return;
    }

    this.revenueMonths = parsed as (typeof this.monthOptions)[number];
    this.loadRevenueTrend();
  }

  onJoinsRangeChange(value: number): void {
    const parsed = Number(value);
    if (!this.monthOptions.includes(parsed as (typeof this.monthOptions)[number])) {
      return;
    }

    if (this.joinsMonths === parsed) {
      return;
    }

    this.joinsMonths = parsed as (typeof this.monthOptions)[number];
    this.loadJoinTrend();
  }

  get hasRevenueData(): boolean {
    return this.trends.some((item) => Number(item.revenue) > 0);
  }

  get hasJoinData(): boolean {
    return this.joinTrends.some((item) => item.joinCount > 0);
  }

  private loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      stats: this.dashboardService.getStats(),
      trends: this.dashboardService.getRevenueTrends(this.revenueMonths),
      joinTrends: this.dashboardService.getTrends(this.joinsMonths)
    })
      .pipe(
        catchError(() => {
          this.errorMessage = 'Unable to load revenue insights.';
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (!result) {
          this.stats = null;
          this.trends = [];
          this.joinTrends = [];
          this.destroyCharts();
          this.isLoading = false;
          return;
        }

        this.stats = result.stats;
        this.trends = result.trends;
        this.joinTrends = result.joinTrends;
        this.revenueChartNeedsRender = true;
        this.joinsChartNeedsRender = true;
        this.isLoading = false;
      });
  }

  private loadRevenueTrend(): void {
    this.revenueChartLoading = true;
    this.revenueError = '';

    this.dashboardService
      .getRevenueTrends(this.revenueMonths)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (trends) => {
          this.trends = trends;
          this.revenueChartNeedsRender = true;
        },
        error: () => {
          this.revenueError = 'Unable to load revenue trend.';
        },
        complete: () => {
          this.revenueChartLoading = false;
        }
      });
  }

  private loadJoinTrend(): void {
    this.joinsChartLoading = true;
    this.joinsError = '';

    this.dashboardService
      .getTrends(this.joinsMonths)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (trends) => {
          this.joinTrends = trends;
          this.joinsChartNeedsRender = true;
        },
        error: () => {
          this.joinsError = 'Unable to load joins trend.';
        },
        complete: () => {
          this.joinsChartLoading = false;
        }
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

    const revenueLabels = this.trends.map((item) => item.month);
    const revenueData = this.trends.map((item) => Number(item.revenue || 0));

    this.revenueChart = new Chart(this.revenueChartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: revenueLabels,
        datasets: [
          {
            label: 'Revenue (INR)',
            data: revenueData,
            borderColor: '#13a59d',
            backgroundColor: 'rgba(19, 165, 157, 0.15)',
            borderWidth: 3,
            tension: 0.3,
            fill: true,
            pointRadius: 4
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: {
            ticks: { color: '#465d7c' },
            grid: { color: 'rgba(16, 37, 63, 0.08)' }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#465d7c',
              callback: (value) => `INR ${value}`
            },
            grid: { color: 'rgba(16, 37, 63, 0.08)' }
          }
        }
      }
    });
  }

  private renderJoinsChart(): void {
    if (!this.joinsChartCanvas?.nativeElement) {
      return;
    }

    if (this.joinsChart) {
      this.joinsChart.destroy();
      this.joinsChart = null;
    }

    const joinsLabels = this.joinTrends.map((item) => item.month);
    const joinsData = this.joinTrends.map((item) => item.joinCount || 0);

    this.joinsChart = new Chart(this.joinsChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: joinsLabels,
        datasets: [
          {
            label: 'New Joins',
            data: joinsData,
            borderRadius: 6,
            backgroundColor: '#10253f',
            maxBarThickness: 42
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: {
            ticks: { color: '#465d7c' },
            grid: { color: 'rgba(16, 37, 63, 0.08)' }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#465d7c',
              precision: 0
            },
            grid: { color: 'rgba(16, 37, 63, 0.08)' }
          }
        }
      }
    });
  }

  private destroyCharts(): void {
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }

    if (this.joinsChart) {
      this.joinsChart.destroy();
      this.joinsChart = null;
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value ?? 0);
  }
}
