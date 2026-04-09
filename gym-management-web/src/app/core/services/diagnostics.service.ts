import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PATHS } from '../constants/api-paths';
import { buildApiUrl } from '../constants/api-url';
import { environment } from '../../../environments/environment';
import { DbDebugResponse, DbDiagnosticsResponse, HealthResponse } from '../models/diagnostics.models';

@Injectable({ providedIn: 'root' })
export class DiagnosticsService {
  constructor(private readonly http: HttpClient) {}

  getRootStatus(): Observable<unknown> {
    return this.http.get(environment.apiBaseUrl);
  }

  getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${environment.apiBaseUrl}/health`);
  }

  getDbDiagnostics(): Observable<DbDiagnosticsResponse> {
    return this.http.get<DbDiagnosticsResponse>(buildApiUrl(API_PATHS.diagnostics.base, API_PATHS.diagnostics.db));
  }

  getDbDebug(): Observable<DbDebugResponse> {
    return this.http.get<DbDebugResponse>(buildApiUrl(API_PATHS.diagnostics.base, API_PATHS.diagnostics.dbDebug));
  }
}
