import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';

import { EditOperationComponent } from './edit-operation.component';
import {
  EditOperation,
  OperationType,
} from '../services/edit-operation';
import { NumberedChar } from '../char-text-view/char-text-view.component';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

describe('EditOperationComponent', () => {
  let component: EditOperationComponent;
  let fixture: ComponentFixture<EditOperationComponent>;
  let clipboard: { copy: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    clipboard = { copy: vi.fn() };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [EditOperationComponent],
      providers: [
        { provide: Clipboard, useValue: clipboard },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditOperationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('inputText', 'abcde');
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build a form with default values', () => {
    expect(component.form.dsl().value()).toBe('');
    expect(plain(component.form.type().value())).toBe(OperationType.Replace);
    expect(plain(component.form.at().value())).toBe(1);
    expect(plain(component.form.run().value())).toBe(1);
    expect(component.form.text().value()).toBe('');
    expect(plain(component.form.to().value())).toBe(0);
    expect(plain(component.form.toRun().value())).toBe(0);
    expect(plain(component.form.tags().value())).toEqual([]);
    expect(component.form.note().value()).toBe('');
  });

  //#region operation model -> form (updateForm via effect)
  it('should populate the form when the operation model is set', () => {
    const op = EditOperation.createOperation(OperationType.Replace);
    op.at = 3;
    op.run = 2;
    op.text = 'XY';
    op.tags = ['t1'];
    op.note = 'a note';

    fixture.componentRef.setInput('operation', op);
    fixture.detectChanges();

    expect(plain(component.form.type().value())).toBe(OperationType.Replace);
    expect(plain(component.form.at().value())).toBe(3);
    expect(plain(component.form.run().value())).toBe(2);
    expect(plain(component.form.text().value())).toBe('XY');
    expect(plain(component.form.tags().value())).toEqual([{ id: 't1', value: 't1' }]);
    expect(plain(component.form.note().value())).toBe('a note');
    expect(component.form().dirty()).toBe(false);
  });

  it('should map operation tag ids to thesaurus entries when available', () => {
    fixture.componentRef.setInput('opTagEntries', [
      { id: 't1', value: 'Tag One' },
    ]);
    const op = EditOperation.createOperation(OperationType.Replace);
    op.tags = ['t1', 't2'];

    fixture.componentRef.setInput('operation', op);
    fixture.detectChanges();

    // t1 resolves to its thesaurus entry, t2 falls back to {id, value: id}
    expect(plain(component.form.tags().value())).toEqual([
      { id: 't1', value: 'Tag One' },
      { id: 't2', value: 't2' },
    ]);
  });

  it('should reset the form when the operation model becomes undefined', () => {
    const op = EditOperation.createOperation(OperationType.Replace);
    op.at = 5;
    op.note = 'a note';
    fixture.componentRef.setInput('operation', op);
    fixture.detectChanges();
    expect(plain(component.form.at().value())).toBe(5);
    expect(plain(component.form.note().value())).toBe('a note');

    // must first be a real value, then undefined: two identical `undefined`
    // signal writes in a row would not re-trigger the effect.
    fixture.componentRef.setInput('operation', undefined);
    fixture.detectChanges();

    // no operation: the form gets its defaults
    expect(plain(component.form.at().value())).toBe(1);
    expect(plain(component.form.type().value())).toBe(OperationType.Replace);
    expect(component.form.note().value()).toBe('');
  });
  //#endregion

  //#region 'to' validators toggle with type
  it('should add a min(1) validator to "to" only for Move/Swap types', () => {
    // Replace (default): no extra validator on 'to'.
    component.form.to().value.set(0);
    expect(component.form.to().valid()).toBe(true);

    component.form.type().value.set(OperationType.MoveBefore);
    component.form.to().value.set(0);
    expect(component.form.to().invalid()).toBe(true);
    component.form.to().value.set(1);
    expect(component.form.to().valid()).toBe(true);

    // switching back to Replace clears the validator again.
    component.form.type().value.set(OperationType.Replace);
    component.form.to().value.set(0);
    expect(component.form.to().valid()).toBe(true);
  });
  //#endregion

  //#region parseOperation
  it('parseOperation should do nothing when dsl is empty', () => {
    const before = component.operation();
    component.parseOperation();
    expect(component.operation()).toBe(before);
  });

  it('parseOperation should parse a valid DSL and set the operation model', () => {
    component.form.dsl().value.set('@1x2="XY"');
    component.parseOperation();

    const op = component.operation();
    expect(op).toBeTruthy();
    expect(op!.at).toBe(1);
    expect(op!.run).toBe(2);
    expect(op!.text).toBe('XY');
    // input text is overridden from the component's inputText input
    expect(op!.inputText).toBe('abcde');
    expect(component.parseError()).toBeUndefined();
  });

  it('parseOperation should set parseError on invalid DSL', () => {
    component.form.dsl().value.set('this is not valid dsl');
    component.parseOperation();

    expect(component.parseError()).toBeTruthy();
  });
  //#endregion

  //#region updateDsl
  it('updateDsl should set the dsl field from the current form-built operation', () => {
    component.form.type().value.set(OperationType.Replace);
    component.form.at().value.set(1);
    component.form.run().value.set(1);
    component.form.text().value.set('Z');

    component.updateDsl();

    expect(plain(component.form.dsl().value())).toContain('Z');
  });
  //#endregion

  //#region outputText
  it('should compute outputText from the current form values and inputText', () => {
    // default form: type=Replace, at=1, run=1, text=null -> text becomes ''
    // (Replace with empty text at position 1 for 1 char removes 'a')
    expect(component.outputText()).toBe('bcde');
  });

  it('should recompute outputText when the form changes', () => {
    component.form.at().value.set(1);
    component.form.run().value.set(1);
    component.form.text().value.set('X');

    expect(component.outputText()).toBe('Xbcde');
  });

  it('should keep the typed DSL when the operation parsed from it is bound', () => {
    component.form.dsl().value.set('@2x1="Z"');
    component.parseOperation();
    fixture.detectChanges();

    expect(component.form.dsl().value()).toBe('@2x1="Z"');
    expect(component.form.at().value()).toBe(2);
    expect(component.form.text().value()).toBe('Z');
  });

  it('should not render static min attributes, and validate them in the schema', () => {
    component.form.at().value.set(0);
    expect(component.form.at().getError('min')).toBeTruthy();
    component.form.run().value.set(0);
    expect(component.form.run().getError('min')).toBeTruthy();
  });
  //#endregion

  //#region char pick / coords
  it('onCharPick should set pickedCoords to the character position', () => {
    const char: NumberedChar = { n: 3, value: 'c' };
    component.onCharPick(char);
    expect(component.pickedCoords()).toBe('3');
  });

  it('onRangePick should set pickedCoords to "at x run"', () => {
    const chars: NumberedChar[] = [
      { n: 2, value: 'b' },
      { n: 3, value: 'c' },
      { n: 4, value: 'd' },
    ];
    component.onRangePick(chars);
    expect(component.pickedCoords()).toBe('2x3');
  });

  it('onRangePick should do nothing for an empty array', () => {
    component.pickedCoords.set('9');
    component.onRangePick([]);
    expect(component.pickedCoords()).toBe('9');
  });

  it('setAtRunFromPickedCoords should set at/run and expand the editor', () => {
    component.onRangePick([
      { n: 2, value: 'b' },
      { n: 3, value: 'c' },
    ]);
    component.setAtRunFromPickedCoords();

    expect(plain(component.form.at().value())).toBe(2);
    expect(plain(component.form.run().value())).toBe(2);
    expect(component.expanded()).toBe(true);
  });

  it('setAtRunFromPickedCoords should ignore unparseable coords', () => {
    component.pickedCoords.set('not-coords');
    component.form.at().value.set(9);
    component.setAtRunFromPickedCoords();
    // at is left untouched since parsing failed
    expect(plain(component.form.at().value())).toBe(9);
    expect(component.expanded()).toBe(false);
  });

  it('setToFromPickedCoords should set "to" and expand the editor', () => {
    component.onCharPick({ n: 4, value: 'd' });
    component.setToFromPickedCoords();

    expect(plain(component.form.to().value())).toBe(4);
    expect(component.expanded()).toBe(true);
  });
  //#endregion

  //#region cancel / save
  it('cancel should emit cancelEdit', () => {
    const spy = vi.fn();
    component.cancelEdit.subscribe(spy);
    component.cancel();
    expect(spy).toHaveBeenCalled();
  });

  it('save should mark all as touched and not update the model when the form is invalid', () => {
    component.form.type().value.set(OperationType.MoveBefore);
    component.form.to().value.set(0); // invalid: min(1) required for MoveBefore
    const before = component.operation();

    component.save();

    expect(component.operation()).toBe(before);
    expect(component.form.to().touched()).toBe(true);
  });

  it('save should update the operation model and mark the form pristine when valid', () => {
    component.form.type().value.set(OperationType.Replace);
    component.form.at().value.set(2);
    component.form.run().value.set(1);
    component.form.text().value.set('Q');
    component.form().markAsDirty();

    component.save();

    const op = component.operation();
    expect(op).toBeTruthy();
    expect(op!.at).toBe(2);
    expect(op!.text).toBe('Q');
    expect(component.form().dirty()).toBe(false);
  });
  //#endregion

  //#region misc
  it('onOpTagEntriesChange should update and dirty the tags control', () => {
    const entries = [{ id: 't1', value: 'Tag 1' }];
    component.onOpTagEntriesChange(entries);
    expect(plain(component.form.tags().value())).toEqual(entries);
    expect(component.form.tags().dirty()).toBe(true);
  });

  it('renderLabel should delegate to renderLabelFromLastColon', () => {
    expect(component.renderLabel('a:b:c')).toBe('c');
    expect(component.renderLabel('noColon')).toBe('noColon');
  });

  it('onTagChange should copy the tag id to the clipboard and show a snackbar', () => {
    component.onTagChange({ id: 'tag-x', value: 'Tag X' });
    expect(clipboard.copy).toHaveBeenCalledWith('tag-x');
    expect(snackBar.open).toHaveBeenCalled();
  });
  //#endregion

  it('should render no <form> of its own, and no submit buttons', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector(':scope > form')).toBeNull();
    expect(root.querySelectorAll('button[type="submit"]').length).toBe(0);
  });

  it('should keep the dirty state of a user edit across change detection', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = input.value + 'x';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.detectChanges();
    expect(component.form().dirty()).toBe(true);
  });
});
