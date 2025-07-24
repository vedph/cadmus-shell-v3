import { inject } from '@angular/core';
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

export function editorGuard(
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean {
  const router = inject(Router);
  const authService = inject(AuthJwtService);

  const redirectToLogin = (url: string): void => {
    router.navigate(['/login'], {
      queryParams: {
        returnUrl: url,
      },
    });
  };

  // if not authenticated, redirect to login
  if (!authService.isAuthenticated(false)) {
    redirectToLogin(state.url);
    return false;
  }
  // if authenticated but not verified, redirect to login
  if (!authService.currentUserValue?.emailConfirmed) {
    router.navigate(['/login']);
    console.warn('User not verified');
    return false;
  }
  // else activate only if admin/editor
  const user = authService.currentUserValue;
  const ok = user && user.roles.some((r) => r === 'admin' || r === 'editor');
  if (!ok) {
    console.warn('Unauthorized user');
    return false;
  }
  return true;
}
