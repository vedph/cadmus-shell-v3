import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import {
  HistoryFilter,
  HistoryItem,
  HistoryItemInfo,
  HistoryPart,
  HistoryPartInfo,
} from '@myrmidon/cadmus-core';
import { DataPage, EnvService, ErrorService } from '@myrmidon/ngx-tools';

/**
 * The maximum page size accepted by the history API.
 */
export const HISTORY_MAX_PAGE_SIZE = 100;

/**
 * Service for the edit history of items and parts. History is read-only:
 * to restore a version, save it as an item or part with `ItemService`.
 * Each saved state of an item or part is stored in history, so the newest
 * history record is the current state.
 */
@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly _http = inject(HttpClient);
  private readonly _error = inject(ErrorService);
  private readonly _env = inject(EnvService);

  private buildParams(
    filter: HistoryFilter | undefined,
    pageNumber: number,
    pageSize: number,
  ): HttpParams {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set(
        'pageSize',
        Math.min(Math.max(pageSize, 1), HISTORY_MAX_PAGE_SIZE).toString(),
      );
    if (filter?.minModified) {
      params = params.set('minModified', filter.minModified.toISOString());
    }
    if (filter?.maxModified) {
      params = params.set('maxModified', filter.maxModified.toISOString());
    }
    if (filter?.userId) {
      params = params.set('userId', filter.userId);
    }
    if (filter?.status !== undefined && filter?.status !== null) {
      params = params.set('status', filter.status.toString());
    }
    return params;
  }

  /**
   * Get a page of the history of the item with the specified ID, sorted
   * by time (newest first).
   *
   * @param itemId The item's ID.
   * @param filter The optional filter.
   * @param pageNumber The page number (1-N).
   * @param pageSize The page size (1-100).
   * @returns Observable with page.
   */
  public getItemHistory(
    itemId: string,
    filter?: HistoryFilter,
    pageNumber = 1,
    pageSize = 20,
  ): Observable<DataPage<HistoryItemInfo>> {
    return this._http
      .get<DataPage<HistoryItemInfo>>(
        `${this._env.get('apiUrl')}items/${itemId}/history`,
        { params: this.buildParams(filter, pageNumber, pageSize) },
      )
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the history item with the specified ID.
   *
   * @param id The history item's ID (not the item's ID).
   * @returns Observable with history item.
   */
  public getHistoryItem(id: string): Observable<HistoryItem> {
    return this._http
      .get<HistoryItem>(`${this._env.get('apiUrl')}history/items/${id}`)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get a page of the history of the part with the specified ID, sorted
   * by time (newest first).
   *
   * @param partId The part's ID.
   * @param filter The optional filter.
   * @param pageNumber The page number (1-N).
   * @param pageSize The page size (1-100).
   * @returns Observable with page.
   */
  public getPartHistory(
    partId: string,
    filter?: HistoryFilter,
    pageNumber = 1,
    pageSize = 20,
  ): Observable<DataPage<HistoryPartInfo>> {
    return this._http
      .get<DataPage<HistoryPartInfo>>(
        `${this._env.get('apiUrl')}parts/${partId}/history`,
        { params: this.buildParams(filter, pageNumber, pageSize) },
      )
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the history part with the specified ID, with the part as it was
   * saved in its part property.
   *
   * @param id The history part's ID (not the part's ID).
   * @returns Observable with history part.
   */
  public getHistoryPart(id: string): Observable<HistoryPart> {
    return this._http
      .get<HistoryPart>(`${this._env.get('apiUrl')}history/parts/${id}`)
      .pipe(retry(3), catchError(this._error.handleError));
  }
}
