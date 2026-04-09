import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardStats, MonthlyRevenueTrend } from '../../../core/models/dashboard.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';

@Component({
  selector: 'app-owner-revenue',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './owner-revenue.component.html',
  styleUrl: './owner-revenue.component.css'
})
export class OwnerRevenueComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  stats: DashboardStats | null = null;
  trends: MonthlyRevenueTrend[] = [];
  readonly monthOptions = [3, 6, 12, 24];
  selectedMonths = 6;

  constructor(private readonly dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadData();
  }

  onRangeChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return;
    }

    this.selectedMonths = parsed;
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      stats: this.dashboardService.getStats(),
      trends: this.dashboardService.getRevenueTrends(this.selectedMonths)
    }).subscribe({
      next: ({ stats, trends }) => {
        this.stats = stats;
        this.trends = trends;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load revenue insights.';
        this.isLoading = false;
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value ?? 0);
  }
}
