import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import {
  SegmentedTextSettings,
  SegmentedTextView,
  TextSegment,
  TextSegmentBlock,
  TextSegmentClick,
  TextSegmentSelection,
} from '@myrmidon/cadmus-text-segment';

import { TokenLocation } from '@myrmidon/cadmus-core';

import { TokenTextSegmenter } from './token-text-segmenter';

/**
 * The colors used by `DecoratedTokenTextComponent` to highlight the
 * characters belonging to layer fragments. Colors can be any CSS color,
 * including Angular Material M3 tokens.
 */
export interface DecoratedTokenTextColors {
  /** Fill color of fragment characters. */
  fragmentColor: string;
  /** Text color of fragment characters. */
  fragmentTextColor: string;
  /** Border color of fragment characters. */
  fragmentBorderColor: string;
  /** Fill color of the characters of the selected fragment. */
  selectedFragmentColor: string;
  /** Text color of the characters of the selected fragment. */
  selectedFragmentTextColor: string;
  /** Border color of the characters of the selected fragment. */
  selectedFragmentBorderColor: string;
}

/**
 * The default colors of `DecoratedTokenTextComponent`.
 */
export const DEFAULT_DECORATED_TOKEN_TEXT_COLORS: Readonly<DecoratedTokenTextColors> =
  Object.freeze({
    fragmentColor: 'var(--mat-sys-secondary-container)',
    fragmentTextColor: 'var(--mat-sys-on-secondary-container)',
    fragmentBorderColor: 'var(--mat-sys-secondary)',
    selectedFragmentColor: 'var(--mat-sys-tertiary-container)',
    selectedFragmentTextColor: 'var(--mat-sys-on-tertiary-container)',
    selectedFragmentBorderColor: 'var(--mat-sys-tertiary)',
  });

/**
 * The default display settings of `DecoratedTokenTextComponent`, making
 * the segmented text look like normal text: characters have no border nor
 * fill, there is no gap between them, and lines wrap by word. The text box
 * height is derived from the font size.
 */
export const DEFAULT_DECORATED_TOKEN_TEXT_SETTINGS: Readonly<
  Partial<SegmentedTextSettings>
> = Object.freeze({
  segmentOffset: 0,
  lineOffset: 2,
  blockOffset: 4,
  wrapMode: 'word',
  showBlockNumbers: true,
  color: 'transparent',
  borderColor: 'transparent',
  textRectPadding: 1,
  textRectMinWidth: 4,
  textRectRadius: 2,
  textRectStrokeWidth: 1,
  // the tip of fragment characters is their fragment location
  showTipBox: true,
  tipPosition: 'popup',
});

/**
 * The selection made by the user in a `DecoratedTokenTextComponent`.
 */
export interface DecoratedTokenTextSelection {
  /**
   * The location of the selection, i.e. the location of a new fragment
   * covering it; or null when the selection is empty, or when it overlaps
   * any existing fragment.
   */
  location: TokenLocation | null;
  /**
   * The coordinates of the selection, even when it overlaps an existing
   * fragment; or undefined when the selection is empty.
   */
  coords?: string;
  /**
   * True when the selection overlaps any existing fragment. Selections made
   * by pointer or keyboard never do, as fragment characters are blocked;
   * but users can still type in the coordinates box the coordinates of
   * any portion of the text.
   */
  overlapping: boolean;
  /**
   * The selected text, with blocks separated by a space.
   */
  text: string;
}

const EMPTY_SELECTION: Readonly<DecoratedTokenTextSelection> = Object.freeze({
  location: null,
  overlapping: false,
  text: '',
});

