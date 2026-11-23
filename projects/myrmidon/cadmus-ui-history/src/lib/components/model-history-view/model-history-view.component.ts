import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { forkJoin, Subscription, take } from 'rxjs';

import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';

import {
  DecoratedTimelineRange,
  TimelineComponent,
  TimelineDataError,
  TimelinePoint,
  TimelineRange,
} from '@myrmidon/timeline-view';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { JsonDiffViewComponent } from '@myrmidon/cadmus-ui-diff';

import {
  HistoryDataAdapter,
  HistoryEditorContext,
  HistoryEntry,
  HistoryEntryInfo,
} from '../../models';
import {
  getEditStatusName,
  HistoryTimelineDataSource,
} from '../../services/history-timeline-data-source';
import {
  DAY_MS,
  formatLocalDateTime,
  HOUR_MS,
  IsoDateTimeTimelineParser,
} from '../../utils/iso-datetime-timeline-parser';

const WEEK_MS = 7 * DAY_MS;

function toRange(start: number, end: number): TimelineRange {
  return {
    start: { label: formatLocalDateTime(new Date(start)), value: start },
    end: { label: formatLocalDateTime(new Date(end)), value: end },
  };
}

function toPresetRange(
  label: string,
  start: number,
  end: number,
): DecoratedTimelineRange {
  return { label, ...toRange(start, end) };
}

/**
 * Build the preset view ranges of the history timeline, relative to the
 * specified time: last day, last week, last month, last year, and custom.
 *
 * @param now The time the presets are relative to.
 */
export function buildHistoryPresetRanges(now: number): DecoratedTimelineRange[] {
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  return [
    toPresetRange('last day', now - DAY_MS, now),
    toPresetRange('last week', now - WEEK_MS, now),
    toPresetRange('last month', monthAgo.getTime(), now),
    toPresetRange('last year', yearAgo.getTime(), now),
    {
      label: 'custom…',
      start: { label: '', value: 0 },
      end: { label: '', value: 0 },
    },
  ];
}

/**
 * Get the initial view range of the history timeline: the last week, or,
 * when the newest version is older than a week, the week before it.
 *
 * @param now The current time.
 * @param latest The time of the newest version, if any.
 */
export function getInitialHistoryViewRange(
  now: number,
  latest?: number,
): TimelineRange {
  if (latest === undefined || now - latest <= WEEK_MS) {
    return toRange(now - WEEK_MS, now);
  }
  return toRange(latest - WEEK_MS, latest + HOUR_MS);
}

/**
 * Generic edit history view, used to browse the saved versions of an item
 * or part, compare them with the current version, download and restore
 * them. Its data come from a `HistoryDataAdapter`, so it does not depend
 * on the type of object.
 *
 * The layout has three vertically stacked sections:
 * 1. a timeline with the versions, loaded on demand while zooming and
 *    scrolling. Selecting a version shows it below.
 * 2. the selected version, in two tabs: the editor (rendered from the
 *    `editorTemplate` input, which receives the entry as its context;
 *    the host is responsible for making the editor read-only), and the
 *    code (the JSON diff between the selected and the current version;
 *    only when there is a current version).
 * 3. a toolbar with download, restore and the metadata of the selected
 *    version.
 */
@Component({
  selector: 'cadmus-model-history-view',
  templateUrl: './model-history-view.component.html',
  styleUrls: ['./model-history-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    NgTemplateOutlet,
    MatButton,
    MatIcon,
    MatProgressBar,
    MatTab,
    MatTabGroup,
    MatTooltip,
    TimelineComponent,
    JsonDiffViewComponent,
  ],
})
export class ModelHistoryViewComponent<T = unknown> {
  private readonly _dialog = inject(DialogService);
  private readonly _snackbar = inject(MatSnackBar);
  private _entrySub?: Subscription;
  private _initSub?: Subscription;

  /**
   * The adapter providing the history data.
   */
  public readonly adapter = input.required<HistoryDataAdapter<T>>();

  /**
   * The template for the read-only editor of the selected version. Its
   * context is a `HistoryEditorContext`, having the selected entry as
   * its implicit value. When not set, there is no editor tab.
   */
  public readonly editorTemplate = input<
    TemplateRef<HistoryEditorContext<T>> | undefined
  >();

  /**
   * True when the user can restore versions.
   */
  public readonly canRestore = input<boolean>(false);

  /**
   * The accessible label of the timeline.
   */
  public readonly label = input<string>('History');

