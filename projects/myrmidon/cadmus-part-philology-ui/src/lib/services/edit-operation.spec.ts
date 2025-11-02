import {
  DeleteEditOperation,
  EditOperation,
  InsertAfterEditOperation,
  InsertBeforeEditOperation,
  MoveAfterEditOperation,
  MoveBeforeEditOperation,
  ReplaceEditOperation,
  SwapEditOperation,
  OperationType,
  ParseException,
} from './edit-operation';

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
    expect(op.text).toBe('d');
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
    expect(rep1.text).toBe('z');

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
    expect(rep2.text).toBe('d');
  });

  it('Diff_MultipleEdits_WithAdjustment', () => {
    const ops = EditOperation.diff('abcdef', 'azced');
    expect(ops.length).toBe(2);

    // 1. replace 'b' with 'z' at position 2
    expect(ops[0] instanceof ReplaceEditOperation).toBeTrue();
    const rep = ops[0] as ReplaceEditOperation;
    expect(rep.at).toBe(2);
    expect(rep.inputText).toBe('b');
    expect(rep.text).toBe('z');

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
    expect(op.text).toBe('x');
    expect(op.inputText).toBe('a');
  });

  it('Diff_ReplaceAtEnd_ReplaceOp', () => {
    const ops = EditOperation.diff('abc', 'abx');
    expect(ops.length).toBe(1);
    const op = ops[0] as ReplaceEditOperation;
    expect(op instanceof ReplaceEditOperation).toBeTrue();
    expect(op.at).toBe(3);
    expect(op.text).toBe('x');
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

describe('DeleteEditOperation', () => {
  describe('execute', () => {
    it('should delete single character at position 1', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 1;
      expect(op.execute('FECIT')).toBe('ECIT');
    });

    it('should delete single character in middle', () => {
      const op = new DeleteEditOperation();
      op.at = 3;
      op.run = 1;
      expect(op.execute('FECIT')).toBe('FEIT');
    });

    it('should delete multiple characters', () => {
      const op = new DeleteEditOperation();
      op.at = 2;
      op.run = 3;
      expect(op.execute('FECIT')).toBe('FT');
    });

    it('should delete characters at end', () => {
      const op = new DeleteEditOperation();
      op.at = 4;
      op.run = 2;
      expect(op.execute('FECIT')).toBe('FEC');
    });

    it('should delete entire string', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 5;
      expect(op.execute('FECIT')).toBe('');
    });

    it('should throw error if input is null or empty', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 1;
      expect(() => op.execute('')).toThrowError();
    });

    it('should throw error if position is out of range', () => {
      const op = new DeleteEditOperation();
      op.at = 10;
      op.run = 1;
      expect(() => op.execute('FECIT')).toThrowError(RangeError);
    });

    it('should throw error if length exceeds string', () => {
      const op = new DeleteEditOperation();
      op.at = 4;
      op.run = 5;
      expect(() => op.execute('FECIT')).toThrowError(RangeError);
    });
  });

  describe('parse', () => {
    it('should parse delete operation with input text', () => {
      const op = new DeleteEditOperation();
      op.parse('"F"@1!');
      expect(op.inputText).toBe('F');
      expect(op.at).toBe(1);
      expect(op.run).toBe(1);
    });

    it('should parse delete operation without input text', () => {
      const op = new DeleteEditOperation();
      op.parse('@3!');
      expect(op.inputText).toBeUndefined();
      expect(op.at).toBe(3);
      expect(op.run).toBe(1);
    });

    it('should parse delete operation with run length', () => {
      const op = new DeleteEditOperation();
      op.parse('"ECI"@2x3!');
      expect(op.inputText).toBe('ECI');
      expect(op.at).toBe(2);
      expect(op.run).toBe(3);
    });

    it('should parse delete operation with × symbol', () => {
      const op = new DeleteEditOperation();
      op.parse('@2×3!');
      expect(op.at).toBe(2);
      expect(op.run).toBe(3);
    });

    it('should parse delete operation with note', () => {
      const op = new DeleteEditOperation();
      op.parse('@1! {extra letter}');
      expect(op.at).toBe(1);
      expect(op.note).toBe('extra letter');
    });

    it('should parse delete operation with tags', () => {
      const op = new DeleteEditOperation();
      op.parse('@1! [error typo]');
      expect(op.at).toBe(1);
      expect(op.tags).toEqual(['error', 'typo']);
    });

    it('should parse delete operation with note and tags', () => {
      const op = new DeleteEditOperation();
      op.parse('"F"@1! [error] {extra letter}');
      expect(op.inputText).toBe('F');
      expect(op.at).toBe(1);
      expect(op.note).toBe('extra letter');
      expect(op.tags).toEqual(['error']);
    });

    it('should throw ParseException for invalid format', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('invalid')).toThrowError(ParseException);
    });

    it('should throw ParseException for negative position', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('@0!')).toThrowError(ParseException);
    });

    it('should throw ParseException for invalid length', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('@1x0!')).toThrowError(ParseException);
    });
  });

  describe('toString', () => {
    it('should format simple delete operation', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 1;
      expect(op.toString()).toBe('@1!');
    });

    it('should format delete operation with input text', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 1;
      op.inputText = 'F';
      expect(op.toString()).toBe('"F"@1!');
    });

    it('should format delete operation with run length', () => {
      const op = new DeleteEditOperation();
      op.at = 2;
      op.run = 3;
      op.inputText = 'ECI';
      expect(op.toString()).toBe('"ECI"@2x3!');
    });

    it('should format delete operation with tags and note', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 1;
      op.tags = ['error'];
      op.note = 'extra letter';
      expect(op.toString()).toBe('@1! [error] {extra letter}');
    });
  });
});

