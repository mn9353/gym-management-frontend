import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_PATHS } from '../constants/api-paths';
import { buildApiUrl } from '../constants/api-url';
import { PaymentListQuery, PaymentListResponse } from '../models/payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private readonly http: HttpClient) {}

  getPayments(query: PaymentListQuery = {}, gymId?: string) {
    let params = new HttpParams();
    const append = (key: string, value: unknown) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, `${value}`);
      }
    };

    append('pageNumber', query.pageNumber);
    append('pageSize', query.pageSize);
    append('sortBy', query.sortBy);
    append('sortDirection', query.sortDirection);
    append('memberId', query.memberId);
    append('searchTerm', query.searchTerm);
    append('paymentMode', query.paymentMode);
    append('paymentStatus', query.paymentStatus);
    append('paymentDate', query.paymentDate);
    append('paymentDateFrom', query.paymentDateFrom);
    append('paymentDateTo', query.paymentDateTo);
    append('amountMin', query.amountMin);
    append('amountMax', query.amountMax);

    if (gymId) {
      params = params.set('gymId', gymId);
    }

    return this.http.get<PaymentListResponse>(
      buildApiUrl(API_PATHS.payments.base, API_PATHS.payments.list),
      { params }
    );
  }
}