  /**
   * Emitted after a version has been restored.
   */
  public readonly restored = output<HistoryEntry<T>>();

  /**
   * The timeline component.
   */
  public readonly timeline = viewChild(TimelineComponent);

  /**
   * The parser used by the timeline for date and time values.
   */
  public readonly parser = new IsoDateTimeTimelineParser();

  // the reference time ("now") of the timeline, updated on reload
  private readonly _now = signal<number>(Date.now());

  /**
   * The current version of the object: undefined while loading, null
   * when it does not exist.
   */
  public readonly current = signal<T | null | undefined>(undefined);

  /**
   * The newest history entry, if any.
   */
  public readonly latest = signal<HistoryEntryInfo | null | undefined>(
    undefined,
  );

  /**
   * The selected history entry with its data.
   */
  public readonly entry = signal<HistoryEntry<T> | undefined>(undefined);

  /**
   * True while loading.
   */
  public readonly busy = signal<boolean>(false);

  /**
   * The selected timeline points.
   */
  public readonly selection = signal<TimelinePoint[]>([]);

  /**
   * The timeline view range.
   */
  public readonly viewRange = signal<TimelineRange | undefined>(undefined);

  /**
   * The selected tab index.
   */
  public readonly selectedTab = signal<number>(0);

  /**
   * The timeline data source, recreated when the adapter changes.
   */
  public readonly source = computed(
    () => new HistoryTimelineDataSource(this.adapter()),
  );

  /**
   * The preset view ranges.
   */
  public readonly presetRanges = computed(() =>
    buildHistoryPresetRanges(this._now()),
  );

  /**
   * The total range of the timeline, from the object's creation (or the
   * oldest of the preset ranges) to now.
   */
  public readonly timelineRange = computed<TimelineRange | undefined>(() => {
    const current = this.current();
    if (current === undefined) {
      return undefined;
    }
    const now = this._now();
    const created = this.adapter().getCreationTime(current);
    let start = created ? new Date(created).getTime() : now - WEEK_MS;
    // leave some room before the first version
    start = Math.min(start - HOUR_MS, now - DAY_MS);
    return toRange(start, now + HOUR_MS);
  });

  /**
   * The maximum zoom level, letting users zoom down to about an hour.
   */
  public readonly maxZoom = computed<number>(() => {
    const total = this.timelineRange();
    if (!total) {
      return 200;
    }
    return Math.max(
      200,
      Math.ceil((total.end.value - total.start.value) / HOUR_MS),
    );
  });

  /**
   * The JSON code of the selected version.
   */
  public readonly entryJson = computed<string | undefined>(() => {
    const entry = this.entry();
    return entry
      ? JSON.stringify(this.adapter().toJsonObject(entry.data), null, 2)
      : undefined;
  });

  /**
   * The JSON code of the current version.
   */
  public readonly currentJson = computed<string | undefined>(() => {
    const current = this.current();
    return current
      ? JSON.stringify(this.adapter().toJsonObject(current), null, 2)
      : undefined;
  });

  /**
   * True when the selected version is equal to the current one.
   */
  public readonly isCurrent = computed<boolean>(() => {
    const json = this.entryJson();
    return json !== undefined && json === this.currentJson();
  });

  /**
   * True when the selected entry is the newest one.
   */
  public readonly isLatest = computed<boolean>(
    () =>
      !!this.entry() && this.entry()!.info.id === (this.latest()?.id ?? ''),
  );

  /**
   * The name of the edit status of the selected entry.
   */
  public readonly statusName = computed<string>(() => {
    const entry = this.entry();
    return entry ? getEditStatusName(entry.info.status) : '';
  });

  constructor() {
    // (re)load when the adapter changes
    effect(() => {
      const adapter = this.adapter();
      untracked(() => this.init(adapter));
    });

    // load the selected entry
    effect(() => {
      const point = this.selection()[0];
      untracked(() => this.loadEntry(point));
    });

    inject(DestroyRef).onDestroy(() => {
      this._initSub?.unsubscribe();
      this._entrySub?.unsubscribe();
    });
  }