describe('ReplaceEditOperation', () => {
  describe('execute', () => {
    it('should replace single character', () => {
      const op = new ReplaceEditOperation();
      op.at = 1;
      op.run = 1;
      op.text = 'V';
      expect(op.execute('BIXIT')).toBe('VIXIT');
    });

    it('should replace multiple characters', () => {
      const op = new ReplaceEditOperation();
      op.at = 2;
      op.run = 2;
      op.text = 'EC';
      expect(op.execute('FIXIT')).toBe('FECIT');
    });

    it('should replace with longer text', () => {
      const op = new ReplaceEditOperation();
      op.at = 2;
      op.run = 1;
      op.text = 'ECE';
      expect(op.execute('FIT')).toBe('FECET');
    });

    it('should replace with shorter text', () => {
      const op = new ReplaceEditOperation();
      op.at = 2;
      op.run = 3;
      op.text = 'I';
      expect(op.execute('FECIT')).toBe('FIT');
    });

    it('should replace with empty string (delete)', () => {
      const op = new ReplaceEditOperation();
      op.at = 2;
      op.run = 1;
      op.text = '';
      expect(op.execute('FECIT')).toBe('FCIT');
    });

    it('should replace at end', () => {
      const op = new ReplaceEditOperation();
      op.at = 5;
      op.run = 1;
      op.text = 'S';
      expect(op.execute('FECIT')).toBe('FECIS');
    });

    it('should throw error if input is null', () => {
      const op = new ReplaceEditOperation();
      op.at = 1;
      op.run = 1;
      op.text = 'V';
      expect(() => op.execute('')).toThrowError();
    });

    it('should throw error if run is less than 1', () => {
      const op = new ReplaceEditOperation();
      op.at = 1;
      op.run = 0;
      op.text = 'V';
      expect(() => op.execute('BIXIT')).toThrowError(RangeError);
    });

    it('should throw error if position is out of range', () => {
      const op = new ReplaceEditOperation();
      op.at = 10;
      op.run = 1;
      op.text = 'V';
      expect(() => op.execute('BIXIT')).toThrowError(RangeError);
    });
  });

  describe('parse', () => {
    it('should parse replace operation with input text', () => {
      const op = new ReplaceEditOperation();
      op.parse('"B"@1="V"');
      expect(op.inputText).toBe('B');
      expect(op.at).toBe(1);
      expect(op.run).toBe(1);
      expect(op.text).toBe('V');
    });

    it('should parse replace operation without input text', () => {
      const op = new ReplaceEditOperation();
      op.parse('@1="V"');
      expect(op.inputText).toBeUndefined();
      expect(op.at).toBe(1);
      expect(op.text).toBe('V');
    });

    it('should parse replace operation with run length', () => {
      const op = new ReplaceEditOperation();
      op.parse('"IX"@2x2="EC"');
      expect(op.inputText).toBe('IX');
      expect(op.at).toBe(2);
      expect(op.run).toBe(2);
      expect(op.text).toBe('EC');
    });

    it('should parse replace operation with empty replacement', () => {
      const op = new ReplaceEditOperation();
      op.parse('"B"@1=""');
      expect(op.inputText).toBe('B');
      expect(op.text).toBe('');
    });

    it('should parse replace operation with note and tags', () => {
      const op = new ReplaceEditOperation();
      op.parse('"B"@1="V" [correction] {b/v confusion}');
      expect(op.text).toBe('V');
      expect(op.tags).toEqual(['correction']);
      expect(op.note).toBe('b/v confusion');
    });

    it('should throw ParseException for invalid format', () => {
      const op = new ReplaceEditOperation();
      expect(() => op.parse('invalid')).toThrowError(ParseException);
    });

    it('should throw ParseException for missing equals sign', () => {
      const op = new ReplaceEditOperation();
      expect(() => op.parse('"B"@1"V"')).toThrowError(ParseException);
    });
  });

  describe('toString', () => {
    it('should format simple replace operation', () => {
      const op = new ReplaceEditOperation();
      op.at = 1;
      op.run = 1;
      op.text = 'V';
      expect(op.toString()).toBe('@1="V"');
    });

    it('should format replace operation with input text', () => {
      const op = new ReplaceEditOperation();
      op.at = 1;
      op.run = 1;
      op.inputText = 'B';
      op.text = 'V';
      expect(op.toString()).toBe('"B"@1="V"');
    });

    it('should format replace operation with run length', () => {
      const op = new ReplaceEditOperation();
      op.at = 2;
      op.run = 2;
      op.inputText = 'IX';
      op.text = 'EC';
      expect(op.toString()).toBe('"IX"@2x2="EC"');
    });

    it('should format replace operation with tags and note', () => {
      const op = new ReplaceEditOperation();
      op.at = 1;
      op.run = 1;
      op.text = 'V';
      op.tags = ['correction'];
      op.note = 'b/v confusion';
      expect(op.toString()).toBe('@1="V" [correction] {b/v confusion}');
    });
  });
});

