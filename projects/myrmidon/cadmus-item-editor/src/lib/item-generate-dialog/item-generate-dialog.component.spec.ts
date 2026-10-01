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
    expect(component.form.itemCount().value()).toBe(1);
    expect(component.form.itemTitle().value()).toBe('');
    expect(component.flags()).toEqual([makeFlag(1), makeFlag(2)]);
  });

  it('should default flags to an empty array when config has none', () => {
    createComponent({});
    expect(component.flags()).toEqual([]);
  });

  describe('apply', () => {
    it('should not close the dialog when the form is invalid', () => {
      createComponent({});
      component.form.itemTitle().value.set(''); // required, stays invalid
      component.apply();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with count/title and OR-ed flags when valid', () => {
      createComponent({});
      component.form.itemCount().value.set(5);
      component.form.itemTitle().value.set('Item {0}');
      // flags are held by ID
      component.form.itemFlags().value.set([1, 4]);

      component.apply();

      expect(dialogRef.close).toHaveBeenCalledWith({
        count: 5,
        title: 'Item {0}',
        flags: 5,
      });
    });

    it('should reject a count outside 1-100', () => {
      createComponent({});
      component.form.itemTitle().value.set('x');
      component.form.itemCount().value.set(0);
      component.apply();
      expect(dialogRef.close).not.toHaveBeenCalled();

      component.form.itemCount().value.set(101);
      component.apply();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('submission root', () => {
    it('renders a <form> that submits via apply when valid', async () => {
      createComponent({});
      component.form.itemTitle().value.set('Item {0}');
      fixture.detectChanges();

      const formEl: HTMLFormElement =
        fixture.nativeElement.querySelector('form');
      const event = new Event('submit', { cancelable: true });
      formEl.dispatchEvent(event);
      await Promise.resolve();

      // [formRoot] prevents the native submission (no page reload)
      expect(event.defaultPrevented).toBe(true);
      expect(dialogRef.close).toHaveBeenCalledWith({
        count: 1,
        title: 'Item {0}',
        flags: 0,
      });
    });

    it('does not submit when invalid, and reveals the errors', async () => {
      createComponent({});
      fixture.detectChanges();
      fixture.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await Promise.resolve();

      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(component.form.itemTitle().touched()).toBe(true);
    });

    it('renders the count limits as min/max attributes', () => {
      createComponent({});
      const input: HTMLInputElement = fixture.nativeElement.querySelector(
        'input[type="number"]'
      );
      expect(input.min).toBe('1');
      expect(input.max).toBe('100');
    });

    it('does not tag the caller\'s flag definitions', () => {
      const flags = [makeFlag(1), makeFlag(4)];
      createComponent({ flags });
      component.form.itemFlags().value.set([1, 4]);
      fixture.detectChanges();
      expect(flags.every((f) => !Object.getOwnPropertySymbols(f).length)).toBe(
        true
      );
    });
  });
});
