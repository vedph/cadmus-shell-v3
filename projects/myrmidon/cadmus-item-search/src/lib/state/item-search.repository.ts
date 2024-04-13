import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of, tap } from 'rxjs';

export interface ItemSearchFilter {
  query?: string;
}

import { DataPage } from '@myrmidon/ng-tools';

import { ItemService } from '@myrmidon/cadmus-api';
import { ItemInfo } from '@myrmidon/cadmus-core';
import {
  PagedListStore,
  PagedListStoreService,
} from '@myrmidon/paged-data-browsers';

@Injectable({ providedIn: 'root' })
export class ItemSearchRepository
  implements PagedListStoreService<ItemSearchFilter, ItemInfo>
{
  private readonly _loading$: BehaviorSubject<boolean | undefined>;
  private readonly _store: PagedListStore<ItemSearchFilter, ItemInfo>;
  private readonly _query$: BehaviorSubject<string | undefined>;
  private readonly _error$: BehaviorSubject<string | undefined>;
  private readonly _lastQueries$: BehaviorSubject<string[]>;

  public get loading$(): Observable<boolean | undefined> {
    return this._loading$.asObservable();
  }
  public get query$(): Observable<string | undefined> {
    return this._query$.asObservable();
  }
  public get error$(): Observable<string | undefined> {
    return this._error$.asObservable();
  }
  public get lastQueries$(): Observable<string[]> {
    return this._lastQueries$.asObservable();
  }
  public get page$(): Observable<DataPage<ItemInfo>> {
    return this._store.page$;
  }

  constructor(private _itemService: ItemService) {
    this._store = new PagedListStore<ItemSearchFilter, ItemInfo>(this);
    this._loading$ = new BehaviorSubject<boolean | undefined>(undefined);
    this._query$ = new BehaviorSubject<string | undefined>(undefined);
    this._error$ = new BehaviorSubject<string | undefined>(undefined);
    this._lastQueries$ = new BehaviorSubject<string[]>([]);
    this._store.reset();
  }

  public loadPage(
    pageNumber: number,
    pageSize: number
  ): Observable<DataPage<ItemInfo>> {
    if (!this._query$.value) {
      return of({
        pageNumber: 1,
        pageSize: 0,
        pageCount: 0,
        total: 0,
        items: [],
      });
    }
    this._loading$.next(true);
    this._error$.next(undefined);

    return this._itemService
      .searchItems(this._query$.value, pageNumber, pageSize)
      .pipe(
        tap({
          next: () => this._loading$.next(false),
          error: (error) => {
            this._loading$.next(false);
            this._error$.next('Error searching item');
            console.error(error);
          },
        }),
        map((r) => {
          if (r.error) {
            this._error$.next(r.error);
            return {
              pageNumber: 1,
              pageSize: 0,
              pageCount: 0,
              total: 0,
              items: [],
            };
          } else {
            return r.value!;
          }
        })
      );
  }

  public async setPage(pageNumber: number, pageSize: number): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.setPage(pageNumber, pageSize);
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public reset() {
    this._store.reset();
  }

  private addQueryToHistory(query: string): void {
    const queries = [...this._lastQueries$.value];
    if (queries.indexOf(query) > -1) {
      return;
    }
    queries.splice(0, 0, query);
    this._lastQueries$.next(queries);
  }

  public async search(query: string): Promise<void> {
    this._loading$.next(true);
    try {
      this._query$.next(query);
      this.addQueryToHistory(query);
      this._store.setFilter({ query: query });
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public deleteItem(id: ItemInfo['id']) {
    this._itemService.deleteItem(id).subscribe((_) => {
      this._store.reset();
    });
  }
}
