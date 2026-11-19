import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, FormRoot, form, maxLength } from '@angular/forms/signals';

import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
  MatCardSubtitle,
  MatCardAvatar,
} from '@angular/material/card';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatChip, MatChipRemove, MatChipSet } from '@angular/material/chips';
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatTooltip } from '@angular/material/tooltip';

import { TokenLocation } from '@myrmidon/cadmus-core';
import {
  DecoratedTokenTextComponent,
  DecoratedTokenTextSelection,
  TokenTextSegmenter,
} from '@myrmidon/cadmus-ui';

/**
 * The default demo text.
 */
export const LAYER_DEMO_TEXT = 'alpha beta\ngamma\ndelta epsilon waw\nzeta';

/**
 * Text layers demo page. This lets users play with the token-based
 * coordinates system used by Cadmus text layers, as implemented by
 * `DecoratedTokenTextComponent` and its `TokenTextSegmenter`:
 * - enter a base text, which is displayed live.
 * - add fragments (i.e. their locations) either by typing their
 * coordinates, or by selecting a portion of the text. Fragment characters
 * are highlighted and blocked, so that a new selection can never overlap
 * them.
 * - click a fragment to pick it, viewing its location and text, or
 * removing it.
 */
@Component({
  selector: 'cadmus-layer-demo',
  templateUrl: './layer-demo.component.html',
  styleUrls: ['./layer-demo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatButton,
    MatIconButton,
    MatChipSet,
    MatChip,
    MatChipRemove,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatIcon,
    MatTooltip,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    FormField,
    FormRoot,
    DecoratedTokenTextComponent,
  ],
})
export class LayerDemoComponent {
  private readonly _segmenter = new TokenTextSegmenter();
  private readonly _textView = viewChild(DecoratedTokenTextComponent);

  /**
   * The fragments locations, in their order.
   */
  public readonly locations = signal<TokenLocation[]>([]);

  /**
   * The location of the picked fragment, if any.
   */
  public readonly selectedLocation = signal<TokenLocation | undefined>(
    undefined,
  );

  /**
   * The current text selection.
   */
  public readonly selection = signal<DecoratedTokenTextSelection | null>(
    null,
  );

  /**
   * The text size in pixels.
   */
  public readonly textSize = signal<number>(16);

  /**
   * The error for the typed location, if any.
   */
  public readonly locationError = signal<string | null>(null);

  /**
   * The demo form. This is a submission root: submitting it (e.g. with
   * Enter in the location input) adds the typed location.
   */
  public readonly demoForm = form(
    signal({
      text: LAYER_DEMO_TEXT,
      location: '1.2@2x2',
    }),
    (path) => {
      maxLength(path.text, 5000);
    },
    {
      submission: {
        action: async () => {
          this.addTypedLocation();
          return undefined;
        },
        ignoreValidators: 'all',
      },
    },
  );

  /**
   * The base text.
   */
  public readonly text = computed(() => this.demoForm.text().value() || '');

  private readonly _blocks = computed(() =>
    this._segmenter.getBlocks(this.text()),
  );

  /**
   * The text of the picked fragment.
   */
  public readonly selectedText = computed(() => {
    const loc = this.selectedLocation();
    if (!loc) {
      return '';
    }
    const segments = this._segmenter.getLocationSegments(this._blocks(), loc);
    return segments
      ? this._segmenter.getSegmentsText(this._blocks(), segments)
      : '';
  });

  public makeLarger(): void {
    this.textSize.update((size) => Math.min(24, size + 2));
  }

  public makeSmaller(): void {
    this.textSize.update((size) => Math.max(12, size - 2));
  }

  private removeOverlaps(loc: TokenLocation, locations: TokenLocation[]): void {
    for (let i = locations.length - 1; i > -1; i--) {
      if (loc !== locations[i] && loc.overlaps(locations[i])) {
        locations.splice(i, 1);
      }
    }
  }

  /**
   * Add the specified location to the fragments, keeping them sorted.
   * Like the backend does when adding a fragment to a layer part, any
   * existing fragment overlapping the new one is removed.
   * @returns True if added.
   */
  public addLocation(loc: TokenLocation): boolean {
    const locations = [...this.locations()];
    let done = false;
    for (let i = 0; i < locations.length && !done; i++) {
      const n = loc.compareTo(locations[i]);
      // nothing to do if equal
      if (n === 0) {
        return false;
      }
      // insert before nearest bigger sort value
      if (n < 0) {
        locations.splice(i, 0, loc);
        done = true;
      }
    }
    // append if not yet inserted
    if (!done) {
      locations.push(loc);
    }
    this.removeOverlaps(loc, locations);
    this.locations.set(locations);
    return true;
  }

  /**
   * Add the location typed in the form.
   */
  public addTypedLocation(): void {
    const value = this.demoForm.location().value()?.trim();
    if (!value) {
      this.locationError.set(null);
      return;
    }
    const loc = TokenLocation.parse(value);
    if (
      !loc ||
      !this._segmenter.getCoordsSegments(this._blocks(), loc.toString())
    ) {
      this.locationError.set(
        loc ? 'location not found in text' : 'invalid location',
      );
      return;
    }
    this.locationError.set(null);
    this.addLocation(loc);
  }

  /**
   * Add the location of the current selection.
   */
  public addSelection(): void {
    const loc = this.selection()?.location;
    if (loc && this.addLocation(loc)) {
      this.selection.set(null);
    }
  }

  /**
   * Handle a new selection in the text.
   */
  public onSelectionChange(selection: DecoratedTokenTextSelection): void {
    this.selection.set(selection.coords ? selection : null);
  }

  /**
   * Pick the specified fragment.
   */
  public pickLocation(loc: TokenLocation): void {
    this.selectedLocation.set(loc);
  }

  public removeLocation(loc: TokenLocation): void {
    const i = this.locations().indexOf(loc);
    if (i > -1) {
      const locations = [...this.locations()];
      locations.splice(i, 1);
      this.locations.set(locations);
      if (this.selectedLocation() === loc) {
        this.selectedLocation.set(undefined);
      }
    }
  }

  public clearLocations(): void {
    this.locations.set([]);
    this.selectedLocation.set(undefined);
  }

  /**
   * Clear the text selection.
   */
  public clearSelection(): void {
    this._textView()?.clearSelection();
    this.selection.set(null);
  }
}