describe('InsertBeforeEditOperation', () => {
  describe('execute', () => {
    it('should insert text at beginning', () => {
      const op = new InsertBeforeEditOperation();
      op.at = 1;
      op.text = 'PRE';
      expect(op.execute('FIX')).toBe('PREFIX');
    });

    it('should insert text in middle', () => {
      const op = new InsertBeforeEditOperation();
      op.at = 3;
      op.text = 'EC';
      expect(op.execute('FIT')).toBe('FIECT');
    });

    it('should insert at position 0 for empty string', () => {
      const op = new InsertBeforeEditOperation();
      op.at = 0;
      op.text = 'ABC';
      expect(op.execute('')).toBe('ABC');
    });

    it('should insert empty string (no change)', () => {
      const op = new InsertBeforeEditOperation();
      op.at = 1;
      op.text = '';
      expect(op.execute('ABC')).toBe('ABC');
    });

    it('should throw error if position is out of range', () => {
      const op = new InsertBeforeEditOperation();
      op.at = 10;
      op.text = 'X';
      expect(() => op.execute('ABC')).toThrowError(RangeError);
    });
  });

  describe('parse', () => {
    it('should parse insert-before operation', () => {
      const op = new InsertBeforeEditOperation();
      op.parse('@1+="PRE"');
      expect(op.at).toBe(1);
      expect(op.text).toBe('PRE');
    });

    it('should parse insert-before with empty text', () => {
      const op = new InsertBeforeEditOperation();
      op.parse('@1+=""');
      expect(op.at).toBe(1);
      expect(op.text).toBe('');
    });

    it('should parse insert-before with position 0', () => {
      const op = new InsertBeforeEditOperation();
      op.parse('@0+="ABC"');
      expect(op.at).toBe(0);
      expect(op.text).toBe('ABC');
    });

    it('should parse insert-before with note and tags', () => {
      const op = new InsertBeforeEditOperation();
      op.parse('@1+="PRE" [addition] {prefix added}');
      expect(op.text).toBe('PRE');
      expect(op.tags).toEqual(['addition']);
      expect(op.note).toBe('prefix added');
    });

    it('should throw ParseException for invalid format', () => {
      const op = new InsertBeforeEditOperation();
      expect(() => op.parse('invalid')).toThrowError(ParseException);
    });

    it('should throw ParseException for wrong operator', () => {
      const op = new InsertBeforeEditOperation();
      expect(() => op.parse('@1="PRE"')).toThrowError(ParseException);
    });
  });

  describe('toString', () => {
    it('should format simple insert-before operation', () => {
      const op = new InsertBeforeEditOperation();
      op.at = 1;
      op.text = 'PRE';
      expect(op.toString()).toBe('@1+="PRE"');
    });

    it('should format insert-before with tags and note', () => {
      const op = new InsertBeforeEditOperation();
      op.at = 1;
      op.text = 'PRE';
      op.tags = ['addition'];
      op.note = 'prefix added';
      expect(op.toString()).toBe('@1+="PRE" [addition] {prefix added}');
    });
  });
});

