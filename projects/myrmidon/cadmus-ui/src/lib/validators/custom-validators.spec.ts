import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { form } from '@angular/forms/signals';

import { CustomSignalValidators, CustomValidators } from './custom-validators';

describe('CustomValidators', () => {
  describe('minChecked', () => {
    const fb = new FormBuilder();

    it('should pass when the checked count meets the default minimum (1)', () => {
      const group = fb.group({ a: false, b: true, c: false });
      const result = CustomValidators.minChecked()(group);
      expect(result).toBeNull();
    });

    it('should fail when no control is checked', () => {
      const group = fb.group({ a: false, b: false });
      const result = CustomValidators.minChecked()(group);
      expect(result).toEqual({ minChecked: true });
    });

    it('should honor a custom minimum', () => {
      const group = fb.group({ a: true, b: true, c: false });
      expect(CustomValidators.minChecked(2)(group)).toBeNull();
      expect(CustomValidators.minChecked(3)(group)).toEqual({
        minChecked: true,
      });
    });

    it('should pass for an empty group when min is 0', () => {
      const group = fb.group({});
      expect(CustomValidators.minChecked(0)(group)).toBeNull();
    });
  });
});

describe('CustomSignalValidators', () => {
  describe('minChecked', () => {
    function makeForm(
      checks: boolean[] | Record<string, boolean>,
      min?: number,
    ) {
      return runInInjectionContext(TestBed.inject(Injector), () =>
        form(signal({ checks }), (p) => {
          CustomSignalValidators.minChecked(p.checks, min);
        }),
      );
    }

    it('should pass when the checked count meets the default minimum (1)', () => {
      const f = makeForm([false, true, false]);
      expect(f.checks().errors()).toEqual([]);
    });

    it('should fail when no value is checked', () => {
      const f = makeForm([false, false]);
      expect(f.checks().getError('minChecked')).toBeTruthy();
      expect(f().invalid()).toBe(true);
    });

    it('should count the true properties of an object', () => {
      expect(makeForm({ a: true, b: false }).checks().valid()).toBe(true);
      expect(makeForm({ a: false, b: false }).checks().valid()).toBe(false);
    });

    it('should honor a custom minimum', () => {
      expect(makeForm([true, true, false], 2).checks().valid()).toBe(true);
      expect(makeForm([true, true, false], 3).checks().valid()).toBe(false);
    });

    it('should pass for an empty array when min is 0', () => {
      expect(makeForm([], 0).checks().valid()).toBe(true);
    });

    it('should follow value changes', () => {
      const f = makeForm([false, false]);
      expect(f.checks().valid()).toBe(false);
      f.checks().value.set([false, true]);
      expect(f.checks().valid()).toBe(true);
    });
  });
});
