export const API_PATHS = {
  auth: {
    base: '/api/auth',
    login: '/login',
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
    weeklyGrowth: '/weekly-growth'
  },
  gyms: {
    base: '/api/gyms'
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
    ownerPaymentUpdate: '/owner/payment-update',
    ownerRenew: '/owner/renew'
  },
  payments: {
    base: '/api/payments',
    list: '/list'
  },
  diagnostics: {
    base: '/api/diagnostics',
    db: '/db',
    dbDebug: '/db-debug'
  }
} as const;
