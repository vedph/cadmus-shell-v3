import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogConfig,
} from '@angular/material/dialog';
import { FlagDefinition } from '@myrmidon/cadmus-core';
import {
  MatFormField,
  MatLabel,
  MatHint,
  MatError,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';

/**
 * Simple item generate dialog. This allows the user to enter a title template
 * and flags, and returns the entered values if not cancelled.
 */
@Component({
  selector: 'cadmus-item-generate-dialog',
  templateUrl: './item-generate-dialog.component.html',
  styleUrl: './item-generate-dialog.component.scss',
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatHint,
    MatError,
    MatSelect,
    MatOption,
    MatButton,
  ],
})
export class ItemGenerateDialogComponent {
  public flags: FlagDefinition[] = [];

  public itemCount: FormControl<number>;
  public itemTitle: FormControl<string>;
  public itemFlags: FormControl<FlagDefinition[]>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<ItemGenerateDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public config: MatDialogConfig
  ) {
    this.itemCount = formBuilder.control<number>(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(100)],
    });
    this.itemTitle = formBuilder.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    });
    this.itemFlags = formBuilder.control<FlagDefinition[]>([], {
      nonNullable: true,
    });
    this.form = formBuilder.group({
      itemCount: this.itemCount,
      itemTitle: this.itemTitle,
      itemFlags: this.itemFlags,
    });
    // flags definitions
    this.flags = (config as any)?.flags || [];
  }

  public apply(): void {
    if (!this.form.valid) {
      return;
    }

    // calculate flags value by ORing the IDs
    const flags = this.itemFlags.value.reduce((acc, f) => acc | f.id, 0);

    this.dialogRef.close({
      count: this.itemCount.value,
      title: this.itemTitle.value,
      flags: flags,
    });
  }
}
