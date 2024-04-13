import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { DataPage } from '@myrmidon/ng-tools';
import {
  PagedListStore,
  PagedListStoreService,
} from '@myrmidon/paged-data-browsers';

import { UriNode, TripleFilter, UriTriple } from '@myrmidon/cadmus-api';
import { GraphService } from '@myrmidon/cadmus-api';

/**
 * Graph nodes list repository.
 */
@Injectable({ providedIn: 'root' })
export class GraphTripleListRepository
  implements PagedListStoreService<TripleFilter, UriTriple>
{
  private readonly _store: PagedListStore<TripleFilter, UriTriple>;
  private readonly _loading$: BehaviorSubject<boolean | undefined>;
  private readonly _filter$: BehaviorSubject<TripleFilter>;
  private readonly _subjectNode$: BehaviorSubject<UriNode | undefined>;
  private readonly _predicateNode$: BehaviorSubject<UriNode | undefined>;
  private readonly _objectNode$: BehaviorSubject<UriNode | undefined>;

  public get loading$(): Observable<boolean | undefined> {
    return this._loading$.asObservable();
  }
  public get filter$(): Observable<TripleFilter> {
    return this._filter$.asObservable();
  }
  public get page$(): Observable<DataPage<UriTriple>> {
    return this._store.page$;
  }
  public get subjectNode$(): Observable<UriNode | undefined> {
    return this._subjectNode$.asObservable();
  }
  public get predicateNode$(): Observable<UriNode | undefined> {
    return this._predicateNode$.asObservable();
  }
  public get objectNode$(): Observable<UriNode | undefined> {
    return this._objectNode$.asObservable();
  }

  constructor(private _graphService: GraphService) {
    this._store = new PagedListStore<TripleFilter, UriTriple>(this);
    this._filter$ = new BehaviorSubject<TripleFilter>({});
    this._subjectNode$ = new BehaviorSubject<UriNode | undefined>(undefined);
    this._predicateNode$ = new BehaviorSubject<UriNode | undefined>(undefined);
    this._objectNode$ = new BehaviorSubject<UriNode | undefined>(undefined);
    this._loading$ = new BehaviorSubject<boolean | undefined>(undefined);
    this._store.reset();
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

  public loadPage(
    pageNumber: number,
    pageSize: number,
    filter: TripleFilter
  ): Observable<DataPage<UriTriple>> {
    this._loading$.next(true);
    return this._graphService.getTriples(pageNumber, pageSize, filter).pipe(
      tap({
        next: () => this._loading$.next(false),
        error: () => this._loading$.next(false),
      })
    );
  }

  public async setFilter(filter: TripleFilter): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.setFilter(filter);
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public getFilter(): TripleFilter {
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

  /**
   * Set the node term used in filter.
   *
   * @param node The node or null/undefined.
   * @param type The type: subject, predicate, object.
   */
  public setTerm(
    node: UriNode | null | undefined,
    type: 'S' | 'P' | 'O'
  ): void {
    switch (type) {
      case 'S':
        this._subjectNode$.next(node || undefined);
        break;
      case 'P':
        this._predicateNode$.next(node || undefined);
        break;
      case 'O':
        this._objectNode$.next(node || undefined);
        break;
    }
  }

  /**
   * Set the node term used in filter by its ID.
   *
   * @param id The node ID or null/undefined.
   * @param type The type: subject, predicate, object.
   */
  public setTermId(id: number | null | undefined, type: 'S' | 'P' | 'O'): void {
    if (!id) {
      this.setTerm(null, type);
      return;
    }
    this._graphService.getNode(id).subscribe({
      next: (node) => {
        this.setTerm(node, type);
      },
      error: (error) => {
        if (error) {
          console.error(JSON.stringify(error));
        }
        console.warn('Node ID not found: ' + id);
      },
    });
  }

  public selectTerm(type: 'S' | 'P' | 'O'): Observable<UriNode | undefined> {
    switch (type) {
      case 'S':
        return this.subjectNode$;
      case 'P':
        return this.predicateNode$;
      case 'O':
        return this.objectNode$;
    }
  }

  public getTerm(type: 'S' | 'P' | 'O'): UriNode | undefined {
    switch (type) {
      case 'S':
        return this._subjectNode$.value;
      case 'P':
        return this._predicateNode$.value;
      case 'O':
        return this._objectNode$.value;
    }
  }
}