/**
 * Decorated token-based text visualizer. This is used when editing
 * token-based text layers, to display the base text with the fragments of
 * a layer, and to let users select any portion of the text for a new
 * fragment, or pick an existing fragment.
 *
 * It is built on `SegmentedTextView` from `@myrmidon/cadmus-text-segment`,
 * with `TokenTextSegmenter` mapping selections to and from token-based
 * coordinates. Each character of the text is a segment, and each line is a
 * block. The characters covered by any of the `locations` are highlighted
 * and `blocked`: users cannot start, end or extend a selection across
 * them, so that a new fragment can never overlap an existing one (two
 * fragments in the same layer never overlap by design). Clicking a
 * fragment character picks that fragment, setting `selectedLocation`.
 *
 * - ▶️ input:
 *   - `baseText`: the base text.
 *   - `locations`: the locations of all the fragments in the layer.
 *   - `fontSize`: the text font size (px).
 *   - `showToolbar`: true to show the toolbar (zoom, find, coordinates).
 *   - `settings`: optional settings overriding the default ones.
 *   - `colors`: optional colors overriding the default ones.
 * - 🔁 model:
 *   - `selectedLocation`: the location of the selected fragment, if any.
 *   It is set when users click a fragment, and cleared when they select a
 *   new portion of text; it can also be set by the consumer.
 * - 🔥 output:
 *   - `selectionChange`: the new selection made by the user, with its
 *   location (null when empty).
 */
