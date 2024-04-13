import { Injectable } from '@angular/core';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

@Injectable({
  providedIn: 'root',
})
export class UserLevelService {
  constructor(private _authService: AuthJwtService) {}

  /**
   * Get the authorization level of the current user if any.
   * @returns 4-1 for admin, editor, operator, visitor; else 0.
   */
  public getCurrentUserLevel(): number {
    const user = this._authService.currentUserValue;
    if (!user || !user.roles) {
      return 0;
    }
    if (user.roles.indexOf('admin') > -1) {
      return 4;
    }
    if (user.roles.indexOf('editor') > -1) {
      return 3;
    }
    if (user.roles.indexOf('operator') > -1) {
      return 2;
    }
    if (user.roles.indexOf('visitor') > -1) {
      return 1;
    }
    return 0;
  }
}
