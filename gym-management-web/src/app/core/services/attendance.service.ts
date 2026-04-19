import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { buildApiUrl } from '../constants/api-url';

export interface MarkAttendanceDto {
  gymId: string;
  identifier: string;
}

export interface AttendanceResult {
  success: boolean;
  message: string;
  memberName?: string;
  checkinAt?: string;
  profileImageUrl?: string;
}

export interface MemberAttendance {
  id: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  checkinAt: string;
  source: string;
  profileImageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly baseUrl = 'attendance';

  constructor(private http: HttpClient) {}

  markAttendance(dto: MarkAttendanceDto): Observable<AttendanceResult> {
    return this.http.post<AttendanceResult>(buildApiUrl(this.baseUrl, 'mark'), dto);
  }

  getTodayAttendance(gymId: string): Observable<MemberAttendance[]> {
    return this.http.get<MemberAttendance[]>(buildApiUrl(this.baseUrl, `today/${gymId}`));
  }
}
