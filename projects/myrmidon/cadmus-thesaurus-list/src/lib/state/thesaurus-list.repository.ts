import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { DataPage } from '@myrmidon/ng-tools';
import {
  PagedListStore,
  PagedListStoreService,
} from '@myrmidon/paged-data-browsers';

import { Thesaurus, ThesaurusFilter } from '@myrmidon/cadmus-core';
import { ThesaurusService } from '@myrmidon/cadmus-api';

/**
 * Thesauri list repository.
 */
@Injectable({ providedIn: 'root' })
export class ThesaurusListRepository
  implements PagedListStoreService<ThesaurusFilter, Thesaurus>
{
  private readonly _store: PagedListStore<ThesaurusFilter, Thesaurus>;
  private readonly _loading$: BehaviorSubject<boolean | undefined>;

  public get loading$(): Observable<boolean | undefined> {
    return this._loading$.asObservable();
  }
  public get filter$(): Observable<ThesaurusFilter> {
    return this._store.filter$;
  }
  public get page$(): Observable<DataPage<Thesaurus>> {
    return this._store.page$;
  }

  constructor(private _thesaurusService: ThesaurusService) {
    this._store = new PagedListStore<ThesaurusFilter, Thesaurus>(this);
    this._loading$ = new BehaviorSubject<boolean | undefined>(undefined);
    this._store.reset();
  }

  public loadPage(
    pageNumber: number,
    pageSize: number,
    filter: ThesaurusFilter
  ): Observable<DataPage<Thesaurus>> {
    this._loading$.next(true);
    return this._thesaurusService
      .getThesauri(filter, pageNumber, pageSize)
      .pipe(
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

  public async setFilter(filter: ThesaurusFilter): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.setFilter(filter);
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
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

  public deleteThesaurus(id: string) {
    this._loading$.next(true);
    this._thesaurusService.deleteThesaurus(id).subscribe((_) => {
      this._store.reset();
    });
  }
}
