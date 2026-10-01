import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { TiledDataComponent } from './tiled-data.component';

describe('TiledDataComponent', () => {
  let component: TiledDataComponent;
  let fixture: ComponentFixture<TiledDataComponent>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  // the keys of the editing rows
  const rowKeys = () => component.form.rows().value().map((r) => r.key);
  // the value of the editing row with the specified key
  const rowValue = (key: string) =>
    component.form.rows().value().find((r) => r.key === key)?.value;

  beforeEach(async () => {
    dialogService = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [TiledDataComponent],
      providers: [{ provide: DialogService, useValue: dialogService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TiledDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rows (from data/hiddenKeys)', () => {
    it('should have no keys and rows when data is empty object', () => {
      fixture.componentRef.setInput('data', {});
      fixture.detectChanges();
      expect(component.keys()).toEqual([]);
      expect(rowKeys()).toEqual([]);
    });

    it('should build one row per own property, keys sorted alphabetically', () => {
      // inserted out of alphabetical order (z before a) to prove the sort
      fixture.componentRef.setInput('data', { z: '26', a: '1' });
      fixture.detectChanges();

      expect(component.keys().map((k) => k.value)).toEqual(['a', 'z']);
      expect(rowKeys()).toEqual(['a', 'z']);
      expect(rowValue('a')).toBe('1');
      expect(rowValue('z')).toBe('26');
      expect(component.form().dirty()).toBe(false);
    });

    it('should exclude hidden keys from the rows', () => {
      fixture.componentRef.setInput('data', { a: '1', secret: 'shh' });
      fixture.componentRef.setInput('hiddenKeys', ['secret']);
      fixture.detectChanges();

      expect(component.keys().map((k) => k.value)).toEqual(['a']);
      expect(rowKeys()).toEqual(['a']);
    });

    it('should edit non-string values as text', () => {
      fixture.componentRef.setInput('data', { n: 12, e: null });
      fixture.detectChanges();
      expect(rowValue('n')).toBe('12');
      expect(rowValue('e')).toBe('');
    });
  });

  describe('isVisibleKey', () => {
    it('should return false for a key not present in keys', () => {
      expect(component.isVisibleKey('nope')).toBe(false);
    });

    it("should return the matching DataKey's visible flag", () => {
      fixture.componentRef.setInput('data', { a: '1' });
      fixture.detectChanges();
      expect(component.isVisibleKey('a')).toBe(true);
    });
  });

  describe('key filter', () => {
    it('should recompute visibility for all keys when the filter changes', () => {
      fixture.componentRef.setInput('data', { alpha: '1', beta: '2' });
      fixture.detectChanges();

      component.filterForm.keyFilter().value.set('bet');

      const alpha = component.keys().find((k) => k.value === 'alpha')!;
      const beta = component.keys().find((k) => k.value === 'beta')!;
      expect(beta.visible).toBe(true);
      expect(alpha.visible).toBe(false);
    });

    it('should render only the visible rows, and clear the filter', () => {
      fixture.componentRef.setInput('data', { alpha: '1', beta: '2' });
      fixture.detectChanges();
      component.filterForm.keyFilter().value.set('al');
      fixture.detectChanges();
      const labels = () =>
        Array.from(
          fixture.nativeElement.querySelectorAll('td.key-label'),
        ).map((td: any) => td.textContent.trim());
      expect(labels()).toEqual(['alpha']);

      component.clearFilter();
      fixture.detectChanges();
      expect(labels()).toEqual(['alpha', 'beta']);
    });
  });

  describe('addDatum', () => {
    it('should do nothing when newForm is invalid (no key entered)', () => {
      fixture.componentRef.setInput('data', {});
      fixture.detectChanges();
      component.newForm.newValue().value.set('x');
      component.addDatum();
      expect(rowKeys()).toEqual([]);
      expect(component.newForm.newKey().touched()).toBe(true);
    });

    it('should add a new row in order, and reset the new datum form', () => {
      fixture.componentRef.setInput('data', { a: '1', c: '3' });
      fixture.detectChanges();

      component.newForm.newKey().value.set('b');
      component.newForm.newValue().value.set('2');
      component.addDatum();

      expect(rowKeys()).toEqual(['a', 'b', 'c']);
      expect(rowValue('b')).toBe('2');
      expect(component.form().dirty()).toBe(true);
      // the new-datum form is reset after adding
      expect(component.newForm.newKey().value()).toBe('');
      expect(component.newForm.newValue().value()).toBe('');
    });

    it('should not emit data before saving, so the editor stays open', () => {
      fixture.componentRef.setInput('data', { a: '1' });
      fixture.detectChanges();
      const spy = vi.fn();
      component.data.subscribe(spy);

      component.newForm.newKey().value.set('b');
      component.newForm.newValue().value.set('2');
      component.addDatum();
      component.newForm.newKey().value.set('c');
      component.newForm.newValue().value.set('3');
      component.addDatum();

      expect(spy).not.toHaveBeenCalled();
      component.save();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(component.data()).toEqual({ a: '1', b: '2', c: '3' });
    });

    it('should keep the edits of other rows when adding a datum', () => {
      fixture.componentRef.setInput('data', { a: '1' });
      fixture.detectChanges();
      component.form.rows[0]!.value().value.set('edited');

      component.newForm.newKey().value.set('b');
      component.newForm.newValue().value.set('2');
      component.addDatum();
      component.save();

      expect(component.data()).toEqual({ a: 'edited', b: '2' });
    });

    it('should set the value of an existing key', () => {
      fixture.componentRef.setInput('data', { a: '1' });
      fixture.detectChanges();
      component.newForm.newKey().value.set('a');
      component.newForm.newValue().value.set('9');
      component.addDatum();
      expect(rowKeys()).toEqual(['a']);
      expect(rowValue('a')).toBe('9');
    });

    it('should reject a hidden key', () => {
      fixture.componentRef.setInput('data', { a: '1', text: 't' });
      fixture.componentRef.setInput('hiddenKeys', ['text']);
      fixture.detectChanges();
      component.newForm.newKey().value.set('text');
      expect(component.newForm.newKey().getError('hidden')).toBeTruthy();
      component.addDatum();
      expect(rowKeys()).toEqual(['a']);
    });
  });

  describe('deleteDatum', () => {
    it('should not delete when the user cancels the confirmation dialog', () => {
      dialogService.confirm.mockReturnValue(of(false));
      fixture.componentRef.setInput('data', { a: '1' });
      fixture.detectChanges();

      component.deleteDatum({ value: 'a', visible: true });

      expect(rowKeys()).toEqual(['a']);
    });

    it('should delete the row when confirmed, and save without it', () => {
      dialogService.confirm.mockReturnValue(of(true));
      fixture.componentRef.setInput('data', { a: '1', b: '2' });
      fixture.detectChanges();

      component.deleteDatum({ value: 'a', visible: true });

      expect(rowKeys()).toEqual(['b']);
      expect(component.form().dirty()).toBe(true);
      component.save();
      expect(component.data()).toEqual({ b: '2' });
    });
  });

  describe('close', () => {
    it('should emit the cancel output', () => {
      const spy = vi.fn();
      component.cancel.subscribe(spy);
      component.close();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('save', () => {
    it('should not update data when the editing form is invalid', () => {
      fixture.componentRef.setInput('data', { a: '1' });
      fixture.detectChanges();
      component.form.rows[0]!.value().value.set('x'.repeat(101));

      const before = component.data();
      component.save();

      expect(component.data()).toBe(before);
      expect(component.form.rows[0]!.value().touched()).toBe(true);
    });

    it('should set data from the rows + hidden data on save, including edited values', () => {
      fixture.componentRef.setInput('data', { a: '1', secret: 'shh' });
      fixture.componentRef.setInput('hiddenKeys', ['secret']);
      fixture.detectChanges();

      component.form.rows[0]!.value().value.set('changed');
      component.save();

      expect(component.data()).toEqual({ a: 'changed', secret: 'shh' });
    });

    it('should keep the original values (and types) of unchanged data', () => {
      fixture.componentRef.setInput('data', { n: 12, e: null, s: 'x' });
      fixture.detectChanges();
      component.form.rows[2]!.value().value.set('y');
      component.save();
      expect(component.data()).toEqual({ n: 12, e: null, s: 'y' });
    });

    it('should save on Enter in a row input', () => {
      fixture.componentRef.setInput('data', { a: '1' });
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector(
        'td input',
      );
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }),
      );
      expect(component.data()).toEqual({ a: 'typed' });
    });
  });

  it('should render no <form> of its own, and no submit buttons', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('form')).toBeNull();
    expect(root.querySelectorAll('button[type="submit"]').length).toBe(0);
  });

  it('should keep the dirty state of a user edit across change detection', () => {
    fixture.componentRef.setInput('data', { a: '1' });
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'td input',
    );
    input.value = input.value + 'x';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.detectChanges();
    expect(component.form().dirty()).toBe(true);
  });
});
