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
    recentMembers: '/recent-members'
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
    search: '/search'
  },
  diagnostics: {
    base: '/api/diagnostics',
    db: '/db',
    dbDebug: '/db-debug'
  }
} as const;
