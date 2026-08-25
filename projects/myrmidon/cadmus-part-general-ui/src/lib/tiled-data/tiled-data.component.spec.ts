import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { TiledDataComponent } from './tiled-data.component';

describe('TiledDataComponent', () => {
  let component: TiledDataComponent;
  let fixture: ComponentFixture<TiledDataComponent>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

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

  describe('updateForm (via data/hiddenKeys effect)', () => {
    it('should reset keys and form when data is empty object', () => {
      fixture.componentRef.setInput('data', {});
      fixture.detectChanges();
      expect(component.keys).toEqual([]);
      expect(Object.keys(component.form.controls)).toEqual([]);
    });

    it('should build one form control per own property, keys sorted alphabetically by value', () => {
      // inserted out of alphabetical order (z before a) to prove the sort
      // actually reorders them (see bug fix in updateForm: cache.sort() with
      // no comparator on DataKey objects was previously a no-op)
      fixture.componentRef.setInput('data', { z: '26', a: '1' });
      fixture.detectChanges();

      expect(component.keys.map((k) => k.value)).toEqual(['a', 'z']);
      expect(component.form.contains('a')).toBe(true);
      expect(component.form.contains('z')).toBe(true);
      expect(component.form.controls['a'].value).toBe('1');
      expect(component.form.controls['z'].value).toBe('26');
    });

    it('should move hidden keys into the internal hidden-data bucket and exclude them from the form', () => {
      fixture.componentRef.setInput('data', { a: '1', secret: 'shh' });
      fixture.componentRef.setInput('hiddenKeys', ['secret']);
      fixture.detectChanges();

      expect(component.keys.map((k) => k.value)).toEqual(['a']);
      expect(component.form.contains('secret')).toBe(false);
      expect(component.form.contains('a')).toBe(true);
    });

    it('should mark a DataKey visible/invisible depending on the current key filter', () => {
      fixture.componentRef.setInput('data', { alpha: '1', beta: '2' });
      fixture.detectChanges();
      component.keyFilter.setValue('al');
      // matchesFilter is invoked from updateForm at the time data/hiddenKeys
      // change; force a re-run by re-setting data (same reference triggers a
      // new object identity through setInput below)
      fixture.componentRef.setInput('data', { alpha: '1', beta: '2' });
      fixture.detectChanges();

      const alpha = component.keys.find((k) => k.value === 'alpha')!;
      const beta = component.keys.find((k) => k.value === 'beta')!;
      expect(alpha.visible).toBe(true);
      expect(beta.visible).toBe(false);
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

  describe('updateDataVisibility (via keyFilter valueChanges, debounced)', () => {
    it('should recompute visibility for all keys when the filter changes', async () => {
      vi.useFakeTimers();
      fixture.componentRef.setInput('data', { alpha: '1', beta: '2' });
      fixture.detectChanges();

      component.keyFilter.setValue('bet');
      vi.advanceTimersByTime(310);

      const alpha = component.keys.find((k) => k.value === 'alpha')!;
      const beta = component.keys.find((k) => k.value === 'beta')!;
      expect(beta.visible).toBe(true);
      expect(alpha.visible).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('addDatum', () => {
    it('should do nothing when newForm is invalid (no key entered)', () => {
      fixture.componentRef.setInput('data', {});
      fixture.detectChanges();
      component.newValue.setValue('x');
      component.addDatum();
      expect(component.data()).toEqual({});
    });

    it('should add a new key/value pair to data and rebuild the form', () => {
      fixture.componentRef.setInput('data', { a: '1' });
      fixture.detectChanges();

      component.newKey.setValue('b');
      component.newValue.setValue('2');
      component.addDatum();

      expect(component.data()).toEqual({ a: '1', b: '2' });
      expect(component.form.contains('b')).toBe(true);
      // the new-datum form is reset after adding
      expect(component.newKey.value).toBeNull();
      expect(component.newValue.value).toBeNull();
    });
  });

  describe('deleteDatum', () => {
    it('should not delete when the user cancels the confirmation dialog', () => {
      dialogService.confirm.mockReturnValue(of(false));
      fixture.componentRef.setInput('data', { a: '1' });
      fixture.detectChanges();

      component.deleteDatum({ value: 'a', visible: true });

      expect(component.data()).toEqual({ a: '1' });
    });

    it('should delete the datum and rebuild the form when confirmed', () => {
      dialogService.confirm.mockReturnValue(of(true));
      fixture.componentRef.setInput('data', { a: '1', b: '2' });
      fixture.detectChanges();

      component.deleteDatum({ value: 'a', visible: true });

      expect(component.data()).toEqual({ b: '2' });
      expect(component.form.contains('a')).toBe(false);
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
      component.form.controls['a'].setErrors({ invalid: true });

      const before = component.data();
      component.save();

      expect(component.data()).toBe(before);
    });

    it('should set data from the current form + hidden data on save, including edited values', () => {
      fixture.componentRef.setInput('data', { a: '1', secret: 'shh' });
      fixture.componentRef.setInput('hiddenKeys', ['secret']);
      fixture.detectChanges();

      component.form.controls['a'].setValue('changed');
      component.save();

      expect(component.data()).toEqual({ a: 'changed', secret: 'shh' });
    });
  });
});
