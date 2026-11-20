import { inject, Injectable } from '@angular/core';
import {
  catchError,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';

import { Thesaurus, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusService } from '@myrmidon/cadmus-api';
import { TaxoStoreService } from '@myrmidon/taxo-store-api';

/**
 * Service used by thesaurus-or-taxonomy pickers to get their data from
 * the backend. Responses are cached, so that many pickers bound to the
 * same source (e.g. in a list of entries) share a single request.
 * Failed requests are not cached, so that they can be retried later.
 */
@Injectable({ providedIn: 'root' })
export class ThesOrTaxoSourceService {
  private readonly _thesService = inject(ThesaurusService);
  private readonly _taxoService = inject(TaxoStoreService);

  private readonly _thesauri = new Map<string, Observable<ThesaurusEntry[]>>();
  private readonly _labels = new Map<string, Observable<string | null>>();

  /**
   * Get the entries of the thesaurus with the specified ID. When the
   * thesaurus is an alias (i.e. it has a target ID and no entries), the
   * entries of its target are returned. When the thesaurus does not exist,
   * or an error occurs, an empty array is returned.
   * @param id The thesaurus ID, e.g. `event-types@en`.
   * @returns Observable of the thesaurus entries.
   */
  public getThesaurusEntries(id: string): Observable<ThesaurusEntry[]> {
    const cached = this._thesauri.get(id);
    if (cached) {
      return cached;
    }

    const entries$ = this._thesService.getThesaurus(id, true).pipe(
      switchMap((t: Thesaurus) =>
        !t?.entries?.length && t?.targetId && t.targetId !== id
          ? this._thesService.getThesaurus(t.targetId, true)
          : of(t),
      ),
      map((t) => t?.entries ?? []),
      catchError((error) => {
        console.error(`Error loading thesaurus "${id}"`, error);
        this._thesauri.delete(id);
        return of([] as ThesaurusEntry[]);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this._thesauri.set(id, entries$);
    return entries$;
  }

  /**
   * Get the label of the node with the specified key in the specified
   * taxonomy tree.
   * @param treeId The tree ID.
   * @param key The node key.
   * @returns Observable of the node label, or null if not found.
   */
  public getTaxoNodeLabel(
    treeId: string,
    key: string,
  ): Observable<string | null> {
    const cacheKey = `${treeId}\u0001${key}`;
    const cached = this._labels.get(cacheKey);
    if (cached) {
      return cached;
    }

    const label$ = this._taxoService.getNodeFromKey(treeId, key).pipe(
      map((node) => node?.label ?? null),
      catchError((error) => {
        console.error(`Error loading node "${key}" of tree "${treeId}"`, error);
        this._labels.delete(cacheKey);
        return of(null);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this._labels.set(cacheKey, label$);
    return label$;
  }

  /**
   * Store the label of a taxonomy node in the cache, e.g. when it has just
   * been picked, so that it needs no request to be displayed.
   * @param treeId The tree ID.
   * @param key The node key.
   * @param label The node label.
   */
  public setTaxoNodeLabel(treeId: string, key: string, label: string): void {
    this._labels.set(`${treeId}\u0001${key}`, of(label));
  }

  /**
   * Clear the cache, either entirely or only for thesauri or taxonomies.
   * Call this when data may have changed in the backend, e.g. after
   * editing a thesaurus.
   * @param what What to clear: `thesauri`, `taxonomies`, or both when
   * not specified.
   */
  public clearCache(what?: 'thesauri' | 'taxonomies'): void {
    if (what !== 'taxonomies') {
      this._thesauri.clear();
    }
    if (what !== 'thesauri') {
      this._labels.clear();
    }
  }
}
