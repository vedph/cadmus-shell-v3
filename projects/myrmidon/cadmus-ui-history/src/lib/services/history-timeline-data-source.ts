import { Observable, map } from 'rxjs';

import {
  TimelineDataSource,
  TimelinePoint,
  TimelinePointWithId,
  TimelineRange,
} from '@myrmidon/timeline-view';
import { EditStatus } from '@myrmidon/cadmus-core';

import { HistoryDataAdapter, HistoryEntryInfo } from '../models';
import { formatLocalDateTime } from '../utils/iso-datetime-timeline-parser';

/**
 * The CSS colors of the timeline points by edit status. They are Material
 * system tokens, so that they follow the app's theme.
 */
export const HISTORY_STATUS_COLORS: Record<EditStatus, string | undefined> = {
  [EditStatus.created]: 'var(--mat-sys-tertiary-container)',
  // updated: the default point color from the timeline theme
  [EditStatus.updated]: undefined,
  [EditStatus.deleted]: 'var(--mat-sys-error-container)',
};

/**
 * Get a human-friendly name for the specified edit status.
 */
export function getEditStatusName(status: EditStatus): string {
  switch (status) {
    case EditStatus.created:
      return 'created';
    case EditStatus.deleted:
      return 'deleted';
    default:
      return 'updated';
  }
}

/**
 * A timeline data source for the history of an item or part, loading its
 * entries on demand via a `HistoryDataAdapter`. Timeline point values are
 * the save times in milliseconds since the Unix epoch, and labels are the
 * local save date and time with the ID of the user who saved.
 *
 * Timeline points require numeric IDs, while history entries have GUIDs:
 * so, each source assigns to each entry a numeric ID, which is stable for
 * the lifetime of the source, and keeps the entries by their numeric ID.
 */
export class HistoryTimelineDataSource implements TimelineDataSource {
  private readonly _ids = new Map<string, number>();
  private readonly _entries = new Map<number, HistoryEntryInfo>();
  private _nextId = 1;

  /**
   * Create a new source.
   *
   * @param _adapter The history data adapter.
   * @param _includeDeleted True to include the entries with deleted status.
   */
  constructor(
    private readonly _adapter: HistoryDataAdapter<unknown>,
    private readonly _includeDeleted = false,
  ) {}

  /**
   * Get the numeric point ID for the specified history entry ID,
   * assigning a new one if not yet assigned.
   */
  public getPointId(entryId: string): number {
    let id = this._ids.get(entryId);
    if (id === undefined) {
      id = this._nextId++;
      this._ids.set(entryId, id);
    }
    return id;
  }

  /**
   * Get the history entry corresponding to the specified point, if any.
   */
  public getEntry(point: TimelinePoint): HistoryEntryInfo | undefined {
    return point.id !== undefined ? this._entries.get(point.id) : undefined;
  }

  /**
   * Convert the specified history entry into a timeline point, registering
   * it in this source.
   */
  public toPoint(info: HistoryEntryInfo): TimelinePointWithId {
    const id = this.getPointId(info.id);
    this._entries.set(id, info);
    const time = new Date(info.timeModified);
    const dt = formatLocalDateTime(time, true);
    return {
      id,
      value: time.getTime(),
      label: `${dt.substring(0, 16)} ${info.userId}`,
      tip: `${getEditStatusName(info.status)} by ${info.userId} at ${dt}`,
      color: HISTORY_STATUS_COLORS[info.status],
      shape: info.status === EditStatus.updated ? 'rectangle' : 'oval',
    };
  }

  public getPoints(range: TimelineRange): Observable<TimelinePoint[]> {
    return this._adapter
      .getEntries(
        new Date(Math.floor(range.start.value)),
        new Date(Math.ceil(range.end.value)),
      )
      .pipe(
        map((entries) =>
          entries
            .filter(
              (e) => this._includeDeleted || e.status !== EditStatus.deleted,
            )
            .map((e) => this.toPoint(e)),
        ),
      );
  }
}
