import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, retry } from 'rxjs';

import { ErrorService, EnvService } from '@myrmidon/ngx-tools';

export interface ItemEditFrameStats {
  start?: Date;
  end?: Date;
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService
  ) {}

  public getEditFrameStats(
    start: Date | string,
    end: Date | string,
    interval: string,
    frameLimit = 0
  ): Observable<ItemEditFrameStats[]> {
    // ensure we have proper Date objects for ISO string conversion
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);

    // construct the URL with query parameters
    // - start and end are dates, so we need to format them
    // - interval is N + unit (e.g., "1d", "1h", "1m")
    const url =
      `${this._env.get('apiUrl')}stats/edit-frames` +
      `?start=${startDate.toISOString()}&end=${endDate.toISOString()}` +
      `&interval=${interval}&frameLimit=${frameLimit}`;

    return this._http
      .get<ItemEditFrameStats[]>(url)
      .pipe(retry(3), catchError(this._error.handleError));
  }
}
