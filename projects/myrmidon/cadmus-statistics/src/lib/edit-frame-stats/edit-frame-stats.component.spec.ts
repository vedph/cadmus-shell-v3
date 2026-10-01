import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { of, throwError, Subject } from 'rxjs';

import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { StatsService, ItemEditFrameStats } from '@myrmidon/cadmus-api';

import { EditFrameStatsComponent } from './edit-frame-stats.component';

// NgxEchartsDirective.ngOnInit() creates a ResizeObserver, which jsdom does
// not implement; stub a no-op so the directive can initialize under test.
class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as any).ResizeObserver ??= MockResizeObserver;

function makeStat(overrides?: Partial<ItemEditFrameStats>): ItemEditFrameStats {
  return {
    start: new Date(2024, 0, 1),
    end: new Date(2024, 0, 2),
    createdCount: 1,
    updatedCount: 2,
    deletedCount: 3,
    ...overrides,
  };
}

describe('EditFrameStatsComponent', () => {
  let component: EditFrameStatsComponent;
  let fixture: ComponentFixture<EditFrameStatsComponent>;
  let statsService: { getEditFrameStats: ReturnType<typeof vi.fn> };

  async function configure() {
    TestBed.resetTestingModule();
    statsService = {
      getEditFrameStats: vi.fn().mockReturnValue(of([makeStat()])),
    };

    await TestBed.configureTestingModule({
      imports: [EditFrameStatsComponent],
      providers: [
        provideNativeDateAdapter(),
        { provide: StatsService, useValue: statsService },
        // NgxEchartsDirective needs this token; stub it out rather than
        // pulling in the real echarts bundle for a unit test.
        {
          provide: NGX_ECHARTS_CONFIG,
          // init returns a chart whose every method is a no-op: tests that
          // wait for real timers let the directive initialize it
          useValue: {
            echarts: () =>
              Promise.resolve({
                init: () => new Proxy({}, { get: () => () => {} }),
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditFrameStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default created/updated/deleted checkboxes to true', () => {
    expect(component.form.created().value()).toBe(true);
    expect(component.form.updated().value()).toBe(true);
    expect(component.form.deleted().value()).toBe(true);
  });

  describe('initial* inputs', () => {
    it('should set start/end/interval from the initial* inputs', async () => {
      TestBed.resetTestingModule();
      statsService = { getEditFrameStats: vi.fn().mockReturnValue(of([])) };
      await TestBed.configureTestingModule({
        imports: [EditFrameStatsComponent],
        providers: [
        provideNativeDateAdapter(),
          { provide: StatsService, useValue: statsService },
          {
            provide: NGX_ECHARTS_CONFIG,
            // init returns a chart whose every method is a no-op: tests that
          // wait for real timers let the directive initialize it
          useValue: {
            echarts: () =>
              Promise.resolve({
                init: () => new Proxy({}, { get: () => () => {} }),
              }),
          },
          },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(EditFrameStatsComponent);
      component = fixture.componentInstance;

      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 0, 31);
      fixture.componentRef.setInput('initialStart', start);
      fixture.componentRef.setInput('initialEnd', end);
      fixture.componentRef.setInput('initialInterval', '1w');
      fixture.detectChanges();

      expect(component.form.start().value()).toEqual(start);
      expect(component.form.end().value()).toEqual(end);
      expect(component.form.interval().value()).toBe('1w');
    });
  });

  describe('loadData', () => {
    it('should not call the service when start/end/interval are incomplete', () => {
      statsService.getEditFrameStats.mockClear();
      component.form.start().value.set(null);
      component.form.end().value.set(null);
      component.loadData();
      expect(statsService.getEditFrameStats).not.toHaveBeenCalled();
    });

    it('should set an error and not call the service when start >= end', () => {
      component.form.start().value.set(new Date(2024, 0, 2));
      component.form.end().value.set(new Date(2024, 0, 1));
      component.form.interval().value.set('1d');
      statsService.getEditFrameStats.mockClear();

      component.loadData();

      expect(component.error()).toBe('Start date must be before end date');
      expect(statsService.getEditFrameStats).not.toHaveBeenCalled();
    });

    it('should load stats and populate data on success', () => {
      const stats = [makeStat()];
      statsService.getEditFrameStats.mockReturnValue(of(stats));
      component.form.start().value.set(new Date(2024, 0, 1));
      component.form.end().value.set(new Date(2024, 0, 31));
      component.form.interval().value.set('1d');

      component.loadData();

      expect(component.data()).toEqual(stats);
      expect(component.loading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('should set loading true while the request is pending', () => {
      const subject = new Subject<ItemEditFrameStats[]>();
      statsService.getEditFrameStats.mockReturnValue(subject);
      component.form.start().value.set(new Date(2024, 0, 1));
      component.form.end().value.set(new Date(2024, 0, 31));
      component.form.interval().value.set('1d');

      component.loadData();
      expect(component.loading()).toBe(true);

      subject.next([]);
      expect(component.loading()).toBe(false);
    });

    it('should set an error and stop loading when the request fails', () => {
      statsService.getEditFrameStats.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      component.form.start().value.set(new Date(2024, 0, 1));
      component.form.end().value.set(new Date(2024, 0, 31));
      component.form.interval().value.set('1d');

      component.loadData();

      expect(component.error()).toBe('Failed to load statistics data');
      expect(component.loading()).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should delegate to loadData', () => {
      const spy = vi.spyOn(component, 'loadData');
      component.refresh();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('auto-refresh on form changes', () => {
    // the auto-refresh pipeline starts from toObservable, which emits from
    // an effect: flush it with change detection, then wait past the debounce
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    it('should debounce and reload when start/end/interval change', async () => {
      statsService.getEditFrameStats.mockClear();
      component.form.start().value.set(new Date(2024, 0, 1));
      component.form.end().value.set(new Date(2024, 0, 31));
      component.form.interval().value.set('1w');
      fixture.detectChanges();
      expect(statsService.getEditFrameStats).not.toHaveBeenCalled();

      await wait(350);

      expect(statsService.getEditFrameStats).toHaveBeenCalledTimes(1);
      expect(statsService.getEditFrameStats).toHaveBeenCalledWith(
        new Date(2024, 0, 1),
        new Date(2024, 0, 31),
        '1w',
        100,
      );
    });

    it('should not reload when the same start/end/interval values are re-set', async () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 0, 31);
      component.form.start().value.set(start);
      component.form.end().value.set(end);
      component.form.interval().value.set('1d');
      fixture.detectChanges();
      await wait(350);
      expect(statsService.getEditFrameStats).toHaveBeenCalled();
      statsService.getEditFrameStats.mockClear();

      // re-setting equal (but distinct Date instances / same string)
      // values must not trigger a redundant reload
      component.form.start().value.set(new Date(start.getTime()));
      component.form.end().value.set(new Date(end.getTime()));
      component.form.interval().value.set('1d');
      fixture.detectChanges();
      await wait(350);

      expect(statsService.getEditFrameStats).not.toHaveBeenCalled();
    });

    it('should auto-load once from the initial* inputs', async () => {
      statsService.getEditFrameStats.mockClear();
      fixture.componentRef.setInput('initialStart', new Date(2024, 0, 1));
      fixture.componentRef.setInput('initialEnd', new Date(2024, 0, 31));
      fixture.detectChanges();
      await wait(350);
      expect(statsService.getEditFrameStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('chartOptions', () => {
    it('should return an empty object when there is no data', () => {
      expect(component.chartOptions()).toEqual({});
    });

    it('should build series only for the checked categories', () => {
      component.data.set([makeStat()]);
      component.form.created().value.set(true);
      component.form.updated().value.set(false);
      component.form.deleted().value.set(false);

      const options = component.chartOptions() as any;

      expect(options.series).toHaveLength(1);
      expect(options.series[0].name).toBe('Created');
    });

    it('should include all three series when all checkboxes are checked', () => {
      component.data.set([makeStat()]);
      component.form.created().value.set(true);
      component.form.updated().value.set(true);
      component.form.deleted().value.set(true);

      const options = component.chartOptions() as any;

      expect(options.series.map((s: any) => s.name)).toEqual([
        'Created',
        'Updated',
        'Deleted',
      ]);
    });

    it('should build an empty series list when all checkboxes are unchecked', () => {
      component.data.set([makeStat()]);
      component.form.created().value.set(false);
      component.form.updated().value.set(false);
      component.form.deleted().value.set(false);

      const options = component.chartOptions() as any;

      expect(options.series).toEqual([]);
    });

    it('should format the tooltip with the period and series values', () => {
      component.data.set([makeStat()]);
      const options = component.chartOptions() as any;
      const tooltip = options.tooltip.formatter([
        { dataIndex: 0, seriesName: 'Created', value: 1 },
      ]);
      expect(tooltip).toContain('Created: 1');
    });
  });

  describe('signal form', () => {
    it('should not stomp a user-edited date when another initial* input changes', () => {
      fixture.componentRef.setInput('initialStart', new Date(2024, 0, 1));
      fixture.detectChanges();
      const picked = new Date(2024, 5, 1);
      component.form.start().value.set(picked);

      fixture.componentRef.setInput('initialEnd', new Date(2024, 11, 31));
      fixture.detectChanges();

      expect(component.form.start().value()).toBe(picked);
      expect(component.form.end().value()).toEqual(new Date(2024, 11, 31));
    });

    it('should not clear a date when its initial* input becomes null', () => {
      fixture.componentRef.setInput('initialStart', new Date(2024, 0, 1));
      fixture.detectChanges();
      fixture.componentRef.setInput('initialStart', null);
      fixture.detectChanges();
      expect(component.form.start().value()).toEqual(new Date(2024, 0, 1));
    });

    it('should hide a series when its checkbox is unchecked in the DOM', () => {
      const box: HTMLInputElement = fixture.nativeElement.querySelector(
        'mat-checkbox.created input'
      );
      box.click();
      fixture.detectChanges();
      expect(component.createdSignal()).toBe(false);
      expect(component.form.created().value()).toBe(false);
    });
  });
});
