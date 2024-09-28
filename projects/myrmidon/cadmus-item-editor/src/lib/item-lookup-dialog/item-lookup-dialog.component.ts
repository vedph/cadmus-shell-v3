import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { Item } from '@myrmidon/cadmus-core';
import { ItemRefLookupService } from '@myrmidon/cadmus-refs-asserted-ids';

/**
 * Simple item lookup dialog. This allows the user to select an item from
 * its title, and returns the selected item or null if cancelled.
 */
@Component({
  selector: 'cadmus-item-lookup-dialog',
  templateUrl: './item-lookup-dialog.component.html',
  styleUrl: './item-lookup-dialog.component.scss',
})
export class ItemLookupDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ItemLookupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public config: MatDialogConfig,
    public itemLookupService: ItemRefLookupService,
  ) {}

  public onCancel(): void {
    this.dialogRef.close(null);
  }

  public onItemLookupChange(value: Item): void {
    this.dialogRef.close(value);
  }
}
