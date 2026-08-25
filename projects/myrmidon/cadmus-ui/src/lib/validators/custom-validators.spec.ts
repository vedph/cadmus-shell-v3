import { FormBuilder } from '@angular/forms';

import { CustomValidators } from './custom-validators';

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
