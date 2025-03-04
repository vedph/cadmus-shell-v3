import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { AppRepository } from '@myrmidon/cadmus-state';
import { TextSpan } from '@myrmidon/cadmus-api';

import { DecoratedLayerPartInfo } from '../text-preview/text-preview.component';
import {
  MiniBarChartComponent,
  MiniBarChartItem,
  MiniBarChartOptions,
} from '../mini-bar-chart/mini-bar-chart.component';

interface DecoratedTextSpan extends TextSpan {
  chartItems?: MiniBarChartItem[];
}

/**
 * A component to display a list of text spans, possibly grouped in rows.
 */
@Component({
  selector: 'cadmus-text-spans-view',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ColorToContrastPipe,
    MiniBarChartComponent,
  ],
  templateUrl: './text-spans-view.component.html',
  styleUrl: './text-spans-view.component.css',
})
export class TextSpansViewComponent {
  private readonly _typeMap: Map<string, string>;

  public readonly chartOptions: MiniBarChartOptions = {
    zoomAndPan: true,
  };

  /**
   * The selected layers.
   */
  public readonly layers = input<DecoratedLayerPartInfo[]>();

  /**
   * The spans to display.
   */
  public readonly spans = input<TextSpan[]>([]);

  /**
   * The rows of spans, calculated from spans.
   */
  public readonly rows = computed<DecoratedTextSpan[][]>(() => {
    return this.buildRows(this.spans());
  });

  /**
   * Emitted when a span is clicked.
   */
  public readonly spanClick = output<TextSpan>();

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

  private addChartItems(span: DecoratedTextSpan): void {
    if (!span.range?.fragmentIds?.length || !this.layers()) {
      return;
    }
    // add a chart item for each fragment ID
    let chartItems: MiniBarChartItem[] = [];

    for (let i = 0; i < span.range.fragmentIds.length; i++) {
      const id = span.range.fragmentIds[i];

      // find the layer targeted by the fragment ID
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
      // return a chart item for this span's fragment ID
      chartItems.push({
        id: id,
        label: this._typeMap.get(layer.roleId!) || layer.roleId!,
        color: layer.color || 'transparent',
        value: 1,
      });
    }
    if (chartItems.length) {
      span.chartItems = chartItems;
    }
  }

  private buildRows(spans: TextSpan[]): DecoratedTextSpan[][] {
    const rows: DecoratedTextSpan[][] = [];
    let row: DecoratedTextSpan[] = [];

    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      row.push(span);
      this.addChartItems(span);
      if (span.isBeforeEol) {
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
   * Get the span color by matching any of its fragment IDs with
   * the IDs of the layers.
   * @param span The span.
   * @returns The color for the span.
   */
  public getSpanColor(span: TextSpan): string {
    const layers = this.layers();
    const defaultColor = 'transparent';

    if (!layers || !span.range?.fragmentIds?.length) {
      return defaultColor;
    }

    for (let i = 0; i < span.range.fragmentIds.length; i++) {
      // each fragment ID has form typeId:roleId@frIndex
      const m = /^([^:]+):([^@]+)/.exec(span.range.fragmentIds[i]);
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

  public onSpanClick(span: TextSpan): void {
    this.spanClick.emit(span);
  }

  public onChartItemClicked(item: MiniBarChartItem): void {
    this.fragmentPick.emit(item.id!);
  }
}
