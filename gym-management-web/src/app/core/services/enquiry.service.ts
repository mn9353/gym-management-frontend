import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PATHS } from '../constants/api-paths';
import { buildApiUrl } from '../constants/api-url';
import {
  AddEnquiryFollowupDto,
  CreateEnquiryDto,
  EnquiryDetails,
  EnquiryListItem,
  EnquiryListQuery,
  PagedResponse,
  UpdateEnquiryStageDto
} from '../models/enquiry.models';

@Injectable({ providedIn: 'root' })
export class EnquiryService {
  constructor(private readonly http: HttpClient) {}

  getEnquiries(query: EnquiryListQuery): Observable<PagedResponse<EnquiryListItem>> {
    let params = new HttpParams();
    if (query.pageNumber) params = params.set('pageNumber', query.pageNumber);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.searchTerm) params = params.set('searchTerm', query.searchTerm);
    if (query.stage) params = params.set('stage', query.stage);
    if (query.nextFollowupFrom) params = params.set('nextFollowupFrom', query.nextFollowupFrom);
    if (query.nextFollowupTo) params = params.set('nextFollowupTo', query.nextFollowupTo);

    return this.http.get<PagedResponse<EnquiryListItem>>(buildApiUrl(API_PATHS.enquiries.base), { params });
  }

  getEnquiry(id: string): Observable<EnquiryDetails> {
    return this.http.get<EnquiryDetails>(buildApiUrl(API_PATHS.enquiries.base, `/${id}`));
  }

  createEnquiry(payload: CreateEnquiryDto): Observable<EnquiryDetails> {
    return this.http.post<EnquiryDetails>(buildApiUrl(API_PATHS.enquiries.base), payload);
  }

  addFollowup(id: string, payload: AddEnquiryFollowupDto): Observable<EnquiryDetails> {
    return this.http.post<EnquiryDetails>(buildApiUrl(API_PATHS.enquiries.base, `/${id}${API_PATHS.enquiries.followups}`), payload);
  }

  updateStage(id: string, payload: UpdateEnquiryStageDto): Observable<EnquiryDetails> {
    return this.http.patch<EnquiryDetails>(buildApiUrl(API_PATHS.enquiries.base, `/${id}${API_PATHS.enquiries.stage}`), payload);
  }
}
