import { Observable } from 'rxjs';

import { EditStatus } from '@myrmidon/cadmus-core';

/**
 * Information about a history entry, i.e. about a saved version of an item
 * or part. This is the model-independent view of a history record used by
 * `ModelHistoryViewComponent`.
 */
export interface HistoryEntryInfo {
  /**
   * The ID of the history record (not of the item or part).
   */
  id: string;
  /**
   * The ID of the item or part this record refers to.
   */
  referenceId: string;
  /**
   * The edit status.
   */
  status: EditStatus;
  /**
   * The time this version was saved.
   */
  timeModified: Date;
  /**
   * The ID of the user who saved this version.
   */
  userId: string;
  /**
   * The time the item or part was created.
   */
  timeCreated: Date;
  /**
   * The ID of the user who created the item or part.
   */
  creatorId: string;
}

/**
 * A history entry, with its data, i.e. the item or part as it was saved.
 */
export interface HistoryEntry<T> {
  info: HistoryEntryInfo;
  data: T;
}

/**
 * The adapter between `ModelHistoryViewComponent` and the history of a
 * specific type of object (item or part). This decouples the generic
 * history view from where its data come from, and from how they are
 * restored. So, it can be used for the history of existing objects as well
 * as (in the future) of deleted objects, which have no current version.
 */
export interface HistoryDataAdapter<T> {
  /**
   * A short name for the type of object, used for the downloaded files
   * and in messages (e.g. "item" or "part").
   */
  readonly kind: string;

  /**
   * Get the history entries saved in the specified time range (both
   * bounds included), in any order.
   *
   * @param min The minimum time.
   * @param max The maximum time.
   */
  getEntries(min: Date, max: Date): Observable<HistoryEntryInfo[]>;

  /**
   * Get the newest history entry, or null if there is no history.
   */
  getLatestEntry(): Observable<HistoryEntryInfo | null>;

  /**
   * Get the data of the specified history entry.
   *
   * @param info The entry.
   */
  getEntryData(info: HistoryEntryInfo): Observable<T>;

  /**
   * Get the currently saved version of the object, or null if it does not
   * exist (e.g. it was deleted).
   */
  getCurrent(): Observable<T | null>;

  /**
   * Get the time the object was created, which is the start of its
   * history timeline.
   *
   * @param current The current version of the object, if any.
   */
  getCreationTime(current: T | null): Date | undefined;

  /**
   * Get the time the specified version of the object was saved.
   *
   * @param current The version of the object.
   */
  getModifiedTime(current: T): Date | undefined;

  /**
   * Get the object as it should be represented in JSON for display,
   * comparison and download.
   *
   * @param data The object.
   */
  toJsonObject(data: T): unknown;

  /**
   * Restore the specified version of the object, saving it as its current
   * version. This is exactly like a user editing the current version so
   * that it equals the specified one, and then saving it.
   *
   * @param data The data of the version to restore.
   * @param current The current version, if any.
   * @returns The saved object.
   */
  restore(data: T, current: T | null): Observable<unknown>;
}

/**
 * The context of the editor template of `ModelHistoryViewComponent`.
 */
export interface HistoryEditorContext<T> {
  $implicit: HistoryEntry<T>;
  entry: HistoryEntry<T>;
}
