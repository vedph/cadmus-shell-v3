import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { DataPage } from '@myrmidon/ng-tools';
import {
  PagedListStore,
  PagedListStoreService,
} from '@myrmidon/paged-data-browsers';

import { ItemFilter, ItemInfo } from '@myrmidon/cadmus-core';
import { ItemService, MessagingService } from '@myrmidon/cadmus-api';

/**
 * The ID of the message received by the item list repository to reset its list.
 */
export const MESSAGE_ITEM_LIST_REPOSITORY_RESET = 'item-list-repository.reset';

/**
 * Item list repository.
 */
@Injectable({ providedIn: 'root' })
export class ItemListRepository
  implements PagedListStoreService<ItemFilter, ItemInfo>
{
  private readonly _store: PagedListStore<ItemFilter, ItemInfo>;
  private readonly _loading$: BehaviorSubject<boolean | undefined>;

  public get loading$(): Observable<boolean | undefined> {
    return this._loading$.asObservable();
  }
  public get filter$(): Observable<ItemFilter> {
    return this._store.filter$;
  }
  public get page$(): Observable<DataPage<ItemInfo>> {
    return this._store.page$;
  }

  constructor(private _itemService: ItemService, messaging: MessagingService) {
    this._store = new PagedListStore<ItemFilter, ItemInfo>(this);
    this._loading$ = new BehaviorSubject<boolean | undefined>(undefined);
    this._store.reset();

    messaging.messages$.subscribe((msg) => {
      if (msg.id === MESSAGE_ITEM_LIST_REPOSITORY_RESET) {
        this.reset();
      }
    });
  }

  public loadPage(
    pageNumber: number,
    pageSize: number,
    filter: ItemFilter
  ): Observable<DataPage<ItemInfo>> {
    this._loading$.next(true);
    return this._itemService.getItems(filter, pageNumber, pageSize).pipe(
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

  public async setFilter(filter: ItemFilter): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.setFilter(filter);
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public getFilter(): ItemFilter {
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

  public deleteItem(id: ItemInfo['id']) {
    this._itemService.deleteItem(id).subscribe((_) => {
      this._store.reset();
    });
  }
}
