import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import { MspValidators } from './msp-validators';

describe('MspValidators', () => {
  describe('msp', () => {
    function makeForm(text: string | null) {
      return runInInjectionContext(TestBed.inject(Injector), () =>
        form(signal({ text }), (p) => {
          MspValidators.msp(p.text);
        }),
      );
    }

    it('should accept an empty value', () => {
      expect(makeForm(null).text().valid()).toBe(true);
      expect(makeForm('').text().valid()).toBe(true);
    });

    it('should accept a valid, well-formed msp operation (delete)', () => {
      // @1x2= is a valid delete: rangeA spans 2 chars, no B-value.
      expect(makeForm('@1x2=').text().valid()).toBe(true);
    });

    it('should accept a valid, well-formed msp operation (replace)', () => {
      expect(makeForm('@1x2="ab"').text().valid()).toBe(true);
    });

    it('should return an msp error for unparseable text', () => {
      const f = makeForm('not a valid operation');
      expect(f.text().getError('msp')).toBeTruthy();
    });

    it('should return an msp error when the text parses but the operation fails validate()', () => {
      // @1x0= parses as a delete operation (no B-value), but a delete
      // operation must span at least 1 character (length 0 is invalid).
      expect(makeForm('@1x0=').text().getError('msp')).toBeTruthy();
    });
  });
});