  private init(adapter: HistoryDataAdapter<T>): void {
    this._initSub?.unsubscribe();
    this.busy.set(true);
    this.current.set(undefined);
    this.latest.set(undefined);
    this.entry.set(undefined);
    this.selection.set([]);

    this._initSub = forkJoin({
      current: adapter.getCurrent().pipe(take(1)),
      latest: adapter.getLatestEntry().pipe(take(1)),
    }).subscribe({
      next: ({ current, latest }) => {
        const now = Date.now();
        this._now.set(now);
        this.current.set(current);
        this.latest.set(latest);
        const latestTime = latest
          ? new Date(latest.timeModified).getTime()
          : current
            ? new Date(adapter.getModifiedTime(current) ?? now).getTime()
            : undefined;
        this.viewRange.set(getInitialHistoryViewRange(now, latestTime));
        // select the newest version
        if (latest) {
          this.selection.set([this.source().toPoint(latest)]);
        }
        this.busy.set(false);
      },
      error: (error) => {
        console.error(error);
        this.current.set(null);
        this.latest.set(null);
        this.busy.set(false);
        this._snackbar.open(`Error loading ${adapter.kind} history`, 'OK');
      },
    });
  }

  private loadEntry(point?: TimelinePoint): void {
    this._entrySub?.unsubscribe();
    const info = point ? this.source().getEntry(point) : undefined;
    if (!info) {
      this.entry.set(undefined);
      return;
    }
    if (this.entry()?.info.id === info.id) {
      return;
    }
    this.busy.set(true);
    this._entrySub = this.adapter()
      .getEntryData(info)
      .pipe(take(1))
      .subscribe({
        next: (data) => {
          this.entry.set({ info, data });
          this.busy.set(false);
        },
        error: (error) => {
          console.error(error);
          this.entry.set(undefined);
          this.busy.set(false);
          this._snackbar.open(
            `Error loading ${this.adapter().kind} version`,
            'OK',
          );
        },
      });
  }

  public onLoadError(error: TimelineDataError): void {
    console.error(error);
    this._snackbar.open(
      `Error loading the ${this.adapter().kind} history from ` +
        `${error.range.start.label} to ${error.range.end.label}`,
      'OK',
      { duration: 5000 },
    );
  }

  /**
   * Select the newest version.
   */
  public selectLatest(): void {
    const latest = this.latest();
    if (!latest) {
      return;
    }
    const point = this.source().toPoint(latest);
    this.selection.set([point]);
    this.timeline()?.centerOn(point.value);
  }

  /**
   * Reload the history and the current version, e.g. after a restore.
   */
  public reload(): void {
    this.init(this.adapter());
    this.timeline()?.reload();
  }

  /**
   * Download the JSON code of the selected version.
   */
  public download(): void {
    const entry = this.entry();
    const json = this.entryJson();
    if (!entry || !json) {
      return;
    }
    const time = formatLocalDateTime(
      new Date(entry.info.timeModified),
      true,
    ).replace(/[-: ]/g, '');
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.adapter().kind}-${entry.info.referenceId}-${time}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Restore the selected version, after confirmation.
   */
  public restore(): void {
    const entry = this.entry();
    if (!entry || !this.canRestore() || this.busy()) {
      return;
    }
    const adapter = this.adapter();
    const dt = formatLocalDateTime(new Date(entry.info.timeModified), true);

    // get the current version just before restoring, so that we restore
    // over the latest data, and warn if it changed meanwhile
    this.busy.set(true);
    adapter
      .getCurrent()
      .pipe(take(1))
      .subscribe({
        next: (current) => {
          this.busy.set(false);
          const changed =
            JSON.stringify(current ? adapter.toJsonObject(current) : null) !==
            JSON.stringify(
              this.current() ? adapter.toJsonObject(this.current()!) : null,
            );
          this._dialog
            .confirm(
              'Confirm Restore',
              `Restore the ${adapter.kind} as saved by ${entry.info.userId} ` +
                `at ${dt}?` +
                (changed
                  ? ` Note that the ${adapter.kind} was changed by someone` +
                    ' else since you opened this page.'
                  : ''),
            )
            .pipe(take(1))
            .subscribe((yes) => {
              if (yes) {
                this.doRestore(entry, current);
              }
            });
        },
        error: (error) => {
          console.error(error);
          this.busy.set(false);
          this._snackbar.open(`Error loading the current ${adapter.kind}`, 'OK');
        },
      });
  }

  private doRestore(entry: HistoryEntry<T>, current: T | null): void {
    const adapter = this.adapter();
    this.busy.set(true);
    adapter
      .restore(entry.data, current)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this._snackbar.open(`${adapter.kind} restored`, 'OK', {
            duration: 3000,
          });
          this.restored.emit(entry);
          this.reload();
        },
        error: (error) => {
          console.error(error);
          this.busy.set(false);
          this._snackbar.open(`Error restoring ${adapter.kind}`, 'OK');
        },
      });
  }
}
