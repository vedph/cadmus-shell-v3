import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import { ErrorService, EnvService } from '@myrmidon/ngx-tools';

/**
 * Result of an object rendition.
 */
export interface RenditionResult {
  result: string;
}

export interface AnnotatedTextRange {
  start: number;
  end: number;
  fragmentIds?: string[];
  text?: string;
}

/**
 * A text span used in rendering.
 */
export interface TextSpan {
  range?: AnnotatedTextRange;
  type?: string;
  isBeforeEol?: boolean;
  text?: string;
  features?: { [key: string]: string };
}

/**
 * Cadmus preview API service.
 */
@Injectable({
  providedIn: 'root',
})
export class PreviewService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService
  ) {}

  // preview/keys
  /**
   * Gets all the Cadmus objects keys registered for preview.
   *
   * @param type A character: J=JSON renderer keys, F=text flattener keys,
   * C=item composer keys. The default is J.
   * @returns List of unique keys.
   */
  public getKeys(type: string): Observable<string[]> {
    const url = this._env.get('apiUrl') + 'preview/keys';
    let httpParams = new HttpParams();
    httpParams = httpParams.set('type', type || 'J');
    return this._http
      .get<string[]>(url, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  // preview/items/{itemId}/parts/{partId}
  /**
   * Render the part with the specified ID.
   *
   * @param itemId The item's ID.
   * @param partId The part's ID.
   * @returns Rendition.
   */
  public renderPart(
    itemId: string,
    partId: string
  ): Observable<RenditionResult> {
    return this._http
      .get<RenditionResult>(
        this._env.get('apiUrl') + `preview/items/${itemId}/parts/${partId}`
      )
      .pipe(retry(3), catchError(this._error.handleError));
  }

  // preview/items/{itemId}parts/{partId}/{frIndex}
  /**
   * Render the fragment at the specified index in the part with the specified
   * ID.
   *
   * @param itemId The item's ID.
   * @param partId The part's ID.
   * @param frIndex The fragment's index (0-N).
   * @returns Rendition.
   */
  public renderFragment(
    itemId: string,
    partId: string,
    frIndex: number
  ): Observable<RenditionResult> {
    return this._http
      .get<RenditionResult>(
        this._env.get('apiUrl') +
          `preview/items/${itemId}/parts/${partId}/${frIndex}`
      )
      .pipe(retry(3), catchError(this._error.handleError));
  }

  // preview/text-parts/{id}
  /**
   * Gets the text spans built by flattening the text part with the
   * specified ID with all the layers specified.
   *
   * @param textPartId The base text part's ID.
   * @param layerPartIds The layer parts IDs.
   */
  public getTextSpans(
    textPartId: string,
    layerPartIds: string[]
  ): Observable<TextSpan[]> {
    let httpParams = new HttpParams();

    if (layerPartIds.length) {
      for (let i = 0; i < layerPartIds.length; i++) {
        let id = layerPartIds[i];
        httpParams = httpParams.append('layerPartId', id);
      }
    }

    return this._http
      .get<TextSpan[]>(
        this._env.get('apiUrl') + `preview/text-parts/${textPartId}`,
        {
          params: httpParams,
        }
      )
      .pipe(retry(3), catchError(this._error.handleError));
  }
}