describe('InsertAfterEditOperation', () => {
  describe('execute', () => {
    it('should insert text after position', () => {
      const op = new InsertAfterEditOperation();
      op.at = 2;
      op.text = 'EC';
      expect(op.execute('FIT')).toBe('FIECT');
    });

    it('should insert at end', () => {
      const op = new InsertAfterEditOperation();
      op.at = 3;
      op.text = 'SUFFIX';
      expect(op.execute('FIX')).toBe('FIXSUFFIX');
    });

    it('should insert at position 0 (append to end)', () => {
      const op = new InsertAfterEditOperation();
      op.at = 0;
      op.text = 'ABC';
      expect(op.execute('DEF')).toBe('DEFABC');
    });

    it('should insert empty string (no change)', () => {
      const op = new InsertAfterEditOperation();
      op.at = 1;
      op.text = '';
      expect(op.execute('ABC')).toBe('ABC');
    });

    it('should throw error if position is out of range', () => {
      const op = new InsertAfterEditOperation();
      op.at = 10;
      op.text = 'X';
      expect(() => op.execute('ABC')).toThrowError(RangeError);
    });
  });

  describe('parse', () => {
    it('should parse insert-after operation', () => {
      const op = new InsertAfterEditOperation();
      op.parse('@2=+"EC"');
      expect(op.at).toBe(2);
      expect(op.text).toBe('EC');
    });

    it('should parse insert-after with empty text', () => {
      const op = new InsertAfterEditOperation();
      op.parse('@1=+""');
      expect(op.at).toBe(1);
      expect(op.text).toBe('');
    });

    it('should parse insert-after with position 0', () => {
      const op = new InsertAfterEditOperation();
      op.parse('@0=+"ABC"');
      expect(op.at).toBe(0);
      expect(op.text).toBe('ABC');
    });

    it('should parse insert-after with note and tags', () => {
      const op = new InsertAfterEditOperation();
      op.parse('@2=+"EC" [addition] {missing letters}');
      expect(op.text).toBe('EC');
      expect(op.tags).toEqual(['addition']);
      expect(op.note).toBe('missing letters');
    });

    it('should throw ParseException for invalid format', () => {
      const op = new InsertAfterEditOperation();
      expect(() => op.parse('invalid')).toThrowError(ParseException);
    });

    it('should throw ParseException for wrong operator', () => {
      const op = new InsertAfterEditOperation();
      expect(() => op.parse('@1+="EC"')).toThrowError(ParseException);
    });
  });

  describe('toString', () => {
    it('should format simple insert-after operation', () => {
      const op = new InsertAfterEditOperation();
      op.at = 2;
      op.text = 'EC';
      expect(op.toString()).toBe('@2=+"EC"');
    });

    it('should format insert-after with tags and note', () => {
      const op = new InsertAfterEditOperation();
      op.at = 2;
      op.text = 'EC';
      op.tags = ['addition'];
      op.note = 'missing letters';
      expect(op.toString()).toBe('@2=+"EC" [addition] {missing letters}');
    });
  });
});

