import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { TextSpan } from '@myrmidon/cadmus-api';

import { DecoratedLayerPartInfo } from '../text-preview/text-preview.component';

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
  ],
  templateUrl: './text-spans-view.component.html',
  styleUrl: './text-spans-view.component.css',
})
export class TextSpansViewComponent {
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
  public readonly rows = computed<TextSpan[][]>(() => {
    return this.buildRows(this.spans());
  });

  /**
   * Emitted when a span is clicked.
   */
  public readonly spanClick = output<TextSpan>();

  private buildRows(spans: TextSpan[]): TextSpan[][] {
    const rows: TextSpan[][] = [];
    let row: TextSpan[] = [];

    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      row.push(span);
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
}
