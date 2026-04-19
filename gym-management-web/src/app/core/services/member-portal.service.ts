import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PATHS } from '../constants/api-paths';
import { buildApiUrl } from '../constants/api-url';
import {
  MemberAttendanceSummary,
  MemberCheckinResult,
  MemberCheckinScanRequest,
  MemberMissedTrendPoint,
  MemberMuscleDistribution,
  MemberMetricUpdateRequest,
  MemberPortalSummary,
  MemberProfileUpdateRequest,
  MemberRestDay,
  MemberRestDayRequest,
  MemberWeightPoint,
  MemberWorkoutLogRequest
} from '../models/member-portal.models';

@Injectable({ providedIn: 'root' })
export class MemberPortalService {
  constructor(private readonly http: HttpClient) {}

  getSummary(): Observable<MemberPortalSummary> {
    return this.http.get<MemberPortalSummary>(buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.summary));
  }

  getWeightHistory(months = 6): Observable<MemberWeightPoint[]> {
    const params = new HttpParams().set('months', `${months}`);
    return this.http.get<MemberWeightPoint[]>(
      buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.weightHistory),
      { params }
    );
  }

  updateMetrics(payload: MemberMetricUpdateRequest): Observable<MemberPortalSummary> {
    return this.http.post<MemberPortalSummary>(
      buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.metrics),
      payload
    );
  }

  updateProfile(payload: MemberProfileUpdateRequest): Observable<MemberPortalSummary> {
    return this.http.patch<MemberPortalSummary>(
      buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.profile),
      payload
    );
  }

  getAttendance(months = 3, limit = 45): Observable<MemberAttendanceSummary> {
    const params = new HttpParams().set('months', `${months}`).set('limit', `${limit}`);
    return this.http.get<MemberAttendanceSummary>(
      buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.attendance),
      { params }
    );
  }

  getMissedTrend(weeks = 6): Observable<MemberMissedTrendPoint[]> {
    const params = new HttpParams().set('weeks', `${weeks}`);
    return this.http.get<MemberMissedTrendPoint[]>(
      buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.missedTrend),
      { params }
    );
  }

  getMuscleDistribution(months = 1): Observable<MemberMuscleDistribution[]> {
    const params = new HttpParams().set('months', `${months}`);
    return this.http.get<MemberMuscleDistribution[]>(
      buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.muscleDistribution),
      { params }
    );
  }

  checkinByQr(payload: MemberCheckinScanRequest): Observable<MemberCheckinResult> {
    return this.http.post<MemberCheckinResult>(
      buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.checkinScan),
      payload
    );
  }

  addWorkout(checkinId: string, payload: MemberWorkoutLogRequest): Observable<MemberCheckinResult> {
    return this.http.post<MemberCheckinResult>(
      buildApiUrl(API_PATHS.memberPortal.base, `${API_PATHS.memberPortal.checkinWorkout}/${checkinId}/workout`),
      payload
    );
  }

  getRestDays(months = 3): Observable<MemberRestDay[]> {
    const params = new HttpParams().set('months', `${months}`);
    return this.http.get<MemberRestDay[]>(
      buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.restDays),
      { params }
    );
  }

  addRestDay(payload: MemberRestDayRequest): Observable<MemberRestDay> {
    return this.http.post<MemberRestDay>(
      buildApiUrl(API_PATHS.memberPortal.base, API_PATHS.memberPortal.restDays),
      payload
    );
  }
}
