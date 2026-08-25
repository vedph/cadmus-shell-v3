import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ItemGenerateDialogComponent } from './item-generate-dialog.component';
import { FlagDefinition } from '@myrmidon/cadmus-core';

function makeFlag(id: number): FlagDefinition {
  return { id, label: `flag${id}`, description: '', colorKey: 'ff0000' };
}

describe('ItemGenerateDialogComponent', () => {
  let component: ItemGenerateDialogComponent;
  let fixture: ComponentFixture<ItemGenerateDialogComponent>;
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  function createComponent(data: any) {
    dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ItemGenerateDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(ItemGenerateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create with default form values', () => {
    createComponent({ flags: [makeFlag(1), makeFlag(2)] });
    expect(component).toBeTruthy();
    expect(component.itemCount.value).toBe(1);
    expect(component.itemTitle.value).toBe('');
    expect(component.flags()).toEqual([makeFlag(1), makeFlag(2)]);
  });

  it('should default flags to an empty array when config has none', () => {
    createComponent({});
    expect(component.flags()).toEqual([]);
  });

  describe('apply', () => {
    it('should not close the dialog when the form is invalid', () => {
      createComponent({});
      component.itemTitle.setValue(''); // required, stays invalid
      component.apply();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with count/title and OR-ed flags when valid', () => {
      createComponent({});
      component.itemCount.setValue(5);
      component.itemTitle.setValue('Item {0}');
      component.itemFlags.setValue([makeFlag(1), makeFlag(4)]);

      component.apply();

      expect(dialogRef.close).toHaveBeenCalledWith({
        count: 5,
        title: 'Item {0}',
        flags: 5,
      });
    });

    it('should reject a count outside 1-100', () => {
      createComponent({});
      component.itemTitle.setValue('x');
      component.itemCount.setValue(0);
      component.apply();
      expect(dialogRef.close).not.toHaveBeenCalled();

      component.itemCount.setValue(101);
      component.apply();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });
});
