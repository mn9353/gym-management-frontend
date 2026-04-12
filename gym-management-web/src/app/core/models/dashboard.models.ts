export interface DashboardStats {
  totalActiveMembers: number;
  totalActiveMembersLastMonth: number;
  newJoinsThisMonth: number;
  newJoinsLastMonth: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  pendingAmountTotal: number;
  expiringInNext7Days: number;
  expiringThisMonth: number;
  expiredMembers: number;
  inactiveThisMonth: number;
}

export interface MonthlyJoinTrend {
  month: string;
  joinCount: number;
}

export interface MonthlyRevenueTrend {
  month: string;
  revenue: number;
}

export interface MonthlyMemberFlow {
  month: string;
  newJoinees: number;
  inactiveMembers: number;
}

export interface RecentMember {
  id: string;
  fullName: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  joinDate: string;
  planStartDate: string;
  planEndDate: string;
  status: string;
  membershipType?: string | null;
  amountPaid?: number | null;
}

export interface WeeklyMemberGrowth {
  week: string;
  newJoinees: number;
  inactiveMembers: number;
}

export interface DashboardOverview {
  stats: DashboardStats;
  monthlyTrends: MonthlyJoinTrend[];
  recentMembers: RecentMember[];
}
