import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  signal,
} from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  max,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';
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
 * The editable shape behind the form. Flags are held by ID (not as
 * FlagDefinition objects, which are owned by the dialog's caller).
 */
interface ItemGenerateControls {
  itemCount: number | null;
  itemTitle: string;
  itemFlags: number[];
}

/**
 * Simple item generate dialog. This allows the user to enter a title template
 * and flags, and returns the entered values if not cancelled.
 */
@Component({
  selector: 'cadmus-item-generate-dialog',
  templateUrl: './item-generate-dialog.component.html',
  styleUrl: './item-generate-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
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
  public readonly flags = signal<FlagDefinition[]>([]);

  private readonly _draft = signal<ItemGenerateControls>({
    itemCount: 1,
    itemTitle: '',
    itemFlags: [],
  });

  /**
   * The form. This dialog is a real submission root: submitting it (with
   * the generate button, or Enter) runs apply() when the form is valid.
   */
  public readonly form = form(
    this._draft,
    (path) => {
      required(path.itemCount);
      min(path.itemCount, 1);
      max(path.itemCount, 100);
      required(path.itemTitle);
      maxLength(path.itemTitle, 500);
    },
    {
      submission: {
        action: async () => {
          this.apply();
          return undefined;
        },
      },
    },
  );

  constructor(
    public dialogRef: MatDialogRef<ItemGenerateDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public config: MatDialogConfig,
  ) {
    // flags definitions
    this.flags.set((config as any)?.flags || []);
  }

  public apply(): void {
    if (!this.form().valid()) {
      return;
    }
    const v = this._draft();

    // calculate flags value by ORing the IDs
    const flags = v.itemFlags.reduce((acc, id) => acc | id, 0);

    this.dialogRef.close({
      count: v.itemCount,
      title: v.itemTitle,
      flags: flags,
    });
  }
}
