export interface DashboardStats {
  totalActiveMembers: number;
  newJoinsThisMonth: number;
  newJoinsLastMonth: number;
  revenueThisMonth: number;
  expiringInNext7Days: number;
  expiredMembers: number;
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
  joinDate: string;
  planEndDate: string;
  status: string;
  membershipType?: string | null;
}

export interface DashboardOverview {
  stats: DashboardStats;
  monthlyTrends: MonthlyJoinTrend[];
  recentMembers: RecentMember[];
}
