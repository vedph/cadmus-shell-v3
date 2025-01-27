import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { Item } from '@myrmidon/cadmus-core';
import { ItemRefLookupService } from '@myrmidon/cadmus-refs-asserted-ids';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

/**
 * Simple item lookup dialog. This allows the user to select an item from
 * its title, and returns the selected item if not cancelled.
 */
@Component({
  selector: 'cadmus-item-lookup-dialog',
  templateUrl: './item-lookup-dialog.component.html',
  styleUrl: './item-lookup-dialog.component.scss',
  imports: [RefLookupComponent],
})
export class ItemLookupDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ItemLookupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public config: MatDialogConfig,
    public itemLookupService: ItemRefLookupService
  ) {}

  public onCancel(): void {
    this.dialogRef.close(null);
  }

  public onItemLookupChange(value: unknown): void {
    this.dialogRef.close(value as Item);
  }
}
