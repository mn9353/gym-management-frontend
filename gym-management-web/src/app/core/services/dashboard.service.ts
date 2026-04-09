import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardOverview, DashboardStats, MonthlyJoinTrend, MonthlyRevenueTrend, RecentMember } from '../models/dashboard.models';
import { API_PATHS } from '../constants/api-paths';
import { buildApiUrl } from '../constants/api-url';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly http: HttpClient) {}

  getOverview(gymId?: string): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(buildApiUrl(API_PATHS.dashboard.base, API_PATHS.dashboard.overview), {
      params: this.buildParams(gymId)
    });
  }

  getStats(gymId?: string): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(buildApiUrl(API_PATHS.dashboard.base, API_PATHS.dashboard.stats), {
      params: this.buildParams(gymId)
    });
  }

  getTrends(months = 6, gymId?: string): Observable<MonthlyJoinTrend[]> {
    let params = this.buildParams(gymId).set('months', `${months}`);
    return this.http.get<MonthlyJoinTrend[]>(buildApiUrl(API_PATHS.dashboard.base, API_PATHS.dashboard.trends), { params });
  }

  getRevenueTrends(months = 6, gymId?: string): Observable<MonthlyRevenueTrend[]> {
    let params = this.buildParams(gymId).set('months', `${months}`);
    return this.http.get<MonthlyRevenueTrend[]>(
      buildApiUrl(API_PATHS.dashboard.base, API_PATHS.dashboard.revenueTrends),
      { params }
    );
  }

  getRecentMembers(limit = 5, gymId?: string): Observable<RecentMember[]> {
    let params = this.buildParams(gymId).set('limit', `${limit}`);
    return this.http.get<RecentMember[]>(
      buildApiUrl(API_PATHS.dashboard.base, API_PATHS.dashboard.recentMembers),
      { params }
    );
  }

  private buildParams(gymId?: string): HttpParams {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }
    return params;
  }
}
