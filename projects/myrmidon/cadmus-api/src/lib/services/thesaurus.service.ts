import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry, catchError, take } from 'rxjs/operators';

import { Thesaurus, ThesauriSet, ThesaurusFilter } from '@myrmidon/cadmus-core';
import { DataPage, EnvService, ErrorService } from '@myrmidon/ngx-tools';

@Injectable({ providedIn: 'root' })
export class ThesaurusService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService
  ) {}

  private getFilterParams(
    pageNumber: number,
    pageSize: number,
    filter?: ThesaurusFilter
  ): HttpParams {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageNumber', pageNumber.toString());
    httpParams = httpParams.set('pageSize', pageSize.toString());
    if (filter?.id) {
      httpParams = httpParams.set('id', filter.id);
    }
    if (filter?.language) {
      httpParams = httpParams.set('language', filter.language);
    }
    if (filter?.isAlias === false || filter?.isAlias === true) {
      httpParams = httpParams.set(
        'isAlias',
        filter.isAlias === true ? 'true' : 'false'
      );
    }
    return httpParams;
  }

  /**
   * Get the list of thesauri IDs.
   * @param filter The optional filter to use (page size can be 0 to get
   * all the IDs at once).
   * @returns Array of IDs.
   */
  public getThesaurusIds(
    filter?: ThesaurusFilter,
    pageNumber = 1,
    pageSize = 20
  ): Observable<string[]> {
    const url = `${this._env.get('apiUrl')}thesauri-ids`;

    if (!filter) {
      return this._http
        .get<string[]>(url)
        .pipe(retry(3), catchError(this._error.handleError));
    } else {
      let httpParams = this.getFilterParams(pageNumber, pageSize, filter);
      return this._http
        .get<string[]>(url, {
          params: httpParams,
        })
        .pipe(retry(3), catchError(this._error.handleError));
    }
  }

  /**
   * Check whether a thesaurus with the specified ID exists.
   *
   * @param id The ID of the thesaurus to check for.
   * @returns Promise having true/false on resolution.
   */
  public thesaurusExists(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let httpParams = new HttpParams();
      httpParams = httpParams.set('pageNumber', '1');
      httpParams = httpParams.set('pageSize', '1');
      httpParams = httpParams.set('id', id);

      this._http
        .get<string[]>(`${this._env.get('apiUrl')}thesauri-ids`, {
          params: httpParams,
        })
        .pipe(retry(3), take(1), catchError(this._error.handleError))
        .subscribe({
          next: (ids) => {
            resolve(ids.length > 0);
          },
          error: (_) => {
            console.error('Error checking for existence of thesaurus ' + id);
            reject(false);
          },
        });
    });
  }

  /**
   * Gets the tags set with the specified ID.
   * @param id string The tag set ID.
   * @param emptyIfNotFound True to return an empty thesaurus when the requested
   * thesaurus ID is not found, rather than getting a 404.
   * @returns Tag set.
   */
  public getThesaurus(
    id: string,
    emptyIfNotFound = false
  ): Observable<Thesaurus> {
    let httpParams = new HttpParams();
    if (emptyIfNotFound) {
      httpParams = httpParams.set('emptyIfNotFound', true.toString());
    }
    const url = `${this._env.get('apiUrl')}thesauri/${encodeURIComponent(id)}`;
    return this._http
      .get<Thesaurus>(url, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the requested thesauri in a batch.
   * @param ids The IDs of the requested thesauri.
   * @returns An object where each key is the purged thesaurus ID with value
   * equal to the thesaurus model.
   */
  public getThesauriSet(ids: string[]): Observable<ThesauriSet> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('purgeIds', 'true');
    httpParams = httpParams.set('ids', ids.join(','));
    return this._http
      .get<ThesauriSet>(`${this._env.get('apiUrl')}thesauri-set`, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get a page of thesauri.
   *
   * @param filter The filter.
   */
  public getThesauri(
    filter: ThesaurusFilter,
    pageNumber = 1,
    pageSize = 20
  ): Observable<DataPage<Thesaurus>> {
    let httpParams = this.getFilterParams(pageNumber, pageSize, filter);

    return this._http
      .get<DataPage<Thesaurus>>(`${this._env.get('apiUrl')}thesauri`, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Add or update the specified thesaurus.
   *
   * @param thesaurus The thesaurus.
   */
  public addThesaurus(thesaurus: Thesaurus): Observable<any> {
    return this._http
      .post(`${this._env.get('apiUrl')}thesauri`, thesaurus)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Delete the specified thesaurus.
   *
   * @param id The thesaurus ID.
   */
  public deleteThesaurus(id: string): Observable<any> {
    return this._http
      .delete<Thesaurus>(`${this._env.get('apiUrl')}thesauri/${id}`)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the thesaurus scoped ID from the corresponding non-scoped thesaurus ID
   * and the specified scope ID. This just suffixes the thesaurus ID with
   * the scope ID prefixed by a dot, before the language ID. For instance,
   * a thesaurus ID "witnesses@en" with a scope ID "lucr" would become
   * "witnesses.lucr@en". If the thesaurus ID starts with an exclamation mark,
   * which means that it must not be scoped, this function will return it
   * without the leading mark.
   *
   * @param id The thesaurus ID.
   * @param scopeId The scope ID, or undefined when you just want to strip off
   * the leading exclamation mark if any.
   */
  public getScopedId(id: string, scopeId?: string): string {
    // an ID starting with ! should not be scoped
    if (id.startsWith('!')) {
      return id.substring(1);
    }
    // just ret the ID if we were just requested to strip the initial !
    if (!scopeId) {
      return id;
    }

    const i = id.lastIndexOf('@');
    if (i === -1) {
      return id + '.' + scopeId;
    }
    return id.substring(0, i) + '.' + scopeId + id.substring(i);
  }

  /**
   * Get the unscoped thesaurus ID from the specified ID, also stripping
   * any language suffix off and any leading "!". For instance, an ID like
   * "apparatus-witnesses.verg-eclo@en" becomes "apparatus-witnesses".
   *
   * @param id The thesaurus ID.
   */
  public getUnscopedId(id: string): string {
    if (id.startsWith('!')) {
      id = id.substring(1);
    }
    let i = id.lastIndexOf('.');
    if (i > 0) {
      id = id.substring(0, i);
    }

    i = id.lastIndexOf('@');
    if (i > -1) {
      id = id.substring(0, i);
    }
    return id;
  }
}
