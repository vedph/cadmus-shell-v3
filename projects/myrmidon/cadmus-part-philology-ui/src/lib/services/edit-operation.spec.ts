import { EditOperation, OperationType } from './edit-operation';
import { InsertAfterEditOperation } from './insert-after-edit-operation';
import { InsertBeforeEditOperation } from './insert-before-edit-operation';
import { DeleteEditOperation } from './delete-edit-operation';
import { ReplaceEditOperation } from './replace-edit-operation';
import { MoveBeforeEditOperation } from './move-before-edit-operation';
import { MoveAfterEditOperation } from './move-after-edit-operation';

describe('EditOperation.diff', () => {
  it('Diff_BothEmpty_ReturnsEmpty', () => {
    const ops = EditOperation.diff('', '');
    expect(ops.length).toBe(0);
  });

  it('Diff_SourceEmpty_TargetNot_InsertAfter', () => {
    const ops = EditOperation.diff('', 'abc');
    expect(ops.length).toBe(1);
    const op = ops[0] as InsertAfterEditOperation;
    expect(op instanceof InsertAfterEditOperation).toBeTrue();
    expect(op.at).toBe(0);
    expect(op.text).toBe('abc');
  });

  it('Diff_TargetEmpty_SourceNot_Delete', () => {
    const ops = EditOperation.diff('abc', '');
    expect(ops.length).toBe(1);
    const op = ops[0] as DeleteEditOperation;
    expect(op instanceof DeleteEditOperation).toBeTrue();
    expect(op.at).toBe(1);
    expect(op.run).toBe(3);
    expect(op.inputText).toBe('abc');
  });

  it('Diff_EqualStrings_NoOps', () => {
    const ops = EditOperation.diff('abc', 'abc');
    expect(ops.length).toBe(0);
  });

  it('Diff_SingleReplace_ReplaceOp', () => {
    const ops = EditOperation.diff('abc', 'adc');
    expect(ops.length).toBe(1);
    const op = ops[0] as ReplaceEditOperation;
    expect(op instanceof ReplaceEditOperation).toBeTrue();
    expect(op.at).toBe(2);
    expect(op.run).toBe(1);
    expect(op.replacementText).toBe('d');
    expect(op.inputText).toBe('b');
  });

  it('Diff_InsertInMiddle_InsertBefore', () => {
    const ops = EditOperation.diff('ac', 'abc');
    expect(ops.length).toBe(1);
    const op = ops[0] as InsertBeforeEditOperation;
    expect(op instanceof InsertBeforeEditOperation).toBeTrue();
    expect(op.at).toBe(2);
    expect(op.text).toBe('b');
  });

  it('Diff_DeleteInMiddle_DeleteOp', () => {
    const ops = EditOperation.diff('abc', 'ac');
    expect(ops.length).toBe(1);
    const op = ops[0] as DeleteEditOperation;
    expect(op instanceof DeleteEditOperation).toBeTrue();
    expect(op.at).toBe(2);
    expect(op.run).toBe(1);
    expect(op.inputText).toBe('b');
  });

  it('Diff_MultipleEdits_WithoutAdjustment', () => {
    const ops = EditOperation.diff('abcdef', 'azced', true, false);
    expect(ops.length).toBe(3);

    // 1. replace 'b' with 'z' at position 2
    expect(ops[0] instanceof ReplaceEditOperation).toBeTrue();
    const rep1 = ops[0] as ReplaceEditOperation;
    expect(rep1.at).toBe(2);
    expect(rep1.inputText).toBe('b');
    expect(rep1.replacementText).toBe('z');

    // 2. delete 'd' at position 4
    expect(ops[1] instanceof DeleteEditOperation).toBeTrue();
    const del = ops[1] as DeleteEditOperation;
    expect(del.at).toBe(4);
    expect(del.inputText).toBe('d');

    // 3. replace 'f' with 'd' at position 5
    expect(ops[2] instanceof ReplaceEditOperation).toBeTrue();
    const rep2 = ops[2] as ReplaceEditOperation;
    expect(rep2.at).toBe(5);
    expect(rep2.inputText).toBe('f');
    expect(rep2.replacementText).toBe('d');
  });

  it('Diff_MultipleEdits_WithAdjustment', () => {
    const ops = EditOperation.diff('abcdef', 'azced');
    expect(ops.length).toBe(2);

    // 1. replace 'b' with 'z' at position 2
    expect(ops[0] instanceof ReplaceEditOperation).toBeTrue();
    const rep = ops[0] as ReplaceEditOperation;
    expect(rep.at).toBe(2);
    expect(rep.inputText).toBe('b');
    expect(rep.replacementText).toBe('z');

    // 2. move 'd' from position 4 to position 6 (replacing 'f')
    expect(ops[1] instanceof MoveBeforeEditOperation).toBeTrue();
    const move = ops[1] as MoveBeforeEditOperation;
    expect(move.at).toBe(4);
    expect(move.run).toBe(1);
    expect(move.to).toBe(6);
    expect(move.inputText).toBe('d');
  });

  [true, false].forEach((includeInputText) => {
    it('Diff_IncludeInputText_RespectsFlag ' + includeInputText, () => {
      const ops = EditOperation.diff('abc', 'adc', includeInputText);
      const op = ops[0] as ReplaceEditOperation;
      expect(op instanceof ReplaceEditOperation).toBeTrue();
      if (includeInputText) {
        expect(op.inputText).toBe('b');
      } else {
        expect(op.inputText).toBeUndefined();
      }
    });
  });

  it('Diff_InsertAtStart_InsertBefore', () => {
    const ops = EditOperation.diff('bc', 'abc');
    expect(ops.length).toBe(1);
    const op = ops[0] as InsertBeforeEditOperation;
    expect(op instanceof InsertBeforeEditOperation).toBeTrue();
    expect(op.at).toBe(1);
    expect(op.text).toBe('a');
  });

  it('Diff_InsertAtEnd_InsertAfter', () => {
    const ops = EditOperation.diff('ab', 'abc');
    expect(ops.length).toBe(1);
    const op = ops[0] as InsertAfterEditOperation;
    expect(op instanceof InsertAfterEditOperation).toBeTrue();
    expect(op.at).toBe(2);
    expect(op.text).toBe('c');
  });

  it('Diff_DeleteAtStart_DeleteOp', () => {
    const ops = EditOperation.diff('abc', 'bc');
    expect(ops.length).toBe(1);
    const op = ops[0] as DeleteEditOperation;
    expect(op instanceof DeleteEditOperation).toBeTrue();
    expect(op.at).toBe(1);
    expect(op.run).toBe(1);
    expect(op.inputText).toBe('a');
  });

  it('Diff_DeleteAtEnd_DeleteOp', () => {
    const ops = EditOperation.diff('abc', 'ab');
    expect(ops.length).toBe(1);
    const op = ops[0] as DeleteEditOperation;
    expect(op instanceof DeleteEditOperation).toBeTrue();
    expect(op.at).toBe(3);
    expect(op.run).toBe(1);
    expect(op.inputText).toBe('c');
  });

  it('Diff_ReplaceAtStart_ReplaceOp', () => {
    const ops = EditOperation.diff('abc', 'xbc');
    expect(ops.length).toBe(1);
    const op = ops[0] as ReplaceEditOperation;
    expect(op instanceof ReplaceEditOperation).toBeTrue();
    expect(op.at).toBe(1);
    expect(op.replacementText).toBe('x');
    expect(op.inputText).toBe('a');
  });

  it('Diff_ReplaceAtEnd_ReplaceOp', () => {
    const ops = EditOperation.diff('abc', 'abx');
    expect(ops.length).toBe(1);
    const op = ops[0] as ReplaceEditOperation;
    expect(op instanceof ReplaceEditOperation).toBeTrue();
    expect(op.at).toBe(3);
    expect(op.replacementText).toBe('x');
    expect(op.inputText).toBe('c');
  });

  it('Diff_AdjustMoveWithInsertBefore', () => {
    // "abc" -> "bac" (move 'a' before 'c')
    const ops = EditOperation.diff('abc', 'bac');
    expect(ops.length).toBe(1);
    const move = ops[0] as MoveBeforeEditOperation;
    expect(move instanceof MoveBeforeEditOperation).toBeTrue();
    expect(move.at).toBe(1);
    expect(move.to).toBe(3);
    expect(move.inputText).toBe('a');
  });

  it('Diff_AdjustMoveWithInsertAfter', () => {
    // "abc" -> "acb" (move 'b' after 'c')
    const ops = EditOperation.diff('abc', 'acb');
    expect(ops.length).toBeLessThanOrEqual(2);
    expect(ops.some((op) => op instanceof MoveBeforeEditOperation)).toBeTrue();
  });

  it('Diff_AdjustInsertOnlyMode', () => {
    // insertOnly = true, should not merge with replace operations
    const ops = EditOperation.diff('abcdef', 'azced', true, true, true);
    expect(ops.length).toBe(3);
    for (const op of ops) {
      expect(op instanceof MoveBeforeEditOperation).toBeFalse();
      expect(op instanceof MoveAfterEditOperation).toBeFalse();
    }
  });

  it('Diff_AdjustInsertOnlyModeWithInsert', () => {
    // "abcd" -> "acdb"
    const ops = EditOperation.diff('abcd', 'acdb');
    expect(ops.some((op) => op instanceof MoveBeforeEditOperation)).toBeTrue();
  });

  it('Diff_NoAdjustmentWhenTextNotUnique', () => {
    // "aabbcc" -> "abcabc"
    const ops = EditOperation.diff('aabbcc', 'abcabc', true, true);
    for (const op of ops) {
      expect(op instanceof MoveBeforeEditOperation).toBeFalse();
      expect(op instanceof MoveAfterEditOperation).toBeFalse();
    }
  });

  it('Diff_AdjustPreservesNotesAndTags', () => {
    // Diff doesn't set notes/tags, but InputText should be preserved in moves
    const ops = EditOperation.diff('abc', 'acb');
    for (const op of ops) {
      if (op instanceof MoveBeforeEditOperation) {
        expect(op.inputText).toBeDefined();
      }
    }
  });

  [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ].forEach(([adjust, insertOnly]) => {
    it(
      'Diff_AllParameterCombinations adjust=' +
        adjust +
        ' insertOnly=' +
        insertOnly,
      () => {
        const ops = EditOperation.diff(
          'abcdef',
          'azced',
          true,
          adjust,
          insertOnly
        );
        expect(ops.length).toBeGreaterThan(0);
        if (!adjust) {
          for (const op of ops) {
            expect(op instanceof MoveBeforeEditOperation).toBeFalse();
            expect(op instanceof MoveAfterEditOperation).toBeFalse();
          }
        }
      }
    );
  });

  it('Diff_ComplexMoveScenario', () => {
    // "abcdefg" -> "acbdefg" (move 'c' before 'b')
    const ops = EditOperation.diff('abcdefg', 'acbdefg');
    expect(ops.length).toBeLessThanOrEqual(3);
    expect(ops.some((op) => op instanceof MoveBeforeEditOperation)).toBeTrue();
  });
});
