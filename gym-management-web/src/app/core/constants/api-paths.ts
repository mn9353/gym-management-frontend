export const API_PATHS = {
  auth: {
    base: '/api/auth',
    login: '/login',
    forgotPassword: '/forgot-password',
    verifyResetCode: '/verify-reset-code',
    resetPassword: '/reset-password',
    refreshToken: '/refresh-token',
    logout: '/logout',
    me: '/me',
    verify: '/verify'
  },
  dashboard: {
    base: '/api/dashboard',
    overview: '/overview',
    stats: '/stats',
    trends: '/trends',
    revenueTrends: '/revenue-trends',
    memberFlow: '/member-flow',
    recentMembers: '/recent-members',
    weeklyGrowth: '/weekly-growth',
    irregularMembers: '/irregular-members'
  },
  gyms: {
    base: '/api/gyms',
    withOwners: '/with-owners'
  },
  users: {
    base: '/api/users',
    ownerCreate: '/owner'
  },
  members: {
    base: '/api/members',
    search: '/search',
    list: '/list',
    segmentCounts: '/segment-counts',
    upcomingRenewals: '/upcoming-renewals',
    activeList: '/active/list',
    inactiveList: '/inactive/list',
    upcomingRenewalsList: '/upcoming-renewals/list',
    activeGrid: '/active/grid',
    inactiveGrid: '/inactive/grid',
    upcomingRenewalsGrid: '/upcoming-renewals/grid',
    subscriptionReminders: '/subscription-reminders',
    ownerPaymentUpdate: '/owner/payment-update',
    ownerRenew: '/owner/renew'
  },
  payments: {
    base: '/api/payments',
    list: '/list'
  },
  enquiries: {
    base: '/api/enquiries',
    followups: '/followups',
    stage: '/stage'
  },
  memberPortal: {
    base: '/api/member-portal',
    summary: '/summary',
    profile: '/profile',
    weightHistory: '/weight-history',
    metrics: '/metrics',
    attendance: '/attendance',
    missedTrend: '/missed-trend',
    muscleDistribution: '/muscle-distribution',
    restDays: '/rest-days',
    checkinScan: '/checkin/scan',
    checkinWorkout: '/checkin'
  },
  diagnostics: {
    base: '/api/diagnostics',
    db: '/db',
    dbDebug: '/db-debug'
  }
} as const;
