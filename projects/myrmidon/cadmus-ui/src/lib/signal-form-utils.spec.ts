import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import {
  copyFormValue,
  isImplicitSubmission,
  sameFormValue,
  setFieldFromChild,
} from './signal-form-utils';

function enterOn(element: HTMLElement): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    cancelable: true,
    bubbles: true,
  });
  element.dispatchEvent(event);
  return event;
}

describe('signal form utils', () => {
  describe('copyFormValue', () => {
    it('should return null and undefined as they are', () => {
      expect(copyFormValue(null)).toBeNull();
      expect(copyFormValue(undefined)).toBeUndefined();
    });

    it('should deep copy, dropping Symbol keys', () => {
      const tag = Symbol();
      const item: any = { a: 1, d: new Date(0) };
      item[tag] = 'tagged';
      const copy = copyFormValue([item]);
      expect(copy[0]).not.toBe(item);
      expect(copy[0]).toEqual({ a: 1, d: new Date(0) });
      expect(Object.getOwnPropertySymbols(copy[0])).toEqual([]);
    });
  });

  describe('isImplicitSubmission', () => {
    let event: Event | undefined;
    const listener = (e: Event) => (event = e);
    let host: HTMLDivElement;

    beforeEach(() => {
      event = undefined;
      host = document.createElement('div');
      host.addEventListener('keydown', listener);
      document.body.appendChild(host);
    });

    afterEach(() => host.remove());

    it('should be true for Enter in a text input', () => {
      const input = document.createElement('input');
      host.appendChild(input);
      enterOn(input);
      expect(isImplicitSubmission(event!)).toBe(true);
    });

    it('should be true for Enter in a number input', () => {
      const input = document.createElement('input');
      input.type = 'number';
      host.appendChild(input);
      enterOn(input);
      expect(isImplicitSubmission(event!)).toBe(true);
    });

    it('should be false for Enter in a textarea, a checkbox or a button', () => {
      for (const el of [
        document.createElement('textarea'),
        Object.assign(document.createElement('input'), { type: 'checkbox' }),
        document.createElement('button'),
      ]) {
        host.appendChild(el);
        enterOn(el);
        expect(isImplicitSubmission(event!)).toBe(false);
      }
    });

    it('should be false when another handler consumed the event', () => {
      const input = document.createElement('input');
      input.addEventListener('keydown', (e) => e.preventDefault());
      host.appendChild(input);
      enterOn(input);
      expect(isImplicitSubmission(event!)).toBe(false);
    });

    it('should be false for Enter in an input of a nested form', () => {
      // e.g. a widget embedded in the editor, rendering its own form
      const nested = document.createElement('form');
      const input = document.createElement('input');
      nested.appendChild(input);
      host.appendChild(nested);
      enterOn(input);
      expect(isImplicitSubmission(event!)).toBe(false);
    });

    it('should be false for Enter in an input owned by a form elsewhere', () => {
      const other = document.createElement('form');
      other.id = 'other-form';
      document.body.appendChild(other);
      try {
        const input = document.createElement('input');
        input.setAttribute('form', 'other-form');
        host.appendChild(input);
        enterOn(input);
        expect(isImplicitSubmission(event!)).toBe(false);
      } finally {
        other.remove();
      }
    });
  });

  describe('sameFormValue', () => {
    it('should treat null, undefined, empty string and missing as equal', () => {
      expect(sameFormValue(null, undefined)).toBe(true);
      expect(sameFormValue('', null)).toBe(true);
      expect(sameFormValue({ a: 1, tag: null }, { a: 1 })).toBe(true);
      expect(sameFormValue({ a: 1, tag: undefined }, { a: 1, tag: '' })).toBe(
        true,
      );
    });

    it('should compare nested objects and arrays deeply', () => {
      expect(
        sameFormValue(
          [{ type: 'x', tag: null, note: null }],
          [{ type: 'x', tag: undefined }],
        ),
      ).toBe(true);
      expect(sameFormValue([{ type: 'x' }], [{ type: 'y' }])).toBe(false);
      expect(sameFormValue([1], [1, 2])).toBe(false);
      expect(sameFormValue([], undefined)).toBe(false);
      expect(sameFormValue({ a: [] }, { a: {} })).toBe(false);
    });

    it('should not equate a value with an empty one', () => {
      expect(sameFormValue({ tag: 'a' }, {})).toBe(false);
      expect(sameFormValue(0, null)).toBe(false);
      expect(sameFormValue(false, undefined)).toBe(false);
    });

    it('should compare dates by time', () => {
      expect(sameFormValue(new Date(0), new Date(0))).toBe(true);
      expect(sameFormValue(new Date(0), new Date(1))).toBe(false);
    });
  });

  describe('setFieldFromChild', () => {
    function makeForm() {
      const model = signal({
        refs: [{ type: 'x', tag: null as string | null }],
      });
      return TestBed.runInInjectionContext(() => form(model));
    }

    it('should ignore an echo of the same model value', () => {
      const f = makeForm();
      const before = f.refs().value();
      setFieldFromChild(f.refs, [{ type: 'x', tag: undefined as any }]);
      expect(f.refs().value()).toBe(before);
      expect(f().dirty()).toBe(false);
    });

    it('should set a new value and mark the field as dirty', () => {
      const f = makeForm();
      setFieldFromChild(f.refs, [{ type: 'y', tag: null }]);
      expect(f.refs().value()).toEqual([{ type: 'y', tag: null }]);
      expect(f().dirty()).toBe(true);
    });
  });
});
