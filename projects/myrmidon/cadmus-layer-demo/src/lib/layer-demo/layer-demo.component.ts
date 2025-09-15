import { Component, ViewChild, ElementRef, signal } from '@angular/core';
import {
  FormGroup,
  FormControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

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
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    FormsModule,
    ReactiveFormsModule,
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

  // form
  public rendition: FormGroup;
  public text: FormControl<string | null>;
  public location: FormControl<string | null>;

  constructor(
    formBuilder: FormBuilder,
    private _textLayerService: TextLayerService
  ) {
    this.text = formBuilder.control(
      'alpha beta\ngamma\ndelta epsilon waw\nzeta'
    );
    this.location = formBuilder.control('1.2@2x2');
    this.rendition = formBuilder.group({
      text: this.text,
      location: this.location,
    });
  }

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
    if (!this.location.value) {
      return;
    }
    const loc = TokenLocation.parse(this.location.value);
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
    if (!this.text.value) {
      return;
    }
    this.result.set(
      this._textLayerService.render(this.text.value, this.locations())
    );
  }

  public getLocationForNew(): void {
    if (!this.text.value) {
      return;
    }
    this.userLocation.set(
      this._textLayerService.getSelectedLocationForNew(
        this._textLayerService.getSelectedRange()!,
        this.text.value
      ) || undefined
    );
  }

  public getLocationForEdit(): void {
    this.userLocation.set(
      this._textLayerService.getSelectedLocationForEdit(
        this._textLayerService.getSelectedRange()!
      ) || undefined
    );
  }
}
