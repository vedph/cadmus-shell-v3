import {
  Component,
  effect,
  input,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
  combineLatest,
} from 'rxjs';
import { EChartsOption } from 'echarts';

import { ItemEditFrameStats, StatsService } from '@myrmidon/cadmus-api';

@Component({
  selector: 'cadmus-edit-frame-stats',
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
})
export class EditFrameStatsComponent implements OnDestroy {
  private readonly _destroy$ = new Subject<void>();

  // input signals for initial values
  public readonly initialStart = input<Date | null>(null);
  public readonly initialEnd = input<Date | null>(null);
  public readonly initialInterval = input<string>('1d');

  public readonly created: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });
  public readonly updated: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });
  public readonly deleted: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });
  public readonly start: FormControl<Date | null> =
    new FormControl<Date | null>(null);
  public readonly end: FormControl<Date | null> = new FormControl<Date | null>(
    null
  );
  public readonly interval: FormControl<string> = new FormControl<string>(
    '1d',
    { nonNullable: true }
  );

  public readonly data = signal<ItemEditFrameStats[]>([]);
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  // chart options computed signal
  public readonly chartOptions = computed<EChartsOption>(() => {
    const stats = this.data();
    const showCreated = this.created.value;
    const showUpdated = this.updated.value;
    const showDeleted = this.deleted.value;

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
                stat.start
              ).toLocaleDateString()} - ${new Date(
                stat.end
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
    // Set initial values from input signals
    effect(() => {
      const initialStart = this.initialStart();
      if (initialStart) {
        this.start.setValue(initialStart);
      }
    });

    effect(() => {
      const initialEnd = this.initialEnd();
      if (initialEnd) {
        this.end.setValue(initialEnd);
      }
    });

    effect(() => {
      const initialInterval = this.initialInterval();
      if (initialInterval) {
        this.interval.setValue(initialInterval);
      }
    });

    // auto-refresh data when start, end, or interval changes
    combineLatest([
      this.start.valueChanges,
      this.end.valueChanges,
      this.interval.valueChanges,
    ])
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this._destroy$)
      )
      .subscribe(() => {
        this.loadData();
      });

    // listen to visibility control changes to trigger chart update
    combineLatest([
      this.created.valueChanges,
      this.updated.valueChanges,
      this.deleted.valueChanges,
    ])
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => {
        // chart will update automatically via computed signal
      });

    // initial load
    this.loadData();
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public loadData(): void {
    const startValue = this.start.value;
    const endValue = this.end.value;
    const intervalValue = this.interval.value;

    if (!startValue || !endValue || !intervalValue) {
      return;
    }

    // Ensure we have proper dates
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
