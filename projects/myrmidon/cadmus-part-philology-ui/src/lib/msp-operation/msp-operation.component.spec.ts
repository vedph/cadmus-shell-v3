import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextRange } from '@myrmidon/cadmus-core';
import { vi } from 'vitest';

import { MspOperationComponent } from './msp-operation.component';
import { MspOperation, MspOperator } from '../msp-operation';

describe('MspOperationComponent', () => {
  let component: MspOperationComponent;
  let fixture: ComponentFixture<MspOperationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MspOperationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MspOperationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build a form with default values', () => {
    expect(component.text.value).toBeNull();
    expect(component.operator.value).toBe(MspOperator.delete);
    expect(component.rangeA.value).toBeNull();
    expect(component.valueA.value).toBeNull();
    expect(component.rangeB.value).toBeNull();
    expect(component.valueB.value).toBeNull();
    expect(component.tag.value).toBeNull();
    expect(component.note.value).toBeNull();
  });

  it('should enable/disable visual fields for the default (delete) operator on init', () => {
    // adjustVisualForOperator is called from ngOnInit for the initial value.
    expect(component.rangeA.disabled).toBe(false);
    expect(component.valueA.disabled).toBe(false);
    expect(component.rangeB.disabled).toBe(true);
    expect(component.valueB.disabled).toBe(true);
    expect(component.tag.disabled).toBe(false);
    expect(component.note.disabled).toBe(false);
  });

  it('should enable rangeB/valueB when the operator changes to swap (debounced)', () => {
    // fake timers must be enabled *before* the component (and its first
    // detectChanges) is created: the constructor's effect resets the form
    // on first run, which emits an initial valueChanges under real timers
    // and lets rxjs's AsyncScheduler recycle that real interval handle for
    // later emissions -- vi.advanceTimersByTime would then never reach it.
    vi.useFakeTimers();
    const freshFixture = TestBed.createComponent(MspOperationComponent);
    const freshComponent = freshFixture.componentInstance;
    freshFixture.detectChanges();

    freshComponent.operator.setValue(MspOperator.swap);
    vi.advanceTimersByTime(310);

    expect(freshComponent.rangeB.disabled).toBe(false);
    expect(freshComponent.valueB.disabled).toBe(false);
    vi.useRealTimers();
  });

  //#region operation model -> form
  it('should populate visual and text fields when the operation model is set', () => {
    const op = new MspOperation();
    op.operator = MspOperator.replace;
    op.rangeA = new TextRange(1, 2);
    op.valueB = 'xy';

    fixture.componentRef.setInput('operation', op);
    fixture.detectChanges();

    expect(component.operator.value).toBe(MspOperator.replace);
    expect(component.rangeA.value).toBe('1×2');
    expect(component.valueB.value).toBe('xy');
    // op.toString() for a replace with rangeA=1x2, valueB="xy": @1×2="xy"
    expect(op.toString()).toBe('@1×2="xy"');
    expect(component.text.value).toBe('@1×2="xy"');
    expect(component.form.pristine).toBe(true);
  });

  it('should reset the form when the operation model becomes undefined', () => {
    const op = new MspOperation();
    op.operator = MspOperator.replace;
    op.rangeA = new TextRange(1, 2);
    op.valueB = 'xy';
    fixture.componentRef.setInput('operation', op);
    fixture.detectChanges();
    expect(component.text.value).toBe('@1×2="xy"');

    // must go through a real value first: two consecutive `undefined` writes
    // to a signal input are a no-op and would not re-trigger the effect.
    fixture.componentRef.setInput('operation', undefined);
    fixture.detectChanges();

    expect(component.text.value).toBeNull();
    expect(component.operator.value).toBe(MspOperator.delete);
  });
  //#endregion

  //#region text -> visual (debounced)
  it('should update the visual editor from a parseable text value (debounced)', () => {
    // see the comment on the "operator changes to swap" test above: fake
    // timers must be active before the component's first detectChanges.
    vi.useFakeTimers();
    const freshFixture = TestBed.createComponent(MspOperationComponent);
    const freshComponent = freshFixture.componentInstance;
    freshFixture.detectChanges();

    freshComponent.text.setValue('@1x2="ab"');
    vi.advanceTimersByTime(310);

    expect(freshComponent.operator.value).toBe(MspOperator.replace);
    expect(freshComponent.rangeA.value).toBe('1×2');
    expect(freshComponent.valueB.value).toBe('ab');
    vi.useRealTimers();
  });

  it('should leave the visual editor untouched for unparseable text (debounced)', () => {
    vi.useFakeTimers();
    const freshFixture = TestBed.createComponent(MspOperationComponent);
    const freshComponent = freshFixture.componentInstance;
    freshFixture.detectChanges();

    const before = freshComponent.visual.value;
    freshComponent.text.setValue('not a valid msp op');
    vi.advanceTimersByTime(310);

    expect(freshComponent.visual.value).toEqual(before);
    vi.useRealTimers();
  });
  //#endregion

  //#region resetText / cancel
  it('resetText should reset the whole form', () => {
    component.text.setValue('@1x2="ab"');
    component.rangeA.setValue('1x2');

    component.resetText();

    expect(component.text.value).toBeNull();
    expect(component.rangeA.value).toBeNull();
    expect(component.operator.value).toBe(MspOperator.delete);
  });

  it('cancel should emit operationClose', () => {
    const spy = vi.fn();
    component.operationClose.subscribe(spy);
    component.cancel();
    expect(spy).toHaveBeenCalled();
  });
  //#endregion

  //#region save
  it('save should not update the operation model when the form is invalid', () => {
    // rangeA is required for the default (delete) operator and is empty.
    expect(component.form.invalid).toBe(true);
    const before = component.operation();

    component.save();

    expect(component.operation()).toBe(before);
  });

  it('save should update the operation model from the visual editor when valid', () => {
    component.text.setValue('@1x2=');
    component.rangeA.setValue('1x2');
    expect(component.form.valid).toBe(true);

    component.save();

    const op = component.operation();
    expect(op).toBeTruthy();
    expect(op!.operator).toBe(MspOperator.delete);
    expect(op!.rangeA?.toString()).toBe('1×2');
  });
  //#endregion
});
