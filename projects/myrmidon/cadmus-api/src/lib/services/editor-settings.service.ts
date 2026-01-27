import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { ErrorService, EnvService } from '@myrmidon/ngx-tools';
import { catchError, Observable, retry } from 'rxjs';

/**
 * Editor settings service. These settings are stored server-side.
 */
@Injectable({
  providedIn: 'root',
})
export class EditorSettingsService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService,
  ) {}

  /**
   * Get the setting with the specified ID.
   * @param id The setting's ID.
   */
  public getSetting<T>(id: string): Observable<T> {
    return this._http
      .get<T>(`${this._env.get('apiUrl')}settings/${id}`)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Add or update the setting with the specified ID.
   * @param id The setting's ID.
   * @param setting The setting object to add.
   */
  public addSetting<T>(id: string, setting: T): Observable<T> {
    return this._http
      .post<T>(`${this._env.get('apiUrl')}settings/${id}`, setting)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Delete the setting with the specified ID.
   * @param id The setting's ID.
   */
  public deleteSetting(id: string): Observable<any> {
    return this._http
      .delete<any>(`${this._env.get('apiUrl')}settings/${id}`)
      .pipe(retry(3), catchError(this._error.handleError));
  }
}
