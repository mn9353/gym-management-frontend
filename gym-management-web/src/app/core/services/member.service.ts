import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PATHS } from '../constants/api-paths';
import { buildApiUrl } from '../constants/api-url';
import {
  AddMemberPaymentDto,
  CreateMemberDto,
  MemberDto,
  MemberRenewalUpdateDto,
  MemberPaymentUpdateDto,
  MemberGridRequest,
  MemberListItem,
  MemberSegmentCounts,
  MemberListQuery,
  OwnerPaymentUpdateDto,
  OwnerRenewMemberDto,
  MemberSearchDto,
  RenewMemberDto,
  PagedResponse,
  UpdateMemberDto
} from '../models/member.models';

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

  renewMember(memberId: string, payload: RenewMemberDto, gymId?: string): Observable<MemberDto> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.post<MemberDto>(
      buildApiUrl(API_PATHS.members.base, `/${memberId}/renew`),
      payload,
      { params }
    );
  }

  addMemberPayment(memberId: string, payload: AddMemberPaymentDto, gymId?: string): Observable<MemberPaymentUpdateDto> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.post<MemberPaymentUpdateDto>(
      buildApiUrl(API_PATHS.members.base, `/${memberId}/payments`),
      payload,
      { params }
    );
  }

  updatePaidAmountWithTransaction(memberId: string, payload: OwnerPaymentUpdateDto, gymId?: string): Observable<MemberPaymentUpdateDto> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.post<MemberPaymentUpdateDto>(
      buildApiUrl(API_PATHS.members.base, `/${memberId}${API_PATHS.members.ownerPaymentUpdate}`),
      payload,
      { params }
    );
  }

  renewMemberWithTransaction(memberId: string, payload: OwnerRenewMemberDto, gymId?: string): Observable<MemberRenewalUpdateDto> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.post<MemberRenewalUpdateDto>(
      buildApiUrl(API_PATHS.members.base, `/${memberId}${API_PATHS.members.ownerRenew}`),
      payload,
      { params }
    );
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

  getUpcomingRenewals(days = 7, limit = 100, skip = 0, gymId?: string): Observable<MemberDto[]> {
    let params = new HttpParams()
      .set('days', `${days}`)
      .set('limit', `${limit}`)
      .set('skip', `${skip}`);

    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.get<MemberDto[]>(
      buildApiUrl(API_PATHS.members.base, API_PATHS.members.upcomingRenewals),
      { params }
    );
  }

  getSegmentCounts(upcomingDays = 7, gymId?: string): Observable<MemberSegmentCounts> {
    let params = new HttpParams().set('upcomingDays', `${upcomingDays}`);
    if (gymId) {
      params = params.set('gymId', gymId);
    }
    return this.http.get<MemberSegmentCounts>(
      buildApiUrl(API_PATHS.members.base, API_PATHS.members.segmentCounts),
      { params }
    );
  }

  getActiveMembersList(query: MemberListQuery = {}, gymId?: string): Observable<PagedResponse<MemberListItem>> {
    return this.http.get<PagedResponse<MemberListItem>>(
      buildApiUrl(API_PATHS.members.base, API_PATHS.members.activeList),
      { params: this.buildMemberListParams(query, gymId) }
    );
  }

  getMembersList(
    query: MemberListQuery = {},
    segment: 'all' | 'active' | 'expiring' | 'inactive' = 'all',
    gymId?: string
  ): Observable<PagedResponse<MemberListItem>> {
    let params = this.buildMemberListParams(query, gymId);
    params = params.set('segment', segment);
    return this.http.get<PagedResponse<MemberListItem>>(
      buildApiUrl(API_PATHS.members.base, API_PATHS.members.list),
      { params }
    );
  }

  getInactiveMembersList(query: MemberListQuery = {}, gymId?: string): Observable<PagedResponse<MemberListItem>> {
    return this.http.get<PagedResponse<MemberListItem>>(
      buildApiUrl(API_PATHS.members.base, API_PATHS.members.inactiveList),
      { params: this.buildMemberListParams(query, gymId) }
    );
  }

  getUpcomingRenewalsList(query: MemberListQuery = {}, gymId?: string): Observable<PagedResponse<MemberListItem>> {
    return this.http.get<PagedResponse<MemberListItem>>(
      buildApiUrl(API_PATHS.members.base, API_PATHS.members.upcomingRenewalsList),
      { params: this.buildMemberListParams(query, gymId) }
    );
  }

  getActiveMembersGrid(payload: MemberGridRequest, gymId?: string): Observable<PagedResponse<MemberListItem>> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }
    return this.http.post<PagedResponse<MemberListItem>>(
      buildApiUrl(API_PATHS.members.base, API_PATHS.members.activeGrid),
      payload,
      { params }
    );
  }

  getInactiveMembersGrid(payload: MemberGridRequest, gymId?: string): Observable<PagedResponse<MemberListItem>> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }
    return this.http.post<PagedResponse<MemberListItem>>(
      buildApiUrl(API_PATHS.members.base, API_PATHS.members.inactiveGrid),
      payload,
      { params }
    );
  }

  getUpcomingRenewalsGrid(payload: MemberGridRequest, gymId?: string): Observable<PagedResponse<MemberListItem>> {
    let params = new HttpParams();
    if (gymId) {
      params = params.set('gymId', gymId);
    }
    return this.http.post<PagedResponse<MemberListItem>>(
      buildApiUrl(API_PATHS.members.base, API_PATHS.members.upcomingRenewalsGrid),
      payload,
      { params }
    );
  }

  private buildMemberListParams(query: MemberListQuery, gymId?: string): HttpParams {
    let params = new HttpParams();
    const appendIfDefined = (key: string, value: unknown) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, `${value}`);
      }
    };

    appendIfDefined('pageNumber', query.pageNumber);
    appendIfDefined('pageSize', query.pageSize);
    appendIfDefined('sortBy', query.sortBy);
    appendIfDefined('sortDirection', query.sortDirection);
    appendIfDefined('includeAmount', query.includeAmount);
    appendIfDefined('upcomingDays', query.upcomingDays);
    appendIfDefined('searchTerm', query.searchTerm);
    appendIfDefined('fullName', query.fullName);
    appendIfDefined('phone', query.phone);
    appendIfDefined('email', query.email);
    appendIfDefined('gender', query.gender);
    appendIfDefined('paymentStatus', query.paymentStatus);
    appendIfDefined('membershipType', query.membershipType);
    appendIfDefined('trainerAssigned', query.trainerAssigned);
    appendIfDefined('leadSource', query.leadSource);
    appendIfDefined('joinDateFrom', query.joinDateFrom);
    appendIfDefined('joinDateTo', query.joinDateTo);
    appendIfDefined('planStartDate', query.planStartDate);
    appendIfDefined('planStartDateFrom', query.planStartDateFrom);
    appendIfDefined('planStartDateTo', query.planStartDateTo);
    appendIfDefined('planEndDate', query.planEndDate);
    appendIfDefined('planEndDateFrom', query.planEndDateFrom);
    appendIfDefined('planEndDateTo', query.planEndDateTo);
    appendIfDefined('amountPaidMin', query.amountPaidMin);
    appendIfDefined('amountPaidMax', query.amountPaidMax);
    appendIfDefined('amountToPayMin', query.amountToPayMin);
    appendIfDefined('amountToPayMax', query.amountToPayMax);

    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return params;
  }
}
