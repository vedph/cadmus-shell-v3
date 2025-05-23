import { Component, ViewChild, ElementRef } from '@angular/core';
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

  public locations: TokenLocation[];
  public result: string;
  public userLocation?: TokenLocation;
  // form
  public rendition: FormGroup;
  public text: FormControl<string | null>;
  public location: FormControl<string | null>;

  public textSize: number;

  constructor(
    formBuilder: FormBuilder,
    private _textLayerService: TextLayerService
  ) {
    this.textSize = 14;
    this.locations = [];
    this.text = formBuilder.control(
      'alpha beta\ngamma\ndelta epsilon waw\nzeta'
    );
    this.location = formBuilder.control('1.2@2x2');
    this.rendition = formBuilder.group({
      text: this.text,
      location: this.location,
    });
    this.result = '';
  }

  public makeLarger(): void {
    const size = this.textSize + 2;
    if (size > 24) {
      return;
    }
    this.textSize = size;
  }

  public makeSmaller(): void {
    const size = this.textSize - 2;
    if (size < 12) {
      return;
    }
    this.textSize = size;
  }

  private removeOverlaps(loc: TokenLocation): void {
    for (let i = this.locations.length - 1; i > -1; i--) {
      if (loc === this.locations[i]) {
        continue;
      }
      if (loc.overlaps(this.locations[i])) {
        this.locations.splice(i, 1);
      }
    }
  }

  public addLocation(): void {
    if (!this.location.value) {
      return;
    }
    const loc = TokenLocation.parse(this.location.value);
    if (!loc) {
      return;
    }

    let done = false;
    for (let i = 0; i < this.locations.length && !done; i++) {
      const n = loc.compareTo(this.locations[i]);
      // nothing to do if equal
      if (n === 0) {
        return;
      }
      // insert before nearest bigger sort value
      if (n < 0) {
        this.locations.splice(i, 0, loc);
        done = true;
      }
    }
    // append if not yet inserted
    if (!done) {
      this.locations.push(loc);
    }

    // remove all the overlapping locations
    this.removeOverlaps(loc);
  }

  public removeLocation(loc: TokenLocation): void {
    const i = this.locations.indexOf(loc);
    if (i > -1) {
      this.locations.splice(i, 1);
    }
  }

  public clearLocations(): void {
    this.locations.length = 0;
  }

  public render(): void {
    if (!this.text.value) {
      return;
    }
    this.result = this._textLayerService.render(
      this.text.value,
      this.locations
    );
  }

  public getLocationForNew(): void {
    if (!this.text.value) {
      return;
    }
    this.userLocation =
      this._textLayerService.getSelectedLocationForNew(
        this._textLayerService.getSelectedRange()!,
        this.text.value
      ) || undefined;
  }

  public getLocationForEdit(): void {
    this.userLocation =
      this._textLayerService.getSelectedLocationForEdit(
        this._textLayerService.getSelectedRange()!
      ) || undefined;
  }
}