describe('MoveBeforeEditOperation', () => {
  describe('execute', () => {
    it('should move text forward', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      expect(op.execute('ABC')).toBe('BAC');
    });

    it('should move text backward', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 3;
      op.run = 1;
      op.to = 1;
      expect(op.execute('ABC')).toBe('CAB');
    });

    it('should move multiple characters', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 1;
      op.run = 2;
      op.to = 5;
      expect(op.execute('ABCDE')).toBe('CDABE');
    });

    it('should move text to end', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      expect(op.execute('ABC')).toBe('BAC');
    });

    it('should throw error if input is null', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 2;
      expect(() => op.execute('')).toThrowError();
    });

    it('should throw error if source position is out of range', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 10;
      op.run = 1;
      op.to = 2;
      expect(() => op.execute('ABC')).toThrowError(RangeError);
    });

    it('should throw error if target position is out of range', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 10;
      expect(() => op.execute('ABC')).toThrowError(RangeError);
    });
  });

  describe('parse', () => {
    it('should parse move-before operation', () => {
      const op = new MoveBeforeEditOperation();
      op.parse('@1>@3');
      expect(op.at).toBe(1);
      expect(op.run).toBe(1);
      expect(op.to).toBe(3);
    });

    it('should parse move-before with input text', () => {
      const op = new MoveBeforeEditOperation();
      op.parse('"A"@1>@3');
      expect(op.inputText).toBe('A');
      expect(op.at).toBe(1);
      expect(op.to).toBe(3);
    });

    it('should parse move-before with run length', () => {
      const op = new MoveBeforeEditOperation();
      op.parse('"AB"@1x2>@4');
      expect(op.inputText).toBe('AB');
      expect(op.at).toBe(1);
      expect(op.run).toBe(2);
      expect(op.to).toBe(4);
    });

    it('should parse move-before with note and tags', () => {
      const op = new MoveBeforeEditOperation();
      op.parse('@1>@3 [transposition] {letter moved}');
      expect(op.tags).toEqual(['transposition']);
      expect(op.note).toBe('letter moved');
    });

    it('should throw ParseException for invalid format', () => {
      const op = new MoveBeforeEditOperation();
      expect(() => op.parse('invalid')).toThrowError(ParseException);
    });

    it('should throw ParseException for negative position', () => {
      const op = new MoveBeforeEditOperation();
      expect(() => op.parse('@0>@3')).toThrowError(ParseException);
    });
  });

  describe('toString', () => {
    it('should format simple move-before operation', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      expect(op.toString()).toBe('@1>@3');
    });

    it('should format move-before with input text', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      op.inputText = 'A';
      expect(op.toString()).toBe('"A"@1>@3');
    });

    it('should format move-before with run length', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 1;
      op.run = 2;
      op.to = 4;
      op.inputText = 'AB';
      expect(op.toString()).toBe('"AB"@1x2>@4');
    });

    it('should format move-before with tags and note', () => {
      const op = new MoveBeforeEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      op.tags = ['transposition'];
      op.note = 'letter moved';
      expect(op.toString()).toBe('@1>@3 [transposition] {letter moved}');
    });
  });
});

