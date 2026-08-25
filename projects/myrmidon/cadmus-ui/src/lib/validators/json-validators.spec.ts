import { AbstractControl } from '@angular/forms';

import { JsonValidators } from './json-validators';

function makeControl(value: any): AbstractControl {
  return { value } as AbstractControl;
}

describe('JsonValidators', () => {
  describe('json', () => {
    it('should allow an empty value', () => {
      expect(JsonValidators.json(makeControl(''))).toBeNull();
      expect(JsonValidators.json(makeControl(null))).toBeNull();
      expect(JsonValidators.json(makeControl(undefined))).toBeNull();
    });

    it('should allow valid JSON', () => {
      expect(JsonValidators.json(makeControl('{"a":1}'))).toBeNull();
      expect(JsonValidators.json(makeControl('[1,2,3]'))).toBeNull();
      expect(JsonValidators.json(makeControl('"a string"'))).toBeNull();
    });

    it('should reject invalid JSON', () => {
      expect(JsonValidators.json(makeControl('{a:1}'))).toEqual({ json: true });
      expect(JsonValidators.json(makeControl('not json'))).toEqual({
        json: true,
      });
    });
  });
});
