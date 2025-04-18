// https://angular.io/docs/ts/latest/guide/router.html
import { Injectable } from '@angular/core';
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

@Injectable({
  providedIn: 'root',
})
export class EditorGuardService {
  constructor(private _router: Router, private _authService: AuthJwtService) {}

  private redirectToLogin(url: string): void {
    this._router.navigate(['/login'], {
      queryParams: {
        returnUrl: url,
      },
    });
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // if not authenticated, redirect to login
    if (!this._authService.isAuthenticated(false)) {
      this.redirectToLogin(state.url);
      return false;
    }
    // if authenticated but not verified, redirect to login
    if (!this._authService.currentUserValue?.emailConfirmed) {
      this._router.navigate(['/login']);
      console.warn('User not verified');
      return false;
    }
    // else activate only if admin/editor
    const user = this._authService.currentUserValue;
    const ok = user && user.roles.some((r) => r === 'admin' || r === 'editor');
    if (!ok) {
      console.warn('Unauthorized user');
      return false;
    }
    return true;
  }
}