describe('MoveAfterEditOperation', () => {
  describe('execute', () => {
    it('should move text forward after target', () => {
      const op = new MoveAfterEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 2;
      expect(op.execute('ABC')).toBe('BAC');
    });

    it('should move text backward after target', () => {
      const op = new MoveAfterEditOperation();
      op.at = 3;
      op.run = 1;
      op.to = 1;
      expect(op.execute('ABC')).toBe('ACB');
    });

    it('should move multiple characters', () => {
      const op = new MoveAfterEditOperation();
      op.at = 1;
      op.run = 2;
      op.to = 4;
      expect(op.execute('ABCDE')).toBe('CDABE');
    });

    it('should throw error if input is null', () => {
      const op = new MoveAfterEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 2;
      expect(() => op.execute('')).toThrowError();
    });

    it('should throw error if source position is out of range', () => {
      const op = new MoveAfterEditOperation();
      op.at = 10;
      op.run = 1;
      op.to = 2;
      expect(() => op.execute('ABC')).toThrowError(RangeError);
    });

    it('should throw error if target position is out of range', () => {
      const op = new MoveAfterEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 10;
      expect(() => op.execute('ABC')).toThrowError(RangeError);
    });
  });

  describe('parse', () => {
    it('should parse move-after operation', () => {
      const op = new MoveAfterEditOperation();
      op.parse('@1->@2');
      expect(op.at).toBe(1);
      expect(op.run).toBe(1);
      expect(op.to).toBe(2);
    });

    it('should parse move-after with input text', () => {
      const op = new MoveAfterEditOperation();
      op.parse('"A"@1->@2');
      expect(op.inputText).toBe('A');
      expect(op.at).toBe(1);
      expect(op.to).toBe(2);
    });

    it('should parse move-after with run length', () => {
      const op = new MoveAfterEditOperation();
      op.parse('"AB"@1x2->@4');
      expect(op.inputText).toBe('AB');
      expect(op.at).toBe(1);
      expect(op.run).toBe(2);
      expect(op.to).toBe(4);
    });

    it('should parse move-after with note and tags', () => {
      const op = new MoveAfterEditOperation();
      op.parse('@1->@2 [transposition] {letter moved after}');
      expect(op.tags).toEqual(['transposition']);
      expect(op.note).toBe('letter moved after');
    });

    it('should throw ParseException for invalid format', () => {
      const op = new MoveAfterEditOperation();
      expect(() => op.parse('invalid')).toThrowError(ParseException);
    });

    it('should throw ParseException for negative position', () => {
      const op = new MoveAfterEditOperation();
      expect(() => op.parse('@0->@2')).toThrowError(ParseException);
    });
  });

  describe('toString', () => {
    it('should format simple move-after operation', () => {
      const op = new MoveAfterEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 2;
      expect(op.toString()).toBe('@1->@2');
    });

    it('should format move-after with input text', () => {
      const op = new MoveAfterEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 2;
      op.inputText = 'A';
      expect(op.toString()).toBe('"A"@1->@2');
    });

    it('should format move-after with run length', () => {
      const op = new MoveAfterEditOperation();
      op.at = 1;
      op.run = 2;
      op.to = 4;
      op.inputText = 'AB';
      expect(op.toString()).toBe('"AB"@1x2->@4');
    });

    it('should format move-after with tags and note', () => {
      const op = new MoveAfterEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 2;
      op.tags = ['transposition'];
      op.note = 'letter moved after';
      expect(op.toString()).toBe('@1->@2 [transposition] {letter moved after}');
    });
  });
});

