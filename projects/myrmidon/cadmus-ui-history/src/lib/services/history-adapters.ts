import { EMPTY, Observable, expand, map, reduce } from 'rxjs';

import {
  HistoryInfo,
  HistoryItem,
  Item,
  Part,
} from '@myrmidon/cadmus-core';
import {
  HISTORY_MAX_PAGE_SIZE,
  HistoryService,
  ItemService,
} from '@myrmidon/cadmus-api';
import { DataPage, deepCopy } from '@myrmidon/ngx-tools';

import { HistoryDataAdapter, HistoryEntryInfo } from '../models';

/**
 * Convert a history record into a history entry info.
 */
export function toHistoryEntryInfo(info: HistoryInfo): HistoryEntryInfo {
  return {
    id: info.id,
    referenceId: info.referenceId,
    status: info.status,
    timeModified: info.timeModified,
    userId: info.userId,
    timeCreated: info.timeCreated,
    creatorId: info.creatorId,
  };
}

/**
 * Load all the pages got from the specified page getter, and return all
 * their items in a single array.
 *
 * @param getPage The function getting the page with the specified number.
 */
export function loadAllHistoryPages<T>(
  getPage: (pageNumber: number) => Observable<DataPage<T>>,
): Observable<T[]> {
  return getPage(1).pipe(
    expand((page) =>
      page.pageNumber < page.pageCount ? getPage(page.pageNumber + 1) : EMPTY,
    ),
    reduce((all, page) => all.concat(page.items), [] as T[]),
  );
}

/**
 * Get the item metadata as they are represented in JSON for display,
 * comparison and download, i.e. with a fixed order of properties, and
 * without parts.
 */
export function toItemJsonObject(item: Item): unknown {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    facetId: item.facetId,
    groupId: item.groupId || null,
    sortKey: item.sortKey,
    flags: item.flags,
    timeCreated: item.timeCreated,
    creatorId: item.creatorId,
    timeModified: item.timeModified,
    userId: item.userId,
  };
}

/**
 * Convert a history item into the item it represents.
 */
export function historyItemToItem(h: HistoryItem): Item {
  return {
    id: h.referenceId,
    title: h.title,
    description: h.description,
    facetId: h.facetId,
    groupId: h.groupId || '',
    sortKey: h.sortKey,
    flags: h.flags,
    timeCreated: h.timeCreated,
    creatorId: h.creatorId,
    timeModified: h.timeModified,
    userId: h.userId,
  };
}

/**
 * History data adapter for an item's metadata.
 */
export class ItemHistoryAdapter implements HistoryDataAdapter<Item> {
  public readonly kind = 'item';

  /**
   * Create a new adapter.
   *
   * @param itemId The ID of the item.
   * @param _historyService The history service.
   * @param _itemService The item service.
   * @param _getAdminFlagsMask A function returning the bitmask of the flags
   * which the current user cannot change, i.e. the admin flags for
   * non-admin users, else 0. These flags are kept as they currently are
   * when restoring.
   */
  constructor(
    public readonly itemId: string,
    private readonly _historyService: HistoryService,
    private readonly _itemService: ItemService,
    private readonly _getAdminFlagsMask: () => number = () => 0,
  ) {}

  public getEntries(min: Date, max: Date): Observable<HistoryEntryInfo[]> {
    return loadAllHistoryPages((n) =>
      this._historyService.getItemHistory(
        this.itemId,
        { minModified: min, maxModified: max },
        n,
        HISTORY_MAX_PAGE_SIZE,
      ),
    ).pipe(map((items) => items.map(toHistoryEntryInfo)));
  }

  public getLatestEntry(): Observable<HistoryEntryInfo | null> {
    return this._historyService
      .getItemHistory(this.itemId, undefined, 1, 1)
      .pipe(
        map((page) =>
          page.items.length ? toHistoryEntryInfo(page.items[0]) : null,
        ),
      );
  }

  public getEntryData(info: HistoryEntryInfo): Observable<Item> {
    return this._historyService
      .getHistoryItem(info.id)
      .pipe(map((h) => historyItemToItem(h)));
  }

  public getCurrent(): Observable<Item | null> {
    return this._itemService.getItem(this.itemId, false, true);
  }

  public getCreationTime(current: Item | null): Date | undefined {
    return current?.timeCreated;
  }

  public getModifiedTime(current: Item): Date | undefined {
    return current.timeModified;
  }

  public toJsonObject(data: Item): unknown {
    return toItemJsonObject(data);
  }

  /**
   * Get the item to save for restoring the specified version over the
   * current one: this is the current item with the metadata of the
   * version (title, description, facet, group and flags). The sort key is
   * computed by the server; the flags which the user cannot change keep
   * their current value.
   */
  public getRestoredItem(data: Item, current: Item | null): Item {
    const mask = this._getAdminFlagsMask();
    const currentFlags = current?.flags ?? 0;
    return {
      ...(current || data),
      id: this.itemId,
      title: data.title,
      description: data.description,
      facetId: data.facetId,
      groupId: data.groupId,
      flags: (data.flags & ~mask) | (currentFlags & mask),
      parts: undefined,
    };
  }

  public restore(data: Item, current: Item | null): Observable<unknown> {
    return this._itemService.addItem(this.getRestoredItem(data, current));
  }
}

/**
 * History data adapter for a part.
 */
export class PartHistoryAdapter implements HistoryDataAdapter<Part> {
  public readonly kind = 'part';

  /**
   * Create a new adapter.
   *
   * @param partId The ID of the part.
   * @param _historyService The history service.
   * @param _itemService The item service.
   */
  constructor(
    public readonly partId: string,
    private readonly _historyService: HistoryService,
    private readonly _itemService: ItemService,
  ) {}

  public getEntries(min: Date, max: Date): Observable<HistoryEntryInfo[]> {
    return loadAllHistoryPages((n) =>
      this._historyService.getPartHistory(
        this.partId,
        { minModified: min, maxModified: max },
        n,
        HISTORY_MAX_PAGE_SIZE,
      ),
    ).pipe(map((parts) => parts.map(toHistoryEntryInfo)));
  }

  public getLatestEntry(): Observable<HistoryEntryInfo | null> {
    return this._historyService
      .getPartHistory(this.partId, undefined, 1, 1)
      .pipe(
        map((page) =>
          page.items.length ? toHistoryEntryInfo(page.items[0]) : null,
        ),
      );
  }

  public getEntryData(info: HistoryEntryInfo): Observable<Part> {
    return this._historyService
      .getHistoryPart(info.id)
      .pipe(map((h) => h.part));
  }

  public getCurrent(): Observable<Part | null> {
    return this._itemService.getPart(this.partId);
  }

  public getCreationTime(current: Part | null): Date | undefined {
    return current?.timeCreated;
  }

  public getModifiedTime(current: Part): Date | undefined {
    return current.timeModified;
  }

  public toJsonObject(data: Part): unknown {
    return data;
  }

  /**
   * Get the part to save for restoring the specified version over the
   * current one: this is the version, keeping the current thesaurus scope,
   * which is not stored in history.
   */
  public getRestoredPart(data: Part, current: Part | null): Part {
    const part = deepCopy(data) as Part;
    part.id = this.partId;
    if (current?.thesaurusScope) {
      part.thesaurusScope = current.thesaurusScope;
    } else {
      delete part.thesaurusScope;
    }
    return part;
  }

  public restore(data: Part, current: Part | null): Observable<unknown> {
    return this._itemService.addPart(this.getRestoredPart(data, current));
  }
}
