import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { AssertedHistoricalDate } from '@myrmidon/cadmus-refs-asserted-chronotope';
import { Assertion } from '@myrmidon/cadmus-refs-assertion';
import { HistoricalDateModel } from '@myrmidon/cadmus-refs-historical-date';

import { AssertedHistoricalDateComponent } from './asserted-historical-date.component';

describe('AssertedHistoricalDateComponent', () => {
  let component: AssertedHistoricalDateComponent;
  let fixture: ComponentFixture<AssertedHistoricalDateComponent>;

  const HD: HistoricalDateModel = { a: { value: 100 }, b: { value: 150 } };
  const ASSERTION: Assertion = { rank: 2, note: 'sure' };

  function getDate(overrides?: Partial<AssertedHistoricalDate>): AssertedHistoricalDate {
    return {
      a: { value: 100 },
      b: { value: 150 },
      tag: 'approx',
      assertion: ASSERTION,
      ...overrides,
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssertedHistoricalDateComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssertedHistoricalDateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset the form to nulls when date is initially unset', () => {
    expect(component.tag.value).toBeNull();
    expect(component.hd.value).toBeNull();
    expect(component.assertion.value).toBeNull();
    expect(component.form.invalid).toBe(true); // hd is required
  });

  it('should populate the form when date is set', () => {
    fixture.componentRef.setInput('date', getDate());
    fixture.detectChanges();

    expect(component.tag.value).toBe('approx');
    expect(component.hd.value).toEqual({ a: { value: 100 }, b: { value: 150 } });
    expect(component.assertion.value).toEqual(ASSERTION);
    expect(component.form.pristine).toBe(true);
  });

  it('should default tag/assertion to null when absent from the date', () => {
    fixture.componentRef.setInput('date', getDate({ tag: undefined, assertion: undefined }));
    fixture.detectChanges();

    expect(component.tag.value).toBeNull();
    expect(component.assertion.value).toBeNull();
  });

  it('should reset the form when date is set back to undefined', () => {
    fixture.componentRef.setInput('date', getDate());
    fixture.detectChanges();

    fixture.componentRef.setInput('date', undefined);
    fixture.detectChanges();

    expect(component.tag.value).toBeNull();
    expect(component.hd.value).toBeNull();
    expect(component.assertion.value).toBeNull();
  });

  it('onDateChange should update hd and mark it dirty', () => {
    component.onDateChange(HD);

    expect(component.hd.value).toEqual(HD);
    expect(component.hd.dirty).toBe(true);
  });

  it('onDateChange with no argument should set hd to null (invalid)', () => {
    component.onDateChange(HD);
    component.onDateChange(undefined);

    expect(component.hd.value).toBeNull();
    expect(component.form.invalid).toBe(true);
  });

  it('onAssertionChange should update assertion and mark it dirty', () => {
    component.onAssertionChange(ASSERTION);

    expect(component.assertion.value).toEqual(ASSERTION);
    expect(component.assertion.dirty).toBe(true);
  });

  it('onAssertionChange with no argument should set assertion to null', () => {
    component.onAssertionChange(ASSERTION);
    component.onAssertionChange(undefined);

    expect(component.assertion.value).toBeNull();
  });

  it('cancel should emit dateCancel', () => {
    const spy = vi.fn();
    component.dateCancel.subscribe(spy);

    component.cancel();

    expect(spy).toHaveBeenCalled();
  });

  describe('save', () => {
    it('should not update date when the form is invalid (hd missing)', () => {
      component.save();

      expect(component.date()).toBeUndefined();
    });

    it('should build and set the date from the form when valid', () => {
      component.tag.setValue('approx');
      component.onDateChange(HD);
      component.onAssertionChange(ASSERTION);

      component.save();

      expect(component.date()).toEqual({
        tag: 'approx',
        a: HD.a,
        b: HD.b,
        assertion: ASSERTION,
      });
    });

    it('should omit tag/assertion (undefined) when not set', () => {
      component.onDateChange(HD);

      component.save();

      const saved = component.date();
      expect(saved?.tag).toBeUndefined();
      expect(saved?.assertion).toBeUndefined();
    });

    it('should omit b (undefined) when the hd has no b point', () => {
      component.onDateChange({ a: { value: 100 } });

      component.save();

      expect(component.date()?.b).toBeUndefined();
    });
  });
});