describe('SwapEditOperation', () => {
  describe('execute', () => {
    it('should swap two single characters', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      op.toRun = 1;
      expect(op.execute('ABC')).toBe('CBA');
    });

    it('should swap character sequences', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 2;
      op.to = 4;
      op.toRun = 2;
      expect(op.execute('ABCDEF')).toBe('DECABF');
    });

    it('should swap sequences of different lengths', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      op.toRun = 2;
      expect(op.execute('ABCDE')).toBe('CDBAE');
    });

    it('should swap in reverse order', () => {
      const op = new SwapEditOperation();
      op.at = 4;
      op.run = 2;
      op.to = 1;
      op.toRun = 2;
      expect(op.execute('ABCDEF')).toBe('DECABF');
    });

    it('should throw error for overlapping positions (same start)', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 2;
      op.to = 1;
      op.toRun = 1;
      expect(() => op.execute('ABC')).toThrowError(
        'Swap positions cannot overlap'
      );
    });

    it('should throw error for overlapping positions (overlap forward)', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 3;
      op.to = 2;
      op.toRun = 1;
      expect(() => op.execute('ABCDE')).toThrowError(
        'Swap positions cannot overlap'
      );
    });

    it('should throw error for overlapping positions (overlap backward)', () => {
      const op = new SwapEditOperation();
      op.at = 3;
      op.run = 1;
      op.to = 1;
      op.toRun = 3;
      expect(() => op.execute('ABCDE')).toThrowError(
        'Swap positions cannot overlap'
      );
    });

    it('should throw error if input is null', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 2;
      op.toRun = 1;
      expect(() => op.execute('')).toThrowError();
    });

    it('should throw error if first position is out of range', () => {
      const op = new SwapEditOperation();
      op.at = 10;
      op.run = 1;
      op.to = 2;
      op.toRun = 1;
      expect(() => op.execute('ABC')).toThrowError(RangeError);
    });

    it('should throw error if second position is out of range', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 10;
      op.toRun = 1;
      expect(() => op.execute('ABC')).toThrowError(RangeError);
    });
  });

  describe('parse', () => {
    it('should parse swap operation', () => {
      const op = new SwapEditOperation();
      op.parse('@1<>@3');
      expect(op.at).toBe(1);
      expect(op.run).toBe(1);
      expect(op.to).toBe(3);
      expect(op.toRun).toBe(1);
    });

    it('should parse swap with input texts', () => {
      const op = new SwapEditOperation();
      op.parse('"A"@1<>"C"@3');
      expect(op.inputText).toBe('A');
      expect(op.inputText2).toBe('C');
      expect(op.at).toBe(1);
      expect(op.to).toBe(3);
    });

    it('should parse swap with run lengths', () => {
      const op = new SwapEditOperation();
      op.parse('"AB"@1x2<>"DE"@4x2');
      expect(op.inputText).toBe('AB');
      expect(op.inputText2).toBe('DE');
      expect(op.at).toBe(1);
      expect(op.run).toBe(2);
      expect(op.to).toBe(4);
      expect(op.toRun).toBe(2);
    });

    it('should parse swap with × symbol', () => {
      const op = new SwapEditOperation();
      op.parse('@1×2<>@4×2');
      expect(op.run).toBe(2);
      expect(op.toRun).toBe(2);
    });

    it('should parse swap with note and tags', () => {
      const op = new SwapEditOperation();
      op.parse('@1<>@3 [transposition] {letters swapped}');
      expect(op.tags).toEqual(['transposition']);
      expect(op.note).toBe('letters swapped');
    });

    it('should throw ParseException for invalid format', () => {
      const op = new SwapEditOperation();
      expect(() => op.parse('invalid')).toThrowError(ParseException);
    });

    it('should throw ParseException for negative positions', () => {
      const op = new SwapEditOperation();
      expect(() => op.parse('@0<>@3')).toThrowError(ParseException);
      expect(() => op.parse('@1<>@0')).toThrowError(ParseException);
    });

    it('should throw ParseException for invalid run lengths', () => {
      const op = new SwapEditOperation();
      expect(() => op.parse('@1x0<>@3')).toThrowError(ParseException);
      expect(() => op.parse('@1<>@3x0')).toThrowError(ParseException);
    });
  });

  describe('toString', () => {
    it('should format simple swap operation', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      op.toRun = 1;
      expect(op.toString()).toBe('@1<>@3');
    });

    it('should format swap with input texts', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      op.toRun = 1;
      op.inputText = 'A';
      op.inputText2 = 'C';
      expect(op.toString()).toBe('"A"@1<>"C"@3');
    });

    it('should format swap with run lengths', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 2;
      op.to = 4;
      op.toRun = 2;
      op.inputText = 'AB';
      op.inputText2 = 'DE';
      expect(op.toString()).toBe('"AB"@1x2<>"DE"@4x2');
    });

    it('should format swap with tags and note', () => {
      const op = new SwapEditOperation();
      op.at = 1;
      op.run = 1;
      op.to = 3;
      op.toRun = 1;
      op.tags = ['transposition'];
      op.note = 'letters swapped';
      expect(op.toString()).toBe('@1<>@3 [transposition] {letters swapped}');
    });
  });
});

