import { FormControl } from '@angular/forms';

import { MspValidators } from './msp-validators';

describe('MspValidators', () => {
  describe('msp', () => {
    it('should return null for an empty control value', () => {
      const control = new FormControl(null);
      expect(MspValidators.msp(control)).toBeNull();
    });

    it('should return null for an undefined control value', () => {
      const control = new FormControl(undefined);
      expect(MspValidators.msp(control)).toBeNull();
    });

    it('should return null for a falsy (empty string) control value', () => {
      const control = new FormControl('');
      expect(MspValidators.msp(control)).toBeNull();
    });

    it('should return null for a valid, well-formed msp operation (delete)', () => {
      // @1x2= is a valid delete: rangeA spans 2 chars, no B-value.
      const control = new FormControl('@1x2=');
      expect(MspValidators.msp(control)).toBeNull();
    });

    it('should return null for a valid, well-formed msp operation (replace)', () => {
      const control = new FormControl('@1x2="ab"');
      expect(MspValidators.msp(control)).toBeNull();
    });

    it('should return { msp: true } for unparseable text', () => {
      const control = new FormControl('not a valid operation');
      expect(MspValidators.msp(control)).toEqual({ msp: true });
    });

    it('should return { msp: true } when the text parses but the operation fails validate()', () => {
      // @1x0= parses as a delete operation (no B-value), but a delete
      // operation must span at least 1 character (length 0 is invalid).
      const control = new FormControl('@1x0=');
      expect(MspValidators.msp(control)).toEqual({ msp: true });
    });
  });
});
