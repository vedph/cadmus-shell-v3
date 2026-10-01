import {
  Component,
  ViewChild,
  ElementRef,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  maxLength,
  required,
} from '@angular/forms/signals';

import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { SafeHtmlPipe } from '@myrmidon/ngx-tools';

import { TextLayerService, TokenLocation } from '@myrmidon/cadmus-core';

@Component({
  selector: 'cadmus-layer-demo',
  templateUrl: './layer-demo.component.html',
  styleUrls: ['./layer-demo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    FormField,
    FormRoot,
    MatFormField,
    MatLabel,
    MatInput,
    MatHint,
    MatToolbar,
    MatIconButton,
    MatTooltip,
    MatIcon,
    SafeHtmlPipe,
  ],
})
export class LayerDemoComponent {
  @ViewChild('resultElem') _resultElement?: ElementRef;

  public readonly locations = signal<TokenLocation[]>([]);
  public readonly result = signal<string>('');
  public readonly userLocation = signal<TokenLocation | undefined>(undefined);
  public readonly textSize = signal<number>(14);

  /**
   * The rendition form. This page is a submission root: submitting it
   * (the render button, or Enter in the location input) renders the text.
   * As with the old ngSubmit, rendering does not depend on validity: the
   * location is required only to add it.
   */
  public readonly rendition = form(
    signal({
      text: 'alpha beta\ngamma\ndelta epsilon waw\nzeta',
      location: '1.2@2x2',
    }),
    (path) => {
      maxLength(path.text, 1000);
      required(path.location);
    },
    {
      submission: {
        action: async () => {
          this.render();
          return undefined;
        },
        ignoreValidators: 'all',
      },
    },
  );

  constructor(private _textLayerService: TextLayerService) {}

  public makeLarger(): void {
    const size = this.textSize() + 2;
    if (size > 24) {
      return;
    }
    this.textSize.set(size);
  }

  public makeSmaller(): void {
    const size = this.textSize() - 2;
    if (size < 12) {
      return;
    }
    this.textSize.set(size);
  }

  private removeOverlaps(loc: TokenLocation): void {
    const locations = [...this.locations()];

    for (let i = locations.length - 1; i > -1; i--) {
      if (loc === locations[i]) {
        continue;
      }
      if (loc.overlaps(locations[i])) {
        locations.splice(i, 1);
      }
    }

    this.locations.set(locations);
  }

  public addLocation(): void {
    const location = this.rendition.location().value();
    if (!location) {
      return;
    }
    const loc = TokenLocation.parse(location);
    if (!loc) {
      return;
    }

    const locations = [...this.locations()];
    let done = false;
    for (let i = 0; i < locations.length && !done; i++) {
      const n = loc.compareTo(locations[i]);
      // nothing to do if equal
      if (n === 0) {
        return;
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
    this.locations.set(locations);

    // remove all the overlapping locations
    this.removeOverlaps(loc);
  }

  public removeLocation(loc: TokenLocation): void {
    const i = this.locations().indexOf(loc);
    if (i > -1) {
      const locations = [...this.locations()];
      locations.splice(i, 1);
      this.locations.set(locations);
    }
  }

  public clearLocations(): void {
    this.locations.set([]);
  }

  public render(): void {
    const text = this.rendition.text().value();
    if (!text) {
      return;
    }
    this.result.set(this._textLayerService.render(text, this.locations()));
  }

  public getLocationForNew(): void {
    const text = this.rendition.text().value();
    if (!text) {
      return;
    }
    this.userLocation.set(
      this._textLayerService.getSelectedLocationForNew(
        this._textLayerService.getSelectedRange()!,
        text,
      ) || undefined,
    );
  }

  public getLocationForEdit(): void {
    this.userLocation.set(
      this._textLayerService.getSelectedLocationForEdit(
        this._textLayerService.getSelectedRange()!,
      ) || undefined,
    );
  }
}
