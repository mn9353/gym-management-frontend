export interface MemberDto {
  id: string;
  gymId: string;
  fullName: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  joinDate: string;
  planStartDate: string;
  planEndDate: string;
  lastPaymentDate?: string | null;
  membershipType?: string | null;
  amountPaid?: number | null;
  paymentStatus: string;
  status: string;
  notes?: string | null;
  emergencyContact?: string | null;
  height?: number | null;
  weight?: number | null;
  fitnessGoal?: string | null;
  trainerAssigned?: string | null;
  leadSource?: string | null;
  profileImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberDto {
  fullName: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  joinDate: string;
  planStartDate: string;
  planEndDate: string;
  membershipType?: string | null;
  amountPaid?: number | null;
  paymentStatus?: string;
  emergencyContact?: string | null;
  height?: number | null;
  weight?: number | null;
  fitnessGoal?: string | null;
  trainerAssigned?: string | null;
  leadSource?: string | null;
  notes?: string | null;
}

export interface UpdateMemberDto {
  fullName?: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  planEndDate?: string;
  membershipType?: string | null;
  amountPaid?: number | null;
  paymentStatus?: string;
  status?: string;
  emergencyContact?: string | null;
  height?: number | null;
  weight?: number | null;
  fitnessGoal?: string | null;
  trainerAssigned?: string | null;
  notes?: string | null;
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
  sortBy?: 'planEndDate' | 'planStartDate' | 'joinDate' | 'name' | 'phone' | 'amountPaid' | 'status';
  sortDirection?: 'asc' | 'desc';
  includeAmount?: boolean;
  upcomingDays?: number;
  searchTerm?: string;
  fullName?: string;
  phone?: string;
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
}

export interface MemberListItem {
  id: string;
  fullName: string;
  phone?: string | null;
  gender?: string | null;
  joinDate: string;
  planStartDate: string;
  planEndDate: string;
  status: string;
  paymentStatus: string;
  membershipType?: string | null;
  trainerAssigned?: string | null;
  amountPaid?: number | null;
}

export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
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
