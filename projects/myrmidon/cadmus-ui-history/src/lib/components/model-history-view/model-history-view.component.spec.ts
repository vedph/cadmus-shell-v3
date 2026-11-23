import {
  ChangeDetectionStrategy,
  forwardRef,
  Component,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, Subject, throwError } from 'rxjs';

import {
  TimelineComponent,
  TimelineDataSource,
  TimelinePoint,
  TimelineRange,
} from '@myrmidon/timeline-view';
import { JsonDiffViewComponent } from '@myrmidon/cadmus-ui-diff';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EditStatus } from '@myrmidon/cadmus-core';

import { HistoryDataAdapter, HistoryEntryInfo } from '../../models';
import {
  buildHistoryPresetRanges,
  getInitialHistoryViewRange,
  ModelHistoryViewComponent,
} from './model-history-view.component';
import { DAY_MS, HOUR_MS } from '../../utils/iso-datetime-timeline-parser';

// stub of the timeline, which needs a real layout engine
@Component({
  selector: 'tm-timeline',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // let viewChild(TimelineComponent) find the stub
  providers: [
    { provide: TimelineComponent, useExisting: forwardRef(() => TimelineStubComponent) },
  ],
})
class TimelineStubComponent {
  public readonly dataSource = input<TimelineDataSource>();
  public readonly timelineRange = input<TimelineRange>();
  public readonly viewRange = model<TimelineRange | undefined>();
  public readonly selection = model<TimelinePoint[]>([]);
  public readonly selectionMode = input<string>();
  public readonly layout = input<string>();
  public readonly presetRanges = input<unknown[]>([]);
  public readonly parser = input<unknown>();
  public readonly maxZoom = input<number>();
  public readonly label = input<string>();
  public readonly ruler = input<unknown>();
  public readonly loadError = output<unknown>();
  public reload = vi.fn();
  public centerOn = vi.fn();
}

