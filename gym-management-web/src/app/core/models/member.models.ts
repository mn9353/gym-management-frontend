export interface MemberDto {
  id: string;
  gymId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  joinDate: string;
  planStartDate: string;
  planEndDate: string;
  lastPaymentDate?: string | null;
  membershipType?: string | null;
  trainingType?: string | null;
  amountPaid?: number | null;
  amountToPay?: number | null;
  paymentStatus: string;
  status: string;
  notes?: string | null;
  emergencyContact?: string | null;
  height?: number | null;
  weight?: number | null;
  targetWeight?: number | null;
  fitnessGoal?: string | null;
  trainerAssigned?: string | null;
  leadSource?: string | null;
  profileImageUrl?: string | null;
  welcomeEmailSent?: boolean | null;
  welcomeEmailMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberDto {
  fullName: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  joinDate: string;
  planStartDate: string;
  planEndDate?: string;
  planDurationMonths?: number;
  membershipType?: string | null;
  trainingType?: 'GENERAL' | 'PERSONAL' | 'HYBRID' | null;
  amountPaid?: number | null;
  amountToPay?: number | null;
  paymentStatus?: string;
  paymentMode?: 'CASH' | 'UPI' | 'CARD' | null;
  emergencyContact?: string | null;
  height?: number | null;
  weight?: number | null;
  targetWeight?: number | null;
  fitnessGoal?: string | null;
  trainerAssigned?: string | null;
  leadSource?: string | null;
  notes?: string | null;
  profileImageUrl?: string | null;
}

export interface RenewMemberDto {
  planStartDate: string;
  planDurationMonths: number;
  amountPaid?: number | null;
  amountToPay?: number | null;
  paymentStatus?: string;
  paymentDate?: string;
  paymentMode?: string | null;
  remarks?: string | null;
}

export interface ExistingMemberSummary {
  id: string;
  fullName: string;
  phone?: string | null;
  planStartDate: string;
  planEndDate: string;
  status: string;
  membershipType?: string | null;
}

export interface UpdateMemberDto {
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  planEndDate?: string;
  membershipType?: string | null;
  trainingType?: 'GENERAL' | 'PERSONAL' | 'HYBRID' | null;
  amountPaid?: number | null;
  amountToPay?: number | null;
  paymentStatus?: string;
  status?: string;
  emergencyContact?: string | null;
  height?: number | null;
  weight?: number | null;
  targetWeight?: number | null;
  fitnessGoal?: string | null;
  trainerAssigned?: string | null;
  notes?: string | null;
  profileImageUrl?: string | null;
}

export interface MemberSearchDto {
  searchTerm?: string;
  status?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface MemberListQuery {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: 'planEndDate' | 'planStartDate' | 'joinDate' | 'name' | 'phone' | 'email' | 'amountPaid' | 'status';
  sortDirection?: 'asc' | 'desc';
  includeAmount?: boolean;
  upcomingDays?: number;
  searchTerm?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  gender?: string;
  paymentStatus?: string;
  membershipType?: string;
  trainerAssigned?: string;
  leadSource?: string;
  joinDateFrom?: string;
  joinDateTo?: string;
  planStartDate?: string;
  planStartDateFrom?: string;
  planStartDateTo?: string;
  planEndDate?: string;
  planEndDateFrom?: string;
  planEndDateTo?: string;
  amountPaidMin?: number;
  amountPaidMax?: number;
  amountToPayMin?: number;
  amountToPayMax?: number;
}

export interface MemberListItem {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
  gender?: string | null;
  joinDate: string;
  planStartDate: string;
  planEndDate: string;
  status: string;
  paymentStatus: string;
  membershipType?: string | null;
  trainerAssigned?: string | null;
  amountPaid?: number | null;
  amountToPay?: number | null;
}

export interface AddMemberPaymentDto {
  amount: number;
  paymentDate?: string;
  paymentMode?: 'CASH' | 'UPI' | 'CARD' | null;
  remarks?: string | null;
}

export interface PaymentTransactionDto {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMode?: string | null;
  remarks?: string | null;
  createdAt: string;
}

export interface MemberPaymentUpdateDto {
  memberId: string;
  amountPaid: number;
  amountToPay: number;
  pendingAmount: number;
  paymentStatus: string;
  lastPaymentDate?: string | null;
  payment?: PaymentTransactionDto | null;
}

export interface OwnerPaymentUpdateDto {
  amountPaidNow: number;
  paymentDate?: string;
  paymentMode?: 'CASH' | 'UPI' | 'CARD' | null;
  remarks?: string | null;
}

export interface OwnerRenewMemberDto {
  planStartDate: string;
  planDurationMonths: number;
  amountToPayIncrement: number;
  amountPaidNow: number;
  paymentDate?: string;
  paymentMode?: 'CASH' | 'UPI' | 'CARD' | null;
  remarks?: string | null;
}

export interface MemberRenewalUpdateDto {
  memberId: string;
  planStartDate: string;
  planEndDate: string;
  membershipType?: string | null;
  amountPaid: number;
  amountToPay: number;
  pendingAmount: number;
  paymentStatus: string;
  lastPaymentDate?: string | null;
  payment?: PaymentTransactionDto | null;
}

export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  totalPendingAmount?: number;
}

export interface MemberSegmentCounts {
  all: number;
  active: number;
  expiring: number;
  inactive: number;
}

export interface MemberGridSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface MemberGridRequest {
  filters?: Record<string, unknown>;
  sort?: MemberGridSort | null;
  searchText?: string;
  pageNumber?: number;
  pageSize?: number;
  includeAmount?: boolean;
  upcomingDays?: number;
}

export interface SendSubscriptionReminderRequest {
  selectAll: boolean;
  memberIds: string[];
  stage: 'AUTO' | 'EXPIRING' | 'INACTIVE';
  segment: 'all' | 'active' | 'expiring' | 'inactive' | 'upcoming';
  filters: MemberListQuery;
}

export interface SubscriptionReminderDispatchResult {
  stage: string;
  selectAll: boolean;
  requestedCount: number;
  matchedCount: number;
  sentCount: number;
  failedCount: number;
  skippedNoEmailCount: number;
  skippedAlreadySentCount: number;
  errorMessages: string[];
}
