import {
  Component,
  input,
  linkedSignal,
  signal,
  computed,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { NgxEchartsDirective } from 'ngx-echarts';
import {
  Subject,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import { EChartsOption } from 'echarts';

import { ItemEditFrameStats, StatsService } from '@myrmidon/cadmus-api';

/**
 * The editable shape behind the controls.
 */
interface EditFrameStatsControls {
  created: boolean;
  updated: boolean;
  deleted: boolean;
  start: Date | null;
  end: Date | null;
  interval: string;
}

/**
 * The initial* inputs.
 */
interface EditFrameStatsInitials {
  start: Date | null;
  end: Date | null;
  interval: string;
}

@Component({
  selector: 'cadmus-edit-frame-stats',
  imports: [
    FormField,
    NgxEchartsDirective,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './edit-frame-stats.component.html',
  styleUrl: './edit-frame-stats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFrameStatsComponent implements OnDestroy {
  private readonly _destroy$ = new Subject<void>();

  // input signals for initial values
  public readonly initialStart = input<Date | null>(null);
  public readonly initialEnd = input<Date | null>(null);
  public readonly initialInterval = input<string>('1d');

  /**
   * The controls values. Each initial* input, when it changes to a truthy
   * value, sets its own control; the others keep their current values.
   */
  private readonly _draft = linkedSignal<
    EditFrameStatsInitials,
    EditFrameStatsControls
  >({
    source: () => ({
      start: this.initialStart(),
      end: this.initialEnd(),
      interval: this.initialInterval(),
    }),
    computation: (initials, previous) => {
      const v = previous?.value ?? {
        created: true,
        updated: true,
        deleted: true,
        start: null,
        end: null,
        interval: '1d',
      };
      const changed = (key: keyof EditFrameStatsInitials) =>
        !!initials[key] && initials[key] !== previous?.source[key];
      return {
        ...v,
        start: changed('start') ? initials.start : v.start,
        end: changed('end') ? initials.end : v.end,
        interval: changed('interval') ? initials.interval : v.interval,
      };
    },
  });

  public readonly form = form(this._draft);

  // checkboxes values, for reactive computation
  public readonly createdSignal = computed(() => this.form.created().value());
  public readonly updatedSignal = computed(() => this.form.updated().value());
  public readonly deletedSignal = computed(() => this.form.deleted().value());

  public readonly data = signal<ItemEditFrameStats[]>([]);
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  // chart options computed signal
  public readonly chartOptions = computed<EChartsOption>(() => {
    const stats = this.data();
    const showCreated = this.createdSignal();
    const showUpdated = this.updatedSignal();
    const showDeleted = this.deletedSignal();

    if (!stats || stats.length === 0) {
      return {};
    }

    // create time frame labels from start/end dates
    const xAxisData = stats.map((s) => {
      if (s.start) {
        // format the date for display
        return new Date(s.start).toLocaleDateString();
      }
      return '';
    });

    const series: any[] = [];

    if (showCreated) {
      series.push({
        name: 'Created',
        type: 'line',
        data: stats.map((s) => s.createdCount),
        itemStyle: { color: '#28a745' },
        lineStyle: { color: '#28a745' },
        symbol: 'circle',
        symbolSize: 6,
      });
    }

    if (showUpdated) {
      series.push({
        name: 'Updated',
        type: 'line',
        data: stats.map((s) => s.updatedCount),
        itemStyle: { color: '#007bff' },
        lineStyle: { color: '#007bff' },
        symbol: 'circle',
        symbolSize: 6,
      });
    }

    if (showDeleted) {
      series.push({
        name: 'Deleted',
        type: 'line',
        data: stats.map((s) => s.deletedCount),
        itemStyle: { color: '#dc3545' },
        lineStyle: { color: '#dc3545' },
        symbol: 'circle',
        symbolSize: 6,
      });
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
        formatter: (params: any) => {
          const dataIndex = params[0]?.dataIndex;
          if (dataIndex !== undefined && stats[dataIndex]) {
            const stat = stats[dataIndex];
            let tooltip = '';
            if (stat.start && stat.end) {
              tooltip += `Period: ${new Date(
                stat.start,
              ).toLocaleDateString()} - ${new Date(
                stat.end,
              ).toLocaleDateString()}<br/>`;
            }
            params.forEach((param: any) => {
              tooltip += `${param.seriesName}: ${param.value}<br/>`;
            });
            return tooltip;
          }
          return '';
        },
      },
      legend: {
        data: series.map((s) => s.name),
        orient: 'horizontal',
        left: 'center',
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '60px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xAxisData,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Count',
        nameLocation: 'middle',
        nameGap: 40,
        min: 0,
      },
      series: series,
      animation: true,
      animationDuration: 1000,
    };
  });

  constructor(private _statsService: StatsService) {
    // auto-refresh data when start, end, or interval change
    toObservable(
      computed(
        () =>
          [
            this.form.start().value(),
            this.form.end().value(),
            this.form.interval().value(),
          ] as const,
      ),
    )
      .pipe(
        debounceTime(300),
        // a new array instance is emitted each time, so compare the
        // tuple's own values to skip redundant reloads
        distinctUntilChanged(
          (a, b) =>
            a[0]?.getTime() === b[0]?.getTime() &&
            a[1]?.getTime() === b[1]?.getTime() &&
            a[2] === b[2],
        ),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        this.loadData();
      });

    // initial load
    this.loadData();
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public loadData(): void {
    const startValue = this.form.start().value();
    const endValue = this.form.end().value();
    const intervalValue = this.form.interval().value();

    if (!startValue || !endValue || !intervalValue) {
      return;
    }

    // ensure we have proper dates
    let startDate: Date;
    let endDate: Date;

    try {
      startDate =
        startValue instanceof Date ? startValue : new Date(startValue);
      endDate = endValue instanceof Date ? endValue : new Date(endValue);

      // validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        this.error.set('Invalid date format');
        return;
      }

      // validate that start is before end
      if (startDate >= endDate) {
        this.error.set('Start date must be before end date');
        return;
      }
    } catch (err) {
      this.error.set('Invalid date format');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this._statsService
      .getEditFrameStats(startDate, endDate, intervalValue, 100)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (stats) => {
          this.data.set(stats);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load statistics data');
          this.loading.set(false);
          console.error('Error loading edit frame stats:', err);
        },
      });
  }

  public refresh(): void {
    this.loadData();
  }
}
