import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextRange } from '@myrmidon/cadmus-core';
import { vi } from 'vitest';

import { MspOperationComponent } from './msp-operation.component';
import { MspOperation, MspOperator } from '../msp-operation';

// the text/visual sync is debounced by 300ms, and its observables emit
// only when change detection runs: real timers are used
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await wait(350);
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build a form with default values', () => {
    const v = component.form.visual;
    expect(component.form.text().value()).toBe('');
    expect(v.operator().value()).toBe(MspOperator.delete);
    expect(v.rangeA().value()).toBe('');
    expect(v.valueA().value()).toBe('');
    expect(v.rangeB().value()).toBe('');
    expect(v.valueB().value()).toBe('');
    expect(v.tag().value()).toBe('');
    expect(v.note().value()).toBe('');
  });

  it('should enable/disable visual fields for the default (delete) operator', () => {
    const v = component.form.visual;
    expect(v.rangeA().disabled()).toBe(false);
    expect(v.valueA().disabled()).toBe(false);
    expect(v.rangeB().disabled()).toBe(true);
    expect(v.valueB().disabled()).toBe(true);
    expect(v.tag().disabled()).toBe(false);
    expect(v.note().disabled()).toBe(false);
  });

  it('should enable rangeB/valueB when the operator changes to swap', () => {
    component.form.visual.operator().value.set(MspOperator.swap);
    expect(component.form.visual.rangeB().disabled()).toBe(false);
    expect(component.form.visual.valueB().disabled()).toBe(false);
  });

  it('should enable only valueB for replace, only rangeB for move', () => {
    const v = component.form.visual;
    v.operator().value.set(MspOperator.replace);
    expect(v.rangeB().disabled()).toBe(true);
    expect(v.valueB().disabled()).toBe(false);
    v.operator().value.set(MspOperator.move);
    expect(v.rangeB().disabled()).toBe(false);
    expect(v.valueB().disabled()).toBe(true);
  });

  //#region operation model -> form
  it('should populate visual and text fields when the operation model is set', () => {
    const op = new MspOperation();
    op.operator = MspOperator.replace;
    op.rangeA = new TextRange(1, 2);
    op.valueB = 'xy';

    fixture.componentRef.setInput('operation', op);
    fixture.detectChanges();

    const v = component.form.visual;
    expect(v.operator().value()).toBe(MspOperator.replace);
    expect(v.rangeA().value()).toBe('1×2');
    expect(v.valueB().value()).toBe('xy');
    // op.toString() for a replace with rangeA=1x2, valueB="xy": @1×2="xy"
    expect(op.toString()).toBe('@1×2="xy"');
    expect(component.form.text().value()).toBe('@1×2="xy"');
    expect(component.form().dirty()).toBe(false);
  });

  it('should reset the form when the operation model becomes undefined', () => {
    const op = new MspOperation();
    op.operator = MspOperator.replace;
    op.rangeA = new TextRange(1, 2);
    op.valueB = 'xy';
    fixture.componentRef.setInput('operation', op);
    fixture.detectChanges();
    expect(component.form.text().value()).toBe('@1×2="xy"');

    fixture.componentRef.setInput('operation', undefined);
    fixture.detectChanges();

    expect(component.form.text().value()).toBe('');
    expect(component.form.visual.operator().value()).toBe(MspOperator.delete);
  });
  //#endregion

  //#region text <-> visual
  it('should update the visual editor from a parseable text value', async () => {
    component.form.text().value.set('@1x2="ab"');
    await settle();

    const v = component.form.visual;
    expect(v.operator().value()).toBe(MspOperator.replace);
    expect(v.rangeA().value()).toBe('1×2');
    expect(v.valueB().value()).toBe('ab');
  });

  it('should leave the visual editor untouched for unparseable text', async () => {
    await settle();
    const before = component.form.visual().value();
    component.form.text().value.set('not a valid msp op');
    await settle();

    expect(component.form.visual().value()).toEqual(before);
    // and the text is not overwritten from the visual editor
    expect(component.form.text().value()).toBe('not a valid msp op');
  });

  it('should update the text from a valid visual operation', async () => {
    const v = component.form.visual;
    v.operator().value.set(MspOperator.replace);
    v.rangeA().value.set('2x1');
    v.valueB().value.set('z');
    await settle();

    // a range of length 1 is written without its length
    expect(component.form.text().value()).toBe('@2="z"');
  });

  it('should keep a text being typed when it already matches the visual operation', async () => {
    // "@1x2=" and "@1×2=" are the same operation: the text is not rewritten
    component.form.text().value.set('@1x2=');
    await settle();
    expect(component.form.text().value()).toBe('@1x2=');
  });
  //#endregion

  //#region resetText / cancel
  it('resetText should reset the whole form', () => {
    component.form.text().value.set('@1x2="ab"');
    component.form.visual.rangeA().value.set('1x2');

    component.resetText();

    expect(component.form.text().value()).toBe('');
    expect(component.form.visual.rangeA().value()).toBe('');
    expect(component.form.visual.operator().value()).toBe(MspOperator.delete);
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
    expect(component.form().invalid()).toBe(true);
    const before = component.operation();

    component.save();

    expect(component.operation()).toBe(before);
    expect(component.form.visual.rangeA().touched()).toBe(true);
  });

  it('save should update the operation model from the visual editor when valid', () => {
    component.form.text().value.set('@1x2=');
    component.form.visual.rangeA().value.set('1x2');
    expect(component.form().valid()).toBe(true);

    component.save();

    const op = component.operation();
    expect(op).toBeTruthy();
    expect(op!.operator).toBe(MspOperator.delete);
    expect(op!.rangeA?.toString()).toBe('1×2');
  });

  it('should show the value length error', () => {
    component.form.visual.valueA().value.set('x'.repeat(101));
    component.form.visual.valueA().markAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('too long');
  });
  //#endregion

  it('should keep the dirty state of a user edit across change detection', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = '@1x2=';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.detectChanges();
    expect(component.form().dirty()).toBe(true);
  });

  it('should render no <form> of its own, and no submit buttons', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('form')).toBeNull();
    expect(root.querySelectorAll('button[type="submit"]').length).toBe(0);
  });
});
