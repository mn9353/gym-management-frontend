import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PATHS } from '../constants/api-paths';
import { buildApiUrl } from '../constants/api-url';
import { CreateMemberDto, MemberDto, MemberSearchDto, UpdateMemberDto } from '../models/member.models';

@Injectable({ providedIn: 'root' })
export class MemberService {
  constructor(private readonly http: HttpClient) {}

  getMembers(pageNumber = 1, pageSize = 10, gymId?: string): Observable<MemberDto[]> {
    let params = new HttpParams()
      .set('pageNumber', `${pageNumber}`)
      .set('pageSize', `${pageSize}`);

    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.get<MemberDto[]>(buildApiUrl(API_PATHS.members.base), { params });
  }

  getMember(memberId: string, gymId?: string): Observable<MemberDto> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.get<MemberDto>(buildApiUrl(API_PATHS.members.base, `/${memberId}`), { params });
  }

  createMember(payload: CreateMemberDto, gymId?: string): Observable<MemberDto> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.post<MemberDto>(buildApiUrl(API_PATHS.members.base), payload, { params });
  }

  updateMember(memberId: string, payload: UpdateMemberDto, gymId?: string): Observable<MemberDto> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.put<MemberDto>(buildApiUrl(API_PATHS.members.base, `/${memberId}`), payload, { params });
  }

  deleteMember(memberId: string, gymId?: string): Observable<{ message: string }> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.delete<{ message: string }>(buildApiUrl(API_PATHS.members.base, `/${memberId}`), { params });
  }

  searchMembers(payload: MemberSearchDto, gymId?: string): Observable<MemberDto[]> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.post<MemberDto[]>(buildApiUrl(API_PATHS.members.base, API_PATHS.members.search), payload, { params });
  }
}
