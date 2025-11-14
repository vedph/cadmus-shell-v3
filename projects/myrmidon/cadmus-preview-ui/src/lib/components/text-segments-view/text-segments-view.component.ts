import { Component, computed, input, output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { AppRepository } from '@myrmidon/cadmus-state';
import { ExportedSegment } from '@myrmidon/cadmus-api';

import { DecoratedLayerPartInfo } from '../text-preview/text-preview.component';
import {
  MiniBarChartComponent,
  MiniBarChartItem,
  MiniBarChartOptions,
} from '../mini-bar-chart/mini-bar-chart.component';

interface DecoratedSegment extends ExportedSegment {
  chartItems?: MiniBarChartItem[];
  _uniqueId?: number;
}

// the feature name for end of line at segment end
const F_EOL_TAIL = 'eol-tail';

/**
 * A component to display a list of text segments, possibly grouped in rows.
 */
@Component({
  selector: 'cadmus-text-segments-view',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ColorToContrastPipe,
    MiniBarChartComponent,
  ],
  templateUrl: './text-segments-view.component.html',
  styleUrl: './text-segments-view.component.css',
})
export class TextSegmentsViewComponent {
  private readonly _typeMap: Map<string, string>;

  public readonly chartOptions: MiniBarChartOptions = {
    zoomAndPan: true,
  };

  /**
   * The selected layers.
   */
  public readonly layers = input<DecoratedLayerPartInfo[]>();

  /**
   * The segments to display.
   */
  public readonly segments = input<ExportedSegment[]>([]);

  /**
   * The rows of segments, calculated from segments.
   */
  public readonly rows = computed<DecoratedSegment[][]>(() => {
    return this.buildRows(this.segments());
  });

  /**
   * Emitted when a segment is clicked.
   */
  public readonly segmentClick = output<ExportedSegment>();

  /**
   * Emitted when a chart item is clicked, picking the
   * corresponding fragment.
   */
  public readonly fragmentPick = output<string>();

  constructor(appRepository: AppRepository) {
    this._typeMap = new Map<string, string>();
    const thes = appRepository.getTypeThesaurus();
    if (thes?.entries?.length) {
      thes.entries.forEach((e) => {
        this._typeMap.set(e.id, e.value);
      });
    }
  }

  private addChartItems(segment: DecoratedSegment): void {
    const range = segment.payloads?.[0];
    if (!range?.fragmentIds?.length || !this.layers()) {
      return;
    }
    let chartItems: MiniBarChartItem[] = [];

    for (let i = 0; i < range.fragmentIds.length; i++) {
      const id = range.fragmentIds[i];
      const m = /^([^:]+):([^@]+)/.exec(id);
      if (!m) {
        continue;
      }
      const layer = this.layers()!.find(
        (l) => l.typeId === m![1] && l.roleId === m![2]
      );
      if (!layer) {
        continue;
      }
      chartItems.push({
        id: id,
        label: this._typeMap.get(layer.roleId!) || layer.roleId!,
        color: layer.color || 'transparent',
        value: 1,
      });
    }
    if (chartItems.length) {
      // assign a new array reference
      segment.chartItems = chartItems;
    }
  }

  private buildRows(segments: ExportedSegment[]): DecoratedSegment[][] {
    const rows: DecoratedSegment[][] = [];
    let row: DecoratedSegment[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      // create a new object to avoid mutation
      const decorated: DecoratedSegment = { ...segment, _uniqueId: i };
      this.addChartItems(decorated);
      row.push(decorated);
      if (segment.features?.some((f) => f.name === F_EOL_TAIL)) {
        rows.push(row);
        row = [];
      }
    }
    if (row.length) {
      rows.push(row);
    }
    return rows;
  }

  /**
   * Get the segment color by matching any of its fragment IDs with
   * the IDs of the layers.
   * @param segment The segment.
   * @returns The color for the segment.
   */
  public getSegmentColor(segment: ExportedSegment): string {
    const layers = this.layers();
    const defaultColor = 'transparent';

    const range = segment.payloads?.[0];
    if (!layers || !range?.fragmentIds?.length) {
      return defaultColor;
    }

    for (let i = 0; i < range.fragmentIds.length; i++) {
      // each fragment ID has form typeId:roleId@frIndex
      const m = /^([^:]+):([^@]+)/.exec(range.fragmentIds[i]);
      if (!m) {
        continue;
      }
      const layer = layers.find((l) => l.typeId === m[1] && l.roleId === m[2]);
      if (layer) {
        return layer.color || defaultColor;
      }
    }

    return defaultColor;
  }

  public onSegmentClick(segment: ExportedSegment): void {
    this.segmentClick.emit(segment);
  }

  public onChartItemClicked(item: MiniBarChartItem): void {
    this.fragmentPick.emit(item.id!);
  }
}
