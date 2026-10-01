import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  model,
  effect,
  input,
  output,
  signal,
  computed,
  linkedSignal,
  untracked,
} from '@angular/core';

import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';

import {
  FormField,
  form,
  maxLength,
  pattern,
  required,
} from '@angular/forms/signals';

import { TextTile, TEXT_TILE_TEXT_DATA_NAME } from '../tiled-text-part';

interface TextTileControls {
  editedText: string;
}

function getTileText(tile?: TextTile): string | undefined {
  return tile?.data ? tile.data[TEXT_TILE_TEXT_DATA_NAME] : undefined;
}

@Component({
  selector: 'cadmus-text-tile',
  templateUrl: './text-tile.component.html',
  styleUrls: ['./text-tile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatCheckbox,
  ],
})
export class TextTileComponent {
  @ViewChild('textInput')
  public textElement?: ElementRef;

  public readonly selected = input<boolean>();
  public readonly checkable = input<boolean>();
  public readonly readonly = input<boolean>();
  public readonly color = input<string>();

  public readonly checked = model<boolean>(false);
  public readonly tile = model<TextTile>();

  public readonly editData = output<TextTile>();

  /**
   * The tile's text.
   */
  public readonly text = computed<string | undefined>(() =>
    getTileText(this.tile()),
  );
  public readonly editing = signal<boolean>(false);

  // form
  private readonly _draft = linkedSignal<TextTileControls>(() => ({
    editedText: this.text() || '',
  }));
  public readonly form = form(this._draft, (p) => {
    required(p.editedText);
    maxLength(p.editedText, 100);
    pattern(p.editedText, /^[^\s]+$/);
  });

  constructor() {
    // a new tile was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.tile();
      untracked(() => this.form().reset());
    });
  }

  /**
   * Handle a change of the check box, which is shown only when checkable.
   * @param checked The new checked state.
   */
  public onCheckerChange(checked: boolean): void {
    if (!this.checkable() || !this.tile()) {
      return;
    }
    this.checked.set(checked);
  }

  public requestDataEdit(): void {
    // BUG FIX: same pattern as above -- `this.readonly` (without the call
    // parens) is the input signal function itself, always truthy, so
    // `!this.readonly` was always false and this method could never emit,
    // regardless of the actual readonly() value. Call the signal.
    if (!this.readonly()) {
      this.editData.emit(this.tile()!);
    }
  }

  public toggleCheckedNonEdit(): void {
    // BUG FIX: `this.editing` (without the call parens) is the signal
    // *function* itself, which is always truthy, so `!this.editing` was
    // always false and this method never toggled the checked state (e.g.
    // the space-bar keyboard shortcut in the template was a no-op). Call
    // the signal to read its actual value.
    if (!this.editing() && this.checkable()) {
      this.checked.set(!this.checked());
    }
  }

  public edit(): void {
    if (this.editing() || this.readonly()) {
      return;
    }
    this.editing.set(true);
    setTimeout(() => {
      this.textElement?.nativeElement.focus();
      this.textElement?.nativeElement.select();
    }, 500);
  }

  public requestEditData(): void {
    if (this.editing() || this.readonly()) {
      return;
    }
    this.editData.emit(this.tile()!);
  }

  public cancel(): void {
    this.editing.set(false);
  }

  private getTile(): TextTile {
    const tile: TextTile = { ...this.tile()!, data: {} };
    tile.data![TEXT_TILE_TEXT_DATA_NAME] =
      this._draft().editedText.trim() || undefined;
    return tile;
  }

  public save(): void {
    if (this.form().invalid() || this.readonly() || !this.tile()) {
      return;
    }
    this.tile.set(this.getTile());
    this.editing.set(false);
  }
}
