import { PagedResponse } from './member.models';

export interface PaymentListQuery {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: 'paymentDate' | 'amount' | 'memberName' | 'paymentMode' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
  memberId?: string;
  searchTerm?: string;
  paymentMode?: 'CASH' | 'UPI' | 'CARD' | '';
  paymentStatus?: 'PAID' | 'PARTIAL' | 'PENDING' | '';
  paymentDate?: string;
  paymentDateFrom?: string;
  paymentDateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface PaymentListItem {
  paymentId: string;
  memberId: string;
  memberName: string;
  memberPhone?: string | null;
  memberProfileImageUrl?: string | null;
  memberJoinDate: string;
  planMonths: number;
  amount: number;
  paymentDate: string;
  paymentMode?: string | null;
  remarks?: string | null;
  memberPaymentStatus: string;
  memberPendingAmount: number;
  createdAt: string;
}

export type PaymentListResponse = PagedResponse<PaymentListItem>;

