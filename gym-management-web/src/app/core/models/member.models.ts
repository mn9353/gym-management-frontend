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
