import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import {
  PagedListStore,
  PagedListStoreService,
} from '@myrmidon/paged-data-browsers';
import { DataPage } from '@myrmidon/ng-tools';

import {
  ThesaurusNode,
  ThesaurusNodeFilter,
  ThesaurusNodesService,
} from '../services/thesaurus-nodes.service';

@Injectable({ providedIn: 'root' })
export class ThesaurusNodeListRepository
  implements PagedListStoreService<ThesaurusNodeFilter, ThesaurusNode>
{
  private readonly _store: PagedListStore<ThesaurusNodeFilter, ThesaurusNode>;
  private readonly _loading$: BehaviorSubject<boolean | undefined>;
  private readonly _activeNode$: BehaviorSubject<ThesaurusNode | undefined>;
  private readonly _thesaurusId$: BehaviorSubject<string | undefined>;
  private readonly _targetId$: BehaviorSubject<string | undefined>;

  public get loading$(): Observable<boolean | undefined> {
    return this._loading$.asObservable();
  }
  public get filter$(): Observable<ThesaurusNodeFilter> {
    return this._store.filter$;
  }
  public get activeNode$(): Observable<ThesaurusNode | undefined> {
    return this._activeNode$.asObservable();
  }
  public get page$(): Observable<DataPage<ThesaurusNode>> {
    return this._store.page$;
  }

  constructor(private _nodeService: ThesaurusNodesService) {
    this._store = new PagedListStore<ThesaurusNodeFilter, ThesaurusNode>(this);
    this._loading$ = new BehaviorSubject<boolean | undefined>(undefined);
    this._activeNode$ = new BehaviorSubject<ThesaurusNode | undefined>(
      undefined
    );
    this._thesaurusId$ = new BehaviorSubject<string | undefined>(undefined);
    this._targetId$ = new BehaviorSubject<string | undefined>(undefined);
    this._store.reset();
  }

  public loadPage(
    pageNumber: number,
    pageSize: number,
    filter: ThesaurusNodeFilter
  ): Observable<DataPage<ThesaurusNode>> {
    this._loading$.next(true);
    return this._nodeService.getPage(filter, pageNumber, pageSize).pipe(
      tap({
        next: () => this._loading$.next(false),
        error: () => this._loading$.next(false),
      })
    );
  }

  public async reset(): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.reset();
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public async setFilter(filter: ThesaurusNodeFilter): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.setFilter(filter);
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public getFilter(): ThesaurusNodeFilter {
    return this._store.getFilter();
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
}
