import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent)
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: 'owner',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['OWNER', 'STAFF'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/owner-dashboard/owner-dashboard.component').then((m) => m.OwnerDashboardComponent)
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./features/dashboard/owner-members/owner-members.component').then((m) => m.OwnerMembersComponent)
      },
      {
        path: 'members/add',
        loadComponent: () =>
          import('./features/dashboard/owner-add-member/owner-add-member.component').then((m) => m.OwnerAddMemberComponent)
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./features/dashboard/owner-transactions/owner-transactions.component').then((m) => m.OwnerTransactionsComponent)
      },
      {
        path: 'team',
        loadComponent: () =>
          import('./features/dashboard/owner-team/owner-team.component').then((m) => m.OwnerTeamComponent)
      },
      {
        path: 'enquiries',
        loadComponent: () =>
          import('./features/dashboard/enquiries/enquiries.component').then((m) => m.EnquiriesComponent)
      },
      {
        path: 'revenue',
        loadComponent: () =>
          import('./features/dashboard/owner-revenue/owner-revenue.component').then((m) => m.OwnerRevenueComponent)
      },
      {
        path: 'users/active',
        loadComponent: () =>
          import('./features/dashboard/owner-active-members/owner-active-members.component').then((m) => m.OwnerActiveMembersComponent)
      },
      {
        path: 'users/inactive',
        loadComponent: () =>
          import('./features/dashboard/owner-inactive-members/owner-inactive-members.component').then((m) => m.OwnerInactiveMembersComponent)
      },
      {
        path: 'users/upcoming-renewals',
        loadComponent: () =>
          import('./features/dashboard/owner-upcoming-renewals/owner-upcoming-renewals.component').then((m) => m.OwnerUpcomingRenewalsComponent)
      },
      {
        path: 'members/:status',
        redirectTo: 'members',
        pathMatch: 'full'
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: 'trainer',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['TRAINER'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/trainer-dashboard/trainer-dashboard.component').then((m) => m.TrainerDashboardComponent)
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./features/dashboard/owner-members/owner-members.component').then((m) => m.OwnerMembersComponent)
      },
      {
        path: 'members/add',
        loadComponent: () =>
          import('./features/dashboard/owner-add-member/owner-add-member.component').then((m) => m.OwnerAddMemberComponent)
      },
      {
        path: 'enquiries',
        loadComponent: () =>
          import('./features/dashboard/enquiries/enquiries.component').then((m) => m.EnquiriesComponent)
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: 'member',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['MEMBER'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/member-dashboard/member-dashboard.component').then((m) => m.MemberDashboardComponent)
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
