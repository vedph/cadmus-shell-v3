import { copyFormValue, isImplicitSubmission } from './signal-form-utils';

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
  });
});
