import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { EditOperationSetComponent } from './edit-operation-set.component';
import {
  EditOperation,
  OperationType,
} from '../services/edit-operation';

function makeReplace(at: number, run: number, text: string): EditOperation {
  const op = EditOperation.createOperation(OperationType.Replace);
  op.at = at;
  op.run = run;
  op.text = text;
  return op;
}

describe('EditOperationSetComponent', () => {
  let component: EditOperationSetComponent;
  let fixture: ComponentFixture<EditOperationSetComponent>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [EditOperationSetComponent],
      providers: [{ provide: DialogService, useValue: dialogService }],
    }).compileComponents();

    fixture = TestBed.createComponent(EditOperationSetComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('baseText', 'abcde');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region addOperation / editOperation / closeOperation
  it('addOperation should start a new Replace operation being edited (index -1)', () => {
    component.addOperation();
    expect(component.editedOperationIndex()).toBe(-1);
    expect(component.editedOperation()?.type).toBe(OperationType.Replace);
  });

  it('editOperation should deep-clone the operation being edited', () => {
    const op = makeReplace(1, 1, 'X');
    component.editOperation(op, 0);

    expect(component.editedOperationIndex()).toBe(0);
    expect(component.editedOperation()).toEqual(op);
    expect(component.editedOperation()).not.toBe(op);

    op.text = 'changed';
    expect(component.editedOperation()!.text).toBe('X');
  });

  it('closeOperation should clear the editing state', () => {
    component.editOperation(makeReplace(1, 1, 'X'), 0);
    component.closeOperation();
    expect(component.editedOperationIndex()).toBe(-1);
    expect(component.editedOperation()).toBeUndefined();
  });
  //#endregion

  //#region saveOperation
  it('saveOperation should append a new operation when index is -1', () => {
    component.addOperation();
    const op = makeReplace(1, 1, 'X');

    component.saveOperation(op);

    expect(component.operations()).toEqual([op]);
    expect(component.editedOperationIndex()).toBe(-1);
    expect(component.editedOperation()).toBeUndefined();
  });

  it('saveOperation should replace the operation at the edited index', () => {
    const op1 = makeReplace(1, 1, 'A');
    const op2 = makeReplace(2, 1, 'B');
    fixture.componentRef.setInput('operations', [op1, op2]);
    component.editOperation(op2, 1);

    const updated = makeReplace(2, 1, 'B2');
    component.saveOperation(updated);

    expect(component.operations()).toEqual([op1, updated]);
  });
  //#endregion

  //#region deleteOperation
  it('deleteOperation should remove the entry when confirmed', () => {
    const op1 = makeReplace(1, 1, 'A');
    const op2 = makeReplace(2, 1, 'B');
    fixture.componentRef.setInput('operations', [op1, op2]);

    component.deleteOperation(0);

    expect(dialogService.confirm).toHaveBeenCalled();
    expect(component.operations()).toEqual([op2]);
  });

  it('deleteOperation should not remove the entry when not confirmed', () => {
    dialogService.confirm.mockReturnValue(of(false));
    const op1 = makeReplace(1, 1, 'A');
    fixture.componentRef.setInput('operations', [op1]);

    component.deleteOperation(0);

    expect(component.operations()).toEqual([op1]);
  });

  it('deleteOperation should close the editor when deleting the currently edited entry', () => {
    const op1 = makeReplace(1, 1, 'A');
    fixture.componentRef.setInput('operations', [op1]);
    component.editOperation(op1, 0);

    component.deleteOperation(0);

    expect(component.editedOperationIndex()).toBe(-1);
    expect(component.editedOperation()).toBeUndefined();
  });

  // NOTE (documented current behavior, not "fixed"): unlike
  // moveOperationUp/moveOperationDown -- which explicitly re-target
  // editedOperationIndex when the edited entry shifts position -- deleteOperation
  // only closes the editor when the *deleted* index equals the edited one.
  // If a different (e.g. earlier) operation is deleted while another one is
  // being edited, editedOperationIndex is left pointing at the old numeric
  // position, which after the splice now refers to the next operation in the
  // array. This looks like an oversight (asymmetric with the move methods)
  // but the fix is not obvious (guessing at re-indexing rules risks changing
  // intended behavior), so this is flagged for review rather than "fixed".
  it('documents that deleteOperation does not re-target editedOperationIndex for unrelated deletions', () => {
    const op0 = makeReplace(1, 1, 'A');
    const op1 = makeReplace(2, 1, 'B');
    const op2 = makeReplace(3, 1, 'C');
    fixture.componentRef.setInput('operations', [op0, op1, op2]);
    component.editOperation(op2, 2); // editing the 3rd (last) operation

    component.deleteOperation(0); // delete the 1st operation

    expect(component.operations()).toEqual([op1, op2]);
    // editedOperationIndex is still 2, but the array now only has 2 items
    // (indices 0-1), so index 2 is out of range / points at nothing.
    expect(component.editedOperationIndex()).toBe(2);
  });
  //#endregion

  //#region moveOperationUp / moveOperationDown
  it('moveOperationUp should do nothing for index 0', () => {
    const op0 = makeReplace(1, 1, 'A');
    const op1 = makeReplace(2, 1, 'B');
    fixture.componentRef.setInput('operations', [op0, op1]);

    component.moveOperationUp(0);

    expect(component.operations()).toEqual([op0, op1]);
  });

  it('moveOperationUp should swap with the previous entry and follow the edited index', () => {
    const op0 = makeReplace(1, 1, 'A');
    const op1 = makeReplace(2, 1, 'B');
    fixture.componentRef.setInput('operations', [op0, op1]);
    component.editOperation(op1, 1);

    component.moveOperationUp(1);

    expect(component.operations()).toEqual([op1, op0]);
    expect(component.editedOperationIndex()).toBe(0);
  });

  it('moveOperationDown should do nothing for the last index', () => {
    const op0 = makeReplace(1, 1, 'A');
    const op1 = makeReplace(2, 1, 'B');
    fixture.componentRef.setInput('operations', [op0, op1]);

    component.moveOperationDown(1);

    expect(component.operations()).toEqual([op0, op1]);
  });

  it('moveOperationDown should swap with the next entry and follow the edited index', () => {
    const op0 = makeReplace(1, 1, 'A');
    const op1 = makeReplace(2, 1, 'B');
    fixture.componentRef.setInput('operations', [op0, op1]);
    component.editOperation(op0, 0);

    component.moveOperationDown(0);

    expect(component.operations()).toEqual([op1, op0]);
    expect(component.editedOperationIndex()).toBe(1);
  });
  //#endregion

  //#region addByDiffing
  it('addByDiffing should do nothing when targetText is missing', () => {
    fixture.componentRef.setInput('targetText', undefined);
    component.addByDiffing();
    expect(dialogService.confirm).not.toHaveBeenCalled();
  });

  it('addByDiffing should do nothing when baseText equals targetText', () => {
    fixture.componentRef.setInput('targetText', 'abcde');
    component.addByDiffing();
    expect(dialogService.confirm).not.toHaveBeenCalled();
  });

  it('addByDiffing should confirm and replace operations with the diff result', () => {
    fixture.componentRef.setInput('targetText', 'abXde');
    component.editOperation(makeReplace(1, 1, 'A'), 0);

    component.addByDiffing();

    expect(dialogService.confirm).toHaveBeenCalled();
    expect(component.operations().length).toBeGreaterThan(0);
    expect(component.editedOperationIndex()).toBe(-1);
  });

  it('addByDiffing should not replace operations when not confirmed', () => {
    dialogService.confirm.mockReturnValue(of(false));
    fixture.componentRef.setInput('targetText', 'abXde');

    component.addByDiffing();

    expect(component.operations()).toEqual([]);
  });
  //#endregion

  //#region computed: operationText / outputText / operationTexts
  it('operationText should equal baseText when adding the first operation', () => {
    expect(component.operationText()).toBe('abcde');
  });

  it('operationText should equal baseText when editing the first operation (index 0)', () => {
    const op0 = makeReplace(1, 1, 'A');
    fixture.componentRef.setInput('operations', [op0]);
    component.editOperation(op0, 0);
    expect(component.operationText()).toBe('abcde');
  });

  it('operationText should chain the output of preceding operations for later indices', () => {
    const op0 = makeReplace(1, 1, 'X'); // abcde -> Xbcde
    const op1 = makeReplace(2, 1, 'Y'); // Xbcde -> XYcde
    fixture.componentRef.setInput('operations', [op0, op1]);
    component.editOperation(op1, 1);

    expect(component.operationText()).toBe('Xbcde');
  });

  it('outputText should equal baseText when there are no operations', () => {
    expect(component.outputText()).toBe('abcde');
  });

  it('outputText should equal the output of the last operation', () => {
    const op0 = makeReplace(1, 1, 'X');
    const op1 = makeReplace(2, 1, 'Y');
    fixture.componentRef.setInput('operations', [op0, op1]);

    expect(component.outputText()).toBe('XYcde');
  });

  it('operationTexts should list input/output text for each operation in sequence', () => {
    const op0 = makeReplace(1, 1, 'X');
    const op1 = makeReplace(2, 1, 'Y');
    fixture.componentRef.setInput('operations', [op0, op1]);

    expect(component.operationTexts()).toEqual([
      { input: 'abcde', output: 'Xbcde' },
      { input: 'Xbcde', output: 'XYcde' },
    ]);
  });

  it('operationTexts should record "(error)" and continue when an operation throws', () => {
    // run=0 makes ReplaceEditOperation.execute throw a RangeError
    const bad = makeReplace(1, 0, 'X');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fixture.componentRef.setInput('operations', [bad]);

    expect(component.operationTexts()).toEqual([
      { input: 'abcde', output: '(error)' },
    ]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
  //#endregion

  it('trackByOperation should combine index and the operation string representation', () => {
    const op = makeReplace(1, 1, 'X');
    expect(component.trackByOperation(2, op)).toBe(`2-${op.toString()}`);
  });
});
