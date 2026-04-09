import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = (route.data['roles'] as UserRole[] | undefined) ?? [];
  if (!authService.getCurrentUser()) {
    return router.createUrlTree(['/login']);
  }

  if (expectedRoles.length === 0 || authService.hasAnyRole(expectedRoles)) {
    return true;
  }

  return router.createUrlTree([authService.resolveDefaultRoute()]);
};
