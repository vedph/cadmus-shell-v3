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
          useValue: { echarts: () => Promise.resolve({}) },
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
    expect(component.created.value).toBe(true);
    expect(component.updated.value).toBe(true);
    expect(component.deleted.value).toBe(true);
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
            useValue: { echarts: () => Promise.resolve({}) },
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

      expect(component.start.value).toEqual(start);
      expect(component.end.value).toEqual(end);
      expect(component.interval.value).toBe('1w');
    });
  });

  describe('loadData', () => {
    it('should not call the service when start/end/interval are incomplete', () => {
      statsService.getEditFrameStats.mockClear();
      component.start.setValue(null);
      component.end.setValue(null);
      component.loadData();
      expect(statsService.getEditFrameStats).not.toHaveBeenCalled();
    });

    it('should set an error and not call the service when start >= end', () => {
      component.start.setValue(new Date(2024, 0, 2));
      component.end.setValue(new Date(2024, 0, 1));
      component.interval.setValue('1d');
      statsService.getEditFrameStats.mockClear();

      component.loadData();

      expect(component.error()).toBe('Start date must be before end date');
      expect(statsService.getEditFrameStats).not.toHaveBeenCalled();
    });

    it('should load stats and populate data on success', () => {
      const stats = [makeStat()];
      statsService.getEditFrameStats.mockReturnValue(of(stats));
      component.start.setValue(new Date(2024, 0, 1));
      component.end.setValue(new Date(2024, 0, 31));
      component.interval.setValue('1d');

      component.loadData();

      expect(component.data()).toEqual(stats);
      expect(component.loading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('should set loading true while the request is pending', () => {
      const subject = new Subject<ItemEditFrameStats[]>();
      statsService.getEditFrameStats.mockReturnValue(subject);
      component.start.setValue(new Date(2024, 0, 1));
      component.end.setValue(new Date(2024, 0, 31));
      component.interval.setValue('1d');

      component.loadData();
      expect(component.loading()).toBe(true);

      subject.next([]);
      expect(component.loading()).toBe(false);
    });

    it('should set an error and stop loading when the request fails', () => {
      statsService.getEditFrameStats.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      component.start.setValue(new Date(2024, 0, 1));
      component.end.setValue(new Date(2024, 0, 31));
      component.interval.setValue('1d');

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
    it('should debounce and reload when start/end/interval change', async () => {
      vi.useFakeTimers();
      try {
        statsService.getEditFrameStats.mockClear();
        component.start.setValue(new Date(2024, 0, 1));
        component.end.setValue(new Date(2024, 0, 31));
        component.interval.setValue('1w');

        vi.advanceTimersByTime(300);

        expect(statsService.getEditFrameStats).toHaveBeenCalledWith(
          new Date(2024, 0, 1),
          new Date(2024, 0, 31),
          '1w',
          100,
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not reload when the same start/end/interval values are re-set', async () => {
      vi.useFakeTimers();
      try {
        const start = new Date(2024, 0, 1);
        const end = new Date(2024, 0, 31);
        component.start.setValue(start);
        component.end.setValue(end);
        component.interval.setValue('1d');
        vi.advanceTimersByTime(300);
        statsService.getEditFrameStats.mockClear();

        // re-setting equal (but distinct Date instances / same string)
        // values must not trigger a redundant reload
        component.start.setValue(new Date(start.getTime()));
        component.end.setValue(new Date(end.getTime()));
        component.interval.setValue('1d');
        vi.advanceTimersByTime(300);

        expect(statsService.getEditFrameStats).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('chartOptions', () => {
    it('should return an empty object when there is no data', () => {
      expect(component.chartOptions()).toEqual({});
    });

    it('should build series only for the checked categories', () => {
      component.data.set([makeStat()]);
      component.created.setValue(true);
      component.updated.setValue(false);
      component.deleted.setValue(false);

      const options = component.chartOptions() as any;

      expect(options.series).toHaveLength(1);
      expect(options.series[0].name).toBe('Created');
    });

    it('should include all three series when all checkboxes are checked', () => {
      component.data.set([makeStat()]);
      component.created.setValue(true);
      component.updated.setValue(true);
      component.deleted.setValue(true);

      const options = component.chartOptions() as any;

      expect(options.series.map((s: any) => s.name)).toEqual([
        'Created',
        'Updated',
        'Deleted',
      ]);
    });

    it('should build an empty series list when all checkboxes are unchecked', () => {
      component.data.set([makeStat()]);
      component.created.setValue(false);
      component.updated.setValue(false);
      component.deleted.setValue(false);

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
});
