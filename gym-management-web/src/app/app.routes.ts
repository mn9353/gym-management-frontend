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
        path: 'revenue',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'members/:status',
        loadComponent: () =>
          import('./features/dashboard/owner-members/owner-members.component').then((m) => m.OwnerMembersComponent)
      },
      {
        path: 'team',
        loadComponent: () =>
          import('./features/dashboard/owner-team/owner-team.component').then((m) => m.OwnerTeamComponent)
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