describe('EditOperation.parseOperation', () => {
  it('should parse delete operation', () => {
    const op = EditOperation.parseOperation('@1!');
    expect(op instanceof DeleteEditOperation).toBeTrue();
  });

  it('should parse replace operation', () => {
    const op = EditOperation.parseOperation('@1="V"');
    expect(op instanceof ReplaceEditOperation).toBeTrue();
  });

  it('should parse insert-before operation', () => {
    const op = EditOperation.parseOperation('@1+="X"');
    expect(op instanceof InsertBeforeEditOperation).toBeTrue();
  });

  it('should parse insert-after operation', () => {
    const op = EditOperation.parseOperation('@1=+"X"');
    expect(op instanceof InsertAfterEditOperation).toBeTrue();
  });

  it('should parse move-before operation', () => {
    const op = EditOperation.parseOperation('@1>@3');
    expect(op instanceof MoveBeforeEditOperation).toBeTrue();
  });

  it('should parse move-after operation', () => {
    const op = EditOperation.parseOperation('@1->@3');
    expect(op instanceof MoveAfterEditOperation).toBeTrue();
  });

  it('should parse swap operation', () => {
    const op = EditOperation.parseOperation('@1<>@3');
    expect(op instanceof SwapEditOperation).toBeTrue();
  });

  it('should throw ParseException for empty text', () => {
    expect(() => EditOperation.parseOperation('')).toThrowError(ParseException);
  });

  it('should throw ParseException for unknown operation type', () => {
    expect(() => EditOperation.parseOperation('unknown')).toThrowError(
      ParseException
    );
  });

  it('should prioritize -> over >', () => {
    const op = EditOperation.parseOperation('@1->@3');
    expect(op instanceof MoveAfterEditOperation).toBeTrue();
  });

  it('should handle complex operation with all features', () => {
    const op = EditOperation.parseOperation(
      '"B"@1="V" [correction] {b/v confusion}'
    );
    expect(op instanceof ReplaceEditOperation).toBeTrue();
    const replaceOp = op as ReplaceEditOperation;
    expect(replaceOp.inputText).toBe('B');
    expect(replaceOp.at).toBe(1);
    expect(replaceOp.text).toBe('V');
    expect(replaceOp.tags).toEqual(['correction']);
    expect(replaceOp.note).toBe('b/v confusion');
  });
});

describe('EditOperation.createOperation', () => {
  it('should create DeleteEditOperation', () => {
    const op = EditOperation.createOperation(OperationType.Delete);
    expect(op instanceof DeleteEditOperation).toBeTrue();
  });

  it('should create ReplaceEditOperation', () => {
    const op = EditOperation.createOperation(OperationType.Replace);
    expect(op instanceof ReplaceEditOperation).toBeTrue();
  });

  it('should create InsertBeforeEditOperation', () => {
    const op = EditOperation.createOperation(OperationType.InsertBefore);
    expect(op instanceof InsertBeforeEditOperation).toBeTrue();
  });

  it('should create InsertAfterEditOperation', () => {
    const op = EditOperation.createOperation(OperationType.InsertAfter);
    expect(op instanceof InsertAfterEditOperation).toBeTrue();
  });

  it('should create MoveBeforeEditOperation', () => {
    const op = EditOperation.createOperation(OperationType.MoveBefore);
    expect(op instanceof MoveBeforeEditOperation).toBeTrue();
  });

  it('should create MoveAfterEditOperation', () => {
    const op = EditOperation.createOperation(OperationType.MoveAfter);
    expect(op instanceof MoveAfterEditOperation).toBeTrue();
  });

  it('should create SwapEditOperation', () => {
    const op = EditOperation.createOperation(OperationType.Swap);
    expect(op instanceof SwapEditOperation).toBeTrue();
  });

  it('should throw error for unsupported operation type', () => {
    expect(() =>
      EditOperation.createOperation('Invalid' as OperationType)
    ).toThrowError();
  });
});

describe('ParseException', () => {
  it('should create exception with message and input substring', () => {
    const ex = new ParseException('Invalid format', 'bad input');
    expect(ex.message).toBe('Invalid format');
    expect(ex.inputSubstring).toBe('bad input');
    expect(ex.position).toBe(-1);
  });

  it('should create exception with position', () => {
    const ex = new ParseException('Invalid format', 'bad input', 5);
    expect(ex.position).toBe(5);
  });

  it('should format toString without position', () => {
    const ex = new ParseException('Invalid format', 'bad input');
    expect(ex.toString()).toBe('ParseException: Invalid format at "bad input"');
  });

  it('should format toString with position', () => {
    const ex = new ParseException('Invalid format', 'bad input', 5);
    expect(ex.toString()).toBe(
      'ParseException: Invalid format at "bad input" (position 5)'
    );
  });
});
