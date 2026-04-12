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
        path: 'users/active',
        redirectTo: 'members',
        pathMatch: 'full'
      },
      {
        path: 'users/inactive',
        redirectTo: 'members',
        pathMatch: 'full'
      },
      {
        path: 'users/upcoming-renewals',
        redirectTo: 'members',
        pathMatch: 'full'
      },
      {
        path: 'members/:status',
        redirectTo: 'members',
        pathMatch: 'full'
      },
      {
        path: 'team',
        redirectTo: 'dashboard',
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
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
