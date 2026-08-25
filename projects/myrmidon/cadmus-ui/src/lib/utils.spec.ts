import { FormControl } from '@angular/forms';

import { extractTouchedChanges, extractPristineChanges } from './utils';

describe('extractTouchedChanges', () => {
  it('should emit true when markAsTouched is called', () => {
    const control = new FormControl('');
    const touched$ = extractTouchedChanges(control);
    const values: boolean[] = [];
    touched$.subscribe((v) => values.push(v));

    control.markAsTouched();

    expect(values).toEqual([true]);
    expect(control.touched).toBe(true);
  });

  it('should emit false when markAsUntouched is called', () => {
    const control = new FormControl('');
    const touched$ = extractTouchedChanges(control);
    const values: boolean[] = [];
    touched$.subscribe((v) => values.push(v));

    control.markAsTouched();
    control.markAsUntouched();

    expect(values).toEqual([true, false]);
    expect(control.touched).toBe(false);
  });

  it('should still forward arguments to the original method', () => {
    const control = new FormControl('');
    const child = new FormControl('');
    extractTouchedChanges(control);

    // markAsTouched accepts an { onlySelf } options object; make sure
    // the wrapper still passes it through to the original implementation
    expect(() => control.markAsTouched({ onlySelf: true })).not.toThrow();
  });
});

describe('extractPristineChanges', () => {
  it('should emit true when markAsPristine is called', () => {
    const control = new FormControl('');
    const pristine$ = extractPristineChanges(control);
    const values: boolean[] = [];
    pristine$.subscribe((v) => values.push(v));

    control.markAsPristine();

    expect(values).toEqual([true]);
    expect(control.pristine).toBe(true);
  });

  it('should emit false when markAsDirty is called', () => {
    const control = new FormControl('');
    const pristine$ = extractPristineChanges(control);
    const values: boolean[] = [];
    pristine$.subscribe((v) => values.push(v));

    control.markAsDirty();

    expect(values).toEqual([false]);
    expect(control.dirty).toBe(true);
  });
});
