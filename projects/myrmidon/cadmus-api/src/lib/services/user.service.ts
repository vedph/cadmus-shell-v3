import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';

import { DataPage, EnvService, ErrorService } from '@myrmidon/ngx-tools';
import { UserFilter } from '@myrmidon/auth-jwt-admin';

/**
 * A Cadmus user with his roles.
 */
export interface UserWithRoles {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
  };
  roles: string[];
}

/**
 * Cadmus users service.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService,
  ) {}

  public getAllUsers(): Observable<DataPage<UserWithRoles>> {
    return this._http
      .get<DataPage<UserWithRoles>>(this._env.get('apiUrl') + 'users', {
        params: new HttpParams().set('pageNumber', '1'),
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  public getUsers(
    filter: UserFilter,
    pageNumber = 1,
    pageSize = 20,
  ): Observable<DataPage<UserWithRoles>> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageNumber', pageNumber.toString());
    httpParams = httpParams.set('pageSize', pageSize.toString());
    if (filter.name) {
      httpParams = httpParams.set('name', filter.name);
    }

    return this._http
      .get<DataPage<UserWithRoles>>(this._env.get('apiUrl') + 'users', {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the user with the specified name.
   *
   * @param name The user name.
   * @returns Observable with the user, or undefined if not found.
   */
  public getUser(name: string): Observable<UserWithRoles | undefined> {
    return this._http
      .get<UserWithRoles>(
        this._env.get('apiUrl') + 'users/' + encodeURIComponent(name),
      )
      .pipe(retry(3), catchError(this._error.handleError));
  }
}
