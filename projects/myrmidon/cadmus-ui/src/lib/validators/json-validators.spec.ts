import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbstractControl } from '@angular/forms';
import { form } from '@angular/forms/signals';

import { JsonSignalValidators, JsonValidators } from './json-validators';

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

describe('JsonSignalValidators', () => {
  function makeForm(code: string | null) {
    return runInInjectionContext(TestBed.inject(Injector), () =>
      form(signal({ code }), (p) => {
        JsonSignalValidators.json(p.code);
      }),
    );
  }

  it('should allow an empty value', () => {
    expect(makeForm('').code().valid()).toBe(true);
    expect(makeForm(null).code().valid()).toBe(true);
  });

  it('should allow valid JSON', () => {
    expect(makeForm('{"a":1}').code().valid()).toBe(true);
    expect(makeForm('[1,2,3]').code().valid()).toBe(true);
  });

  it('should reject invalid JSON with a json error', () => {
    const f = makeForm('{a:1}');
    expect(f.code().valid()).toBe(false);
    expect(f.code().getError('json')).toBeTruthy();
  });
});
