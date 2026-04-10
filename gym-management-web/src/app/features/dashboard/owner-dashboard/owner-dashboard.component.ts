import { AfterViewChecked, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardOverview, MonthlyMemberFlow, MonthlyRevenueTrend } from '../../../core/models/dashboard.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, registerables } from 'chart.js';

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
  private revenueChart: Chart<'line'> | null = null;
  private joinsChart: Chart<'bar'> | null = null;
  private revenueChartNeedsRender = false;
  private joinsChartNeedsRender = false;

  @ViewChild('revenueChartCanvas') revenueChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('joinsChartCanvas') joinsChartCanvas?: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  isRevenueChartLoading = false;
  isJoinsChartLoading = false;
  overview: DashboardOverview | null = null;
  errorMessage = '';

  revenueTrends: MonthlyRevenueTrend[] = [];
  memberFlowTrends: MonthlyMemberFlow[] = [];
  readonly monthOptions = [6, 12, 24] as const;
  revenueMonths: (typeof this.monthOptions)[number] = 6;
  joinsMonths: (typeof this.monthOptions)[number] = 6;
  readonly flowViewOptions = ['BOTH', 'NEW', 'INACTIVE'] as const;
  flowView: (typeof this.flowViewOptions)[number] = 'BOTH';

  readonly cardSkeletons = Array.from({ length: 6 }, (_, index) => index);
  readonly trendSkeletons = Array.from({ length: 6 }, (_, index) => index);
  readonly tableSkeletons = Array.from({ length: 5 }, (_, index) => index);

  constructor(private readonly dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.destroyCharts());
    this.loadDashboardData();
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

  onRevenueRangeChange(value: string): void {
    const parsed = Number(value);
    if (!this.monthOptions.includes(parsed as (typeof this.monthOptions)[number])) {
      return;
    }

    if (this.revenueMonths === parsed) {
      return;
    }

    this.revenueMonths = parsed as (typeof this.monthOptions)[number];
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

  onJoinsRangeChange(value: string): void {
    const parsed = Number(value);
    if (!this.monthOptions.includes(parsed as (typeof this.monthOptions)[number])) {
      return;
    }

    if (this.joinsMonths === parsed) {
      return;
    }

    this.joinsMonths = parsed as (typeof this.monthOptions)[number];
    this.isJoinsChartLoading = true;
    this.dashboardService
      .getMemberFlow(this.joinsMonths)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.memberFlowTrends = data;
          this.joinsChartNeedsRender = true;
          this.isJoinsChartLoading = false;
        },
        error: () => {
          this.isJoinsChartLoading = false;
        }
      });
  }

  onFlowViewChange(value: string): void {
    if (!this.flowViewOptions.includes(value as (typeof this.flowViewOptions)[number])) {
      return;
    }

    this.flowView = value as (typeof this.flowViewOptions)[number];
    this.joinsChartNeedsRender = true;
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      overview: this.dashboardService.getOverview(),
      revenue: this.dashboardService.getRevenueTrends(this.revenueMonths),
      joins: this.dashboardService.getMemberFlow(this.joinsMonths)
    })
      .pipe(
        catchError(() => {
          this.errorMessage = 'Unable to load dashboard data.';
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (!result) {
          this.isLoading = false;
          return;
        }

        this.overview = result.overview;
        this.revenueTrends = result.revenue;
        this.memberFlowTrends = result.joins;
        this.revenueChartNeedsRender = true;
        this.joinsChartNeedsRender = true;
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
      type: 'line',
      data: {
        labels: this.revenueTrends.map((item) => item.month),
        datasets: [
          {
            label: 'Revenue (INR)',
            data: this.revenueTrends.map((item) => Number(item.revenue || 0)),
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
        scales: {
          y: {
            beginAtZero: true
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

    this.joinsChart = new Chart(this.joinsChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.memberFlowTrends.map((item) => item.month),
        datasets: this.buildMemberFlowDatasets()
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
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
        maxBarThickness: 30
      });
    }

    if (this.flowView === 'BOTH' || this.flowView === 'INACTIVE') {
      datasets.push({
        label: 'Inactive Members',
        data: this.memberFlowTrends.map((item) => item.inactiveMembers),
        borderRadius: 6,
        backgroundColor: '#dc2626',
        maxBarThickness: 30
      });
    }

    return datasets;
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
