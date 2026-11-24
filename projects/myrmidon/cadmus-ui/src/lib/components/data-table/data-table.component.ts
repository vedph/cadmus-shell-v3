import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';

/**
 * Size class of a data table, according to the width available to it:
 * - `xs`: < 640px
 * - `sm`: 640-899px
 * - `md`: 900-1099px
 * - `lg`: 1100-1399px
 * - `xl`: >= 1400px
 */
export type DataTableSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * The minimum width (in pixels) of each data table size class.
 */
export const DATA_TABLE_BREAKPOINTS: Readonly<Record<DataTableSize, number>> =
  {
    xs: 0,
    sm: 640,
    md: 900,
    lg: 1100,
    xl: 1400,
  };

/**
 * Responsive data table wrapper. Wrap a plain HTML `table` with it to get:
 *
 * - M3-compliant table styles (theme tokens, dividers, zebra rows, hover,
 *   `tr.selected`), with cell content aligned to the top;
 * - horizontal scroll as a last resort, so columns never get cut;
 * - column visibility driven by the width actually available to the table
 *   (CSS container queries), via `dt-hide-lt-sm|md|lg|xl` classes on both
 *   `th` and `td`;
 * - the current width and size class as signals (`width`, `size`), e.g. to
 *   adapt text lengths via `pick`.
 *
 * Utility classes for cells (`th` and/or `td`):
 * - `dt-fit`: the column takes only the width required by its content, which
 *   never wraps (e.g. badges);
 * - `dt-actions`: like `dt-fit`, for cells with icon buttons;
 * - `dt-badge`: aligns badges with the text of the row;
 * - `dt-truncate`: no wrap, truncated with ellipsis beyond a max width
 *   (`--dt-truncate-max-width`, auto-reduced for narrower sizes);
 * - `dt-wrap`: text wrapping freely, absorbing the remaining width;
 * - `dt-meta`: compact secondary data (no wrap, smaller and dimmer text);
 * - `dt-only-lt-sm|md|lg|xl`: content shown only below the given size
 *   (use on inline wrappers like `span`).
 *
 * Example:
 * ```html
 * <cadmus-data-table #dt="cadmusDataTable">
 *   <table>
 *     <thead><tr><th class="dt-actions"></th>...</tr></thead>
 *     <tbody>...</tbody>
 *   </table>
 * </cadmus-data-table>
 * ```
 */
@Component({
  selector: 'cadmus-data-table',
  exportAs: 'cadmusDataTable',
  template: '<ng-content />',
  styleUrls: ['./data-table.component.css'],
  // styles target the projected table, and are scoped by this element's tag
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent {
  private readonly _width = signal<number>(0);

  /**
   * The current width (in pixels) available to the table, or 0 when not
   * yet measured.
   */
  public readonly width = this._width.asReadonly();

  /**
   * The current size class of the table. Until the width is measured,
   * this is `xl`.
   */
  public readonly size = computed<DataTableSize>(() => {
    const w = this._width();
    if (!w || w >= DATA_TABLE_BREAKPOINTS.xl) return 'xl';
    if (w >= DATA_TABLE_BREAKPOINTS.lg) return 'lg';
    if (w >= DATA_TABLE_BREAKPOINTS.md) return 'md';
    if (w >= DATA_TABLE_BREAKPOINTS.sm) return 'sm';
    return 'xs';
  });

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      this._width.set(Math.round(entries[0].contentRect.width));
    });
    observer.observe(el);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  /**
   * Pick a value according to the current size class. This is reactive
   * when called in a template or in a computed signal.
   *
   * @param values The values for each size class.
   * @returns The value for the current size class.
   */
  public pick<T>(values: Record<DataTableSize, T>): T {
    return values[this.size()];
  }
}