@Component({
  selector: 'cadmus-decorated-token-text',
  templateUrl: './decorated-token-text.component.html',
  styleUrls: ['./decorated-token-text.component.css'],
  imports: [SegmentedTextView],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecoratedTokenTextComponent {
  private readonly _view = viewChild(SegmentedTextView);

  /**
   * The segmenter used for token-based coordinates.
   */
  public readonly segmenter = new TokenTextSegmenter();

  /**
   * The base text.
   */
  public readonly baseText = input<string>('');

  /**
   * The token-based locations of all the fragments in the layer.
   */
  public readonly locations = input<TokenLocation[]>([]);

  /**
   * The location of the selected fragment, if any. Any fragment equal to it
   * is highlighted as selected; if none is equal, any fragment overlapping
   * it is highlighted.
   */
  public readonly selectedLocation = model<TokenLocation | undefined>();

  /**
   * The text font size in pixels.
   */
  public readonly fontSize = input<number>(16);

  /**
   * True to show the toolbar with zoom, find and coordinates.
   */
  public readonly showToolbar = input<boolean>(false);

  /**
   * Optional display settings, overriding the default ones.
   */
  public readonly settings = input<Partial<SegmentedTextSettings>>();

  /**
   * Optional colors, overriding the default ones.
   */
  public readonly colors = input<Partial<DecoratedTokenTextColors>>();

  /**
   * Emitted whenever the user makes a new selection.
   */
  public readonly selectionChange = output<DecoratedTokenTextSelection>();

  /**
   * The IDs of the selected segments.
   */
  public readonly selectedIds = signal<number[]>([]);

  /**
   * The current selection.
   */
  public readonly selection =
    signal<DecoratedTokenTextSelection>(EMPTY_SELECTION);

  /**
   * The undecorated blocks of the base text.
   */
  private readonly _baseBlocks = computed(() =>
    this.segmenter.getBlocks(this.baseText()),
  );

  /**
   * The fragment location of each decorated segment, keyed by segment ID.
   * When fragments overlap (which should never happen), the first one wins.
   */
  public readonly fragmentMap = computed(() => {
    const blocks = this._baseBlocks();
    const map = new Map<number, TokenLocation>();
    for (const loc of this.locations() || []) {
      if (!loc) {
        continue;
      }
      for (const s of this.segmenter.getLocationSegments(blocks, loc) || []) {
        if (!map.has(s.id)) {
          map.set(s.id, loc);
        }
      }
    }
    return map;
  });

  /**
   * The locations of the fragments highlighted as selected.
   */
  private readonly _selectedFragments = computed(() => {
    const sel = this.selectedLocation();
    if (!sel?.primary) {
      return new Set<TokenLocation>();
    }
    const locations = (this.locations() || []).filter((l) => !!l);
    const key = sel.toString();
    const equal = locations.filter((l) => l.toString() === key);
    return new Set(
      equal.length ? equal : locations.filter((l) => l.overlaps(sel)),
    );
  });

  /**
   * The display settings.
   */
  public readonly resolvedSettings = computed<Partial<SegmentedTextSettings>>(
    () => {
      const size = this.fontSize() || 16;
      return {
        ...DEFAULT_DECORATED_TOKEN_TEXT_SETTINGS,
        fontSize: `${size}px`,
        textRectHeight: Math.round(size * 1.5),
        ...(this.settings() || {}),
      };
    },
  );

  /**
   * The blocks to display, i.e. the base text blocks where the segments
   * belonging to fragments are blocked and highlighted.
   */
  public readonly blocks = computed<TextSegmentBlock[]>(() => {
    const blocks = this._baseBlocks();
    const map = this.fragmentMap();
    if (!map.size) {
      return blocks;
    }
    const selected = this._selectedFragments();
    const c = { ...DEFAULT_DECORATED_TOKEN_TEXT_COLORS, ...this.colors() };
    return blocks.map((b) => ({
      index: b.index,
      segments: b.segments.map((s) => {
        const loc = map.get(s.id);
        if (!loc) {
          return s;
        }
        const sel = selected.has(loc);
        const segment: TextSegment = {
          ...s,
          selectionMode: 'blocked',
          tip: loc.toString(),
          color: sel ? c.selectedFragmentColor : c.fragmentColor,
          textColor: sel ? c.selectedFragmentTextColor : c.fragmentTextColor,
          borderColor: sel
            ? c.selectedFragmentBorderColor
            : c.fragmentBorderColor,
          cssClass: sel ? 'fr fr-sel' : 'fr',
        };
        return segment;
      }),
    }));
  });

  constructor() {
    // as each character is a segment, find text across segments by default
    // (i.e. find words rather than single characters)
    effect(() => {
      const view = this._view();
      if (view) {
        untracked(() =>
          view.store.find.update((f) => ({ ...f, crossSegments: true })),
        );
      }
    });

    // when fragments change, a selection including any of their characters
    // (e.g. the one just used to add a fragment) is no longer valid
    effect(() => {
      const map = this.fragmentMap();
      untracked(() => {
        if (this.selectedIds().some((id) => map.has(id))) {
          this.clearSelection();
        }
      });
    });
  }

  /**
   * Handle a new selection made in the view.
   */
  public onSelectionChange(selection: TextSegmentSelection): void {
    const map = this.fragmentMap();
    const overlapping = selection.ids.some((id) => map.has(id));
    const sel: DecoratedTokenTextSelection = {
      location:
        selection.coords && !overlapping
          ? TokenLocation.parse(selection.coords)
          : null,
      coords: selection.coords,
      overlapping,
      text: this.segmenter.getSegmentsText(this.blocks(), selection.segments),
    };
    this.selection.set(sel);
    // a new selection replaces the picked fragment
    if (selection.ids.length) {
      this.selectedLocation.set(undefined);
    }
    this.selectionChange.emit(sel);
  }

  /**
   * Handle a click on a segment: clicking a fragment picks it.
   */
  public onSegmentClick(click: TextSegmentClick): void {
    const loc = this.fragmentMap().get(click.segment.id);
    if (loc) {
      this.selectedLocation.set(loc);
    }
  }

  /**
   * Get the text of the specified location, as displayed.
   * @param location The location.
   * @returns The text, or an empty string if the location is not valid.
   */
  public getLocationText(location: TokenLocation): string {
    const blocks = this._baseBlocks();
    const segments = this.segmenter.getLocationSegments(blocks, location);
    return segments ? this.segmenter.getSegmentsText(blocks, segments) : '';
  }

  /**
   * Clear the current selection, if any.
   */
  public clearSelection(): void {
    const view = this._view();
    if (view) {
      // this emits selectionChange via onSelectionChange, if required
      view.clearSelection();
    } else if (this.selectedIds().length) {
      this.selectedIds.set([]);
      this.selection.set(EMPTY_SELECTION);
      this.selectionChange.emit(EMPTY_SELECTION);
    }
  }
}