@Component({
  selector: 'cadmus-json-diff-view',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class JsonDiffViewStubComponent {
  public readonly left = input<string | null | undefined>();
  public readonly right = input<string | null | undefined>();
}

interface Doc {
  id: string;
  text: string;
  timeCreated: Date;
  timeModified: Date;
}

function makeInfo(
  id: string,
  time: Date,
  status = EditStatus.updated,
): HistoryEntryInfo {
  return {
    id,
    referenceId: 'd1',
    status,
    timeModified: time,
    userId: 'zeus',
    timeCreated: new Date(2026, 0, 1),
    creatorId: 'hera',
  };
}

class FakeAdapter implements HistoryDataAdapter<Doc> {
  public readonly kind = 'doc';
  public current: Doc | null;
  public latest: HistoryEntryInfo | null;
  public data = new Map<string, Doc>();
  public restore = vi.fn((_d: Doc, _c: Doc | null) => of({}));
  public getEntries = vi.fn(() => of([] as HistoryEntryInfo[]));
  public getCurrentCalls = 0;

  constructor(current: Doc | null, latest: HistoryEntryInfo | null) {
    this.current = current;
    this.latest = latest;
  }
  public getLatestEntry(): Observable<HistoryEntryInfo | null> {
    return of(this.latest);
  }
  public getEntryData(info: HistoryEntryInfo): Observable<Doc> {
    const d = this.data.get(info.id);
    return d ? of(d) : throwError(() => 'not found');
  }
  public getCurrent(): Observable<Doc | null> {
    this.getCurrentCalls++;
    return of(this.current);
  }
  public getCreationTime(current: Doc | null): Date | undefined {
    return current?.timeCreated;
  }
  public getModifiedTime(current: Doc): Date | undefined {
    return current.timeModified;
  }
  public toJsonObject(data: Doc): unknown {
    return { id: data.id, text: data.text };
  }
}

@Component({
  template: `
    <cadmus-model-history-view
      [adapter]="adapter()"
      [editorTemplate]="withEditor() ? tpl : undefined"
      [canRestore]="canRestore()"
      (restored)="restored.push($event)"
    />
    <ng-template #tpl let-entry>
      <span class="test-editor">{{ entry.data.text }}</span>
    </ng-template>
  `,
  imports: [ModelHistoryViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  public readonly adapter = signal<FakeAdapter>(
    new FakeAdapter(null, null),
  );
  public readonly withEditor = signal(true);
  public readonly canRestore = signal(true);
  public readonly view = viewChild.required(ModelHistoryViewComponent);
  public restored: unknown[] = [];
}

describe('history view helpers', () => {
  it('buildHistoryPresetRanges should build relative presets and custom', () => {
    const now = new Date(2026, 10, 23, 12).getTime();
    const presets = buildHistoryPresetRanges(now);
    expect(presets.map((p) => p.label)).toEqual([
      'last day',
      'last week',
      'last month',
      'last year',
      'custom…',
    ]);
    expect(presets[0].start.value).toBe(now - DAY_MS);
    expect(presets[1].start.value).toBe(now - 7 * DAY_MS);
    expect(new Date(presets[2].start.value).getMonth()).toBe(9);
    expect(new Date(presets[3].start.value).getFullYear()).toBe(2025);
    expect(presets.slice(0, 4).every((p) => p.end.value === now)).toBe(true);
    expect(presets[4].start.value).toBe(0);
    expect(presets[4].end.value).toBe(0);
  });

  it('getInitialHistoryViewRange should be the last week for recent edits', () => {
    const now = new Date(2026, 10, 23).getTime();
    const r = getInitialHistoryViewRange(now, now - DAY_MS);
    expect(r.start.value).toBe(now - 7 * DAY_MS);
    expect(r.end.value).toBe(now);
    expect(getInitialHistoryViewRange(now).end.value).toBe(now);
  });

  it('getInitialHistoryViewRange should end at an old latest edit', () => {
    const now = new Date(2026, 10, 23).getTime();
    const latest = now - 30 * DAY_MS;
    const r = getInitialHistoryViewRange(now, latest);
    expect(r.start.value).toBe(latest - 7 * DAY_MS);
    expect(r.end.value).toBe(latest + HOUR_MS);
  });
});

describe('ModelHistoryViewComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let dialog: { confirm: ReturnType<typeof vi.fn> };
  let snackbar: { open: ReturnType<typeof vi.fn> };

  const created = new Date(2026, 0, 1);
  const t1 = new Date(Date.now() - 3 * DAY_MS);
  const t2 = new Date(Date.now() - DAY_MS);

  function makeAdapter(): FakeAdapter {
    const current: Doc = {
      id: 'd1',
      text: 'v2',
      timeCreated: created,
      timeModified: t2,
    };
    const adapter = new FakeAdapter(current, makeInfo('h2', t2));
    adapter.data.set('h1', { ...current, text: 'v1', timeModified: t1 });
    adapter.data.set('h2', current);
    return adapter;
  }

  async function create(adapter: FakeAdapter): Promise<ModelHistoryViewComponent<Doc>> {
    dialog = { confirm: vi.fn().mockReturnValue(of(true)) };
    snackbar = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: DialogService, useValue: dialog },
        { provide: MatSnackBar, useValue: snackbar },
      ],
    });
    TestBed.overrideComponent(ModelHistoryViewComponent, {
      remove: { imports: [TimelineComponent, JsonDiffViewComponent] },
      add: { imports: [TimelineStubComponent, JsonDiffViewStubComponent] },
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.adapter.set(adapter);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return host.view() as ModelHistoryViewComponent<Doc>;
  }

  function el(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  function selectEntry(view: ModelHistoryViewComponent<Doc>, info: HistoryEntryInfo): void {
    view.selection.set([view.source().toPoint(info)]);
    fixture.detectChanges();
  }

  it('should load the current version and select the newest entry', async () => {
    const view = await create(makeAdapter());

    expect(view.current()?.text).toBe('v2');
    expect(view.latest()?.id).toBe('h2');
    expect(view.entry()?.info.id).toBe('h2');
    expect(view.entry()?.data.text).toBe('v2');
    expect(view.isCurrent()).toBe(true);
    expect(view.isLatest()).toBe(true);
    // the view is the last week
    const range = view.viewRange()!;
    expect(range.end.value - range.start.value).toBe(7 * DAY_MS);
  });

  it('should span the timeline from the creation time to now', async () => {
    const view = await create(makeAdapter());
    const total = view.timelineRange()!;
    expect(total.start.value).toBeLessThanOrEqual(created.getTime());
    expect(total.end.value).toBeGreaterThanOrEqual(Date.now());
    expect(view.maxZoom()).toBeGreaterThanOrEqual(200);
    expect(el('tm-timeline')).toBeTruthy();
  });

  it('should render the selected version in the editor template', async () => {
    const view = await create(makeAdapter());
    expect(el('.test-editor')?.textContent).toBe('v2');

    selectEntry(view, makeInfo('h1', t1));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(view.entry()?.data.text).toBe('v1');
    expect(el('.test-editor')?.textContent).toBe('v1');
    expect(view.isCurrent()).toBe(false);
    expect(view.isLatest()).toBe(false);
  });

  it('should show the editor and code tabs', async () => {
    await create(makeAdapter());
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]'),
    ).map((t) => t.textContent?.trim());
    expect(labels).toEqual(['editor', 'code']);
  });

  it('should show only the code tab without an editor template', async () => {
    const view = await create(makeAdapter());
    host.withEditor.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]'),
    ).map((t) => t.textContent?.trim());
    expect(labels).toEqual(['code']);
    expect(view.entryJson()).toContain('"v2"');
  });

  it('should provide the JSON of the selected and of the current version', async () => {
    const view = await create(makeAdapter());
    selectEntry(view, makeInfo('h1', t1));
    await fixture.whenStable();
    expect(JSON.parse(view.entryJson()!)).toEqual({ id: 'd1', text: 'v1' });
    expect(JSON.parse(view.currentJson()!)).toEqual({ id: 'd1', text: 'v2' });
  });

  it('should hide the code tab when there is no current version', async () => {
    const adapter = new FakeAdapter(null, makeInfo('h1', t1));
    adapter.data.set('h1', {
      id: 'd1',
      text: 'v1',
      timeCreated: created,
      timeModified: t1,
    });
    await create(adapter);
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]'),
    ).map((t) => t.textContent?.trim());
    expect(labels).toEqual(['editor']);
    // no restore without a current version
    expect(el('.history-restore')).toBeNull();
  });

  it('should show a message when there is no history', async () => {
    const view = await create(
      new FakeAdapter(
        { id: 'd1', text: 'x', timeCreated: created, timeModified: t1 },
        null,
      ),
    );
    expect(view.entry()).toBeUndefined();
    expect(el('.history-empty')?.textContent).toContain('No saved versions');
  });

  it('should clear the entry when the selection is cleared', async () => {
    const view = await create(makeAdapter());
    view.selection.set([]);
    fixture.detectChanges();
    expect(view.entry()).toBeUndefined();
    expect(el('.history-empty')?.textContent).toContain('Select a version');
  });

  it('should show the metadata of the selected version', async () => {
    await create(makeAdapter());
    const text = el('.history-metadata')!.textContent!;
    expect(text).toContain('zeus');
    expect(text).toContain('hera');
    expect(text).toContain('updated');
    expect(text).toContain('current');
  });

  it('should disable restore for the current version', async () => {
    await create(makeAdapter());
    expect((el('.history-restore') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should hide restore when not allowed', async () => {
    const adapter = makeAdapter();
    await create(adapter);
    host.canRestore.set(false);
    fixture.detectChanges();
    expect(el('.history-restore')).toBeNull();
  });

  it('should restore after confirmation and reload', async () => {
    const adapter = makeAdapter();
    const view = await create(adapter);
    selectEntry(view, makeInfo('h1', t1));
    await fixture.whenStable();
    fixture.detectChanges();
    const timeline = fixture.debugElement
      .query((d) => d.componentInstance instanceof TimelineStubComponent)
      .componentInstance as TimelineStubComponent;

    (el('.history-restore') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(dialog.confirm).toHaveBeenCalled();
    expect(adapter.restore).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'v1' }),
      expect.objectContaining({ text: 'v2' }),
    );
    expect(host.restored.length).toBe(1);
    expect(timeline.reload).toHaveBeenCalled();
    // the current version was reloaded before confirming, and after
    expect(adapter.getCurrentCalls).toBeGreaterThanOrEqual(3);
  });

  it('should warn when the current version changed meanwhile', async () => {
    const adapter = makeAdapter();
    const view = await create(adapter);
    selectEntry(view, makeInfo('h1', t1));
    await fixture.whenStable();
    adapter.current = { ...adapter.current!, text: 'changed' };

    view.restore();

    expect(dialog.confirm.mock.calls[0][1]).toContain('changed by someone');
  });

  it('should not restore when the user cancels', async () => {
    const adapter = makeAdapter();
    const view = await create(adapter);
    dialog.confirm.mockReturnValue(of(false));
    selectEntry(view, makeInfo('h1', t1));
    await fixture.whenStable();

    view.restore();

    expect(adapter.restore).not.toHaveBeenCalled();
  });

  it('should notify restore errors', async () => {
    const adapter = makeAdapter();
    const view = await create(adapter);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    adapter.restore.mockReturnValue(throwError(() => 'boom'));
    selectEntry(view, makeInfo('h1', t1));
    await fixture.whenStable();

    view.restore();

    expect(snackbar.open).toHaveBeenCalledWith('Error restoring doc', 'OK');
    expect(view.busy()).toBe(false);
    err.mockRestore();
  });

  it('should notify entry load errors', async () => {
    const view = await create(makeAdapter());
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    selectEntry(view, makeInfo('missing', t1));
    expect(view.entry()).toBeUndefined();
    expect(snackbar.open).toHaveBeenCalledWith(
      'Error loading doc version',
      'OK',
    );
    err.mockRestore();
  });

  it('should download the JSON of the selected version', async () => {
    const view = await create(makeAdapter());
    const createUrl = vi.fn().mockReturnValue('blob:x');
    const revokeUrl = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = revokeUrl;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    let anchor: HTMLAnchorElement | undefined;
    click.mockImplementation(function (this: HTMLAnchorElement) {
      anchor = this;
    });

    try {
      view.download();
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      click.mockRestore();
    }

    const blob: Blob = createUrl.mock.calls[0][0];
    expect(blob.type).toBe('application/json');
    expect(JSON.parse(await blob.text())).toEqual({ id: 'd1', text: 'v2' });
    expect(anchor?.download).toMatch(/^doc-d1-\d{14}\.json$/);
    expect(revokeUrl).toHaveBeenCalledWith('blob:x');
  });

  it('selectLatest should select the newest entry and center on it', async () => {
    const view = await create(makeAdapter());
    selectEntry(view, makeInfo('h1', t1));
    await fixture.whenStable();
    const timeline = fixture.debugElement
      .query((d) => d.componentInstance instanceof TimelineStubComponent)
      .componentInstance as TimelineStubComponent;

    view.selectLatest();
    fixture.detectChanges();

    expect(view.entry()?.info.id).toBe('h2');
    expect(timeline.centerOn).toHaveBeenCalledWith(t2.getTime());
  });

  it('should notify initialization errors', async () => {
    const adapter = makeAdapter();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    adapter.getCurrent = () => throwError(() => 'down');
    const view = await create(adapter);
    expect(view.current()).toBeNull();
    expect(snackbar.open).toHaveBeenCalledWith(
      'Error loading doc history',
      'OK',
    );
    err.mockRestore();
  });

  it('should ignore stale entry loads', async () => {
    const adapter = makeAdapter();
    const view = await create(adapter);
    const pending = new Subject<Doc>();
    adapter.getEntryData = vi.fn((info: HistoryEntryInfo) =>
      info.id === 'h1' ? pending.asObservable() : of(adapter.data.get('h2')!),
    );
    selectEntry(view, makeInfo('h1', t1));
    selectEntry(view, makeInfo('h2b', t2));
    pending.next({ ...adapter.data.get('h1')! });

    expect(view.entry()?.info.id).toBe('h2b');
  });
});
