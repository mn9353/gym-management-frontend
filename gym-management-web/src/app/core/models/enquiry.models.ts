export interface EnquiryListQuery {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  stage?: string;
  nextFollowupFrom?: string;
  nextFollowupTo?: string;
}

export interface EnquiryListItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  stage: string;
  nextFollowupAt?: string | null;
  interestedServiceTypeId?: string | null;
  assignedToUserId?: string | null;
  followupCount: number;
  createdAt: string;
}

export interface EnquiryTimelineItem {
  type: 'FOLLOWUP' | 'STAGE';
  at: string;
  outcome?: string | null;
  notes?: string | null;
  fromStage?: string | null;
  toStage?: string | null;
  actorUserId: string;
}

export interface EnquiryDetails extends EnquiryListItem {
  notes?: string | null;
  convertedMemberId?: string | null;
  timeline: EnquiryTimelineItem[];
}

export interface CreateEnquiryDto {
  fullName: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  interestedServiceTypeId?: string | null;
  nextFollowupAt?: string | null;
  assignedToUserId?: string | null;
  notes?: string | null;
}

export interface AddEnquiryFollowupDto {
  followupAt?: string | null;
  nextFollowupAt?: string | null;
  outcome?: string | null;
  notes?: string | null;
}

export interface UpdateEnquiryStageDto {
  toStage: string;
  reason?: string | null;
}

export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
