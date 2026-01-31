import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  OnDestroy,
  model,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { distinctUntilChanged } from 'rxjs/operators';

import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';

import {
  FormControl,
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { TextTile, TEXT_TILE_TEXT_DATA_NAME } from '../tiled-text-part';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cadmus-text-tile',
  templateUrl: './text-tile.component.html',
  styleUrls: ['./text-tile.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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
export class TextTileComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  private _checkedChangeFrozen?: boolean;

  @ViewChild('textInput')
  public textElement?: ElementRef;

  public readonly selected = input<boolean>();
  public readonly checkable = input<boolean>();
  public readonly readonly = input<boolean>();
  public readonly color = input<string>();

  public readonly checked = model<boolean>(false);
  public readonly tile = model<TextTile>();

  public readonly editData = output<TextTile>();

  public editedText: FormControl<string | null>;
  public checker: FormControl<boolean>;
  public form: FormGroup;

  public readonly text = signal<string | undefined>(undefined);
  public readonly editing = signal<boolean>(false);

  constructor(formBuilder: FormBuilder) {
    // form
    this.editedText = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(100),
      Validators.pattern(/^[^\s]+$/),
    ]);
    this.form = formBuilder.group({
      editedText: this.editedText,
    });

    this.checker = formBuilder.control(false, { nonNullable: true });

    effect(() => {
      const tile = this.tile();
      this.updateForm(tile);
    });

    effect(() => {
      this._checkedChangeFrozen = true;
      this.checker.setValue(this.checked());
      this._checkedChangeFrozen = false;
    });
  }

  public ngOnInit(): void {
    this._sub = this.checker.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((_) => {
        if (this._checkedChangeFrozen || !this.checkable) {
          return;
        }
        if (this.tile()) {
          this.checked.set(this.checker.value);
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private updateForm(tile?: TextTile): void {
    if (!tile) {
      this.form.reset();
      this.text.set(undefined);
    } else {
      this.text.set(
        tile.data ? tile.data[TEXT_TILE_TEXT_DATA_NAME] : undefined,
      );
      this.editedText.setValue(this.text() || null);
      this.form.markAsPristine();
    }
  }

  public requestDataEdit(): void {
    if (!this.readonly) {
      this.editData.emit(this.tile()!);
    }
  }

  public toggleCheckedNonEdit(): void {
    if (!this.editing && this.checkable()) {
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
    this.text.set(this.editedText.value?.trim() || undefined);
    tile.data![TEXT_TILE_TEXT_DATA_NAME] = this.text();
    return tile;
  }

  public save(): void {
    if (this.form.invalid || this.readonly() || !this.tile()) {
      return;
    }
    this.tile.set(this.getTile());
    this.editing.set(false);
  }
}
