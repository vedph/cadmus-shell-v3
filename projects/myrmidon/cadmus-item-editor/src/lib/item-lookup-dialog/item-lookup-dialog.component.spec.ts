import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ItemLookupDialogComponent } from './item-lookup-dialog.component';
import { ItemRefLookupService } from '@myrmidon/cadmus-refs-asserted-ids';
import { Item } from '@myrmidon/cadmus-core';

describe('ItemLookupDialogComponent', () => {
  let component: ItemLookupDialogComponent;
  let fixture: ComponentFixture<ItemLookupDialogComponent>;
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ItemLookupDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        {
          provide: ItemRefLookupService,
          useValue: { id: 'item', lookup: vi.fn(), getName: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemLookupDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close with null on cancel', () => {
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });

  it('should close with the picked item on lookup change', () => {
    const item = { id: 'item1' } as Item;
    component.onItemLookupChange(item);
    expect(dialogRef.close).toHaveBeenCalledWith(item);
  });
});
