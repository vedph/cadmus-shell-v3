import { MoveAfterEditOperation } from './move-after-edit-operation';
import { ParseException } from './edit-operation';

describe('MoveAfterEditOperation', () => {
  // Execute_MoveSingleChar_Forward
  it('should move a single char forward', () => {
    const op = new MoveAfterEditOperation();
    op.at = 2;
    op.run = 1;
    op.to = 4;
    const a = 'abcde';

    const b = op.execute(a);

    expect(b).toBe('acdbe');
  });

  // Execute_MoveSingleChar_Backward
  it('should move a single char backward', () => {
    const op = new MoveAfterEditOperation();
    op.at = 4;
    op.run = 1;
    op.to = 1;
    const a = 'abcde';

    const b = op.execute(a);

    expect(b).toBe('adbc e'.replace(' ', ''));
  });

  // Execute_MoveMultiChar_Forward
  it('should move multiple chars forward', () => {
    const op = new MoveAfterEditOperation();
    op.at = 2;
    op.run = 2;
    op.to = 5;
    const a = 'abcdef';

    const b = op.execute(a);

    expect(b).toBe('adebcf');
  });

  // Execute_MoveMultiChar_Backward
  it('should move multiple chars backward', () => {
    const op = new MoveAfterEditOperation();
    op.at = 4;
    op.run = 2;
    op.to = 1;
    const a = 'abcdef';

    const b = op.execute(a);

    expect(b).toBe('adebcf');
  });

  // Execute_InvalidPosition_Throws
  it('should throw for invalid position', () => {
    const op = new MoveAfterEditOperation();
    op.at = 0;
    op.run = 1;
    op.to = 2;
    const a = 'abc';

    expect(() => op.execute(a)).toThrow();
  });

  // Execute_InvalidTargetPosition_Throws
  it('should throw for invalid target position', () => {
    const op = new MoveAfterEditOperation();
    op.at = 1;
    op.run = 1;
    op.to = 0;
    const a = 'abc';

    expect(() => op.execute(a)).toThrow();
  });

  // Parse_QuotedText_Position_Target
  it('should parse quoted text, position, and target', () => {
    const op = new MoveAfterEditOperation();
    op.parse('"abc"@2->@4');

    expect(op.inputText).toBe('abc');
    expect(op.at).toBe(2);
    expect(op.run).toBe(1);
    expect(op.to).toBe(4);
  });

  // Parse_QuotedText_Position_Length_Target
  it('should parse quoted text, position, length, and target', () => {
    const op = new MoveAfterEditOperation();
    op.parse('"abc"@2x3->@4');

    expect(op.inputText).toBe('abc');
    expect(op.at).toBe(2);
    expect(op.run).toBe(3);
    expect(op.to).toBe(4);
  });

  // Parse_Position_Only
  it('should parse position only', () => {
    const op = new MoveAfterEditOperation();
    op.parse('@4->@2');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(4);
    expect(op.run).toBe(1);
    expect(op.to).toBe(2);
  });

  // Parse_Position_Length_x
  it('should parse position and length with x', () => {
    const op = new MoveAfterEditOperation();
    op.parse('@4x2->@2');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(4);
    expect(op.run).toBe(2);
    expect(op.to).toBe(2);
  });

  // Parse_Position_Length_times
  it('should parse position and length with times symbol', () => {
    const op = new MoveAfterEditOperation();
    op.parse('@4×2->@2');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(4);
    expect(op.run).toBe(2);
    expect(op.to).toBe(2);
  });

  // Parse_InvalidFormat_Throws
  it('should throw for invalid format', () => {
    const op = new MoveAfterEditOperation();
    expect(() => op.parse('invalid!')).toThrow(ParseException);
  });

  // Parse_InvalidPosition_Throws
  it('should throw for invalid position', () => {
    const op = new MoveAfterEditOperation();
    expect(() => op.parse('@0->@2')).toThrow(ParseException);
  });

  // Parse_InvalidLength_Throws
  it('should throw for invalid length', () => {
    const op = new MoveAfterEditOperation();
    expect(() => op.parse('@2x0->@3')).toThrow(ParseException);
  });

  // Parse_InvalidTargetPosition_Throws
  it('should throw for invalid target position', () => {
    const op = new MoveAfterEditOperation();
    expect(() => op.parse('@2->@0')).toThrow(ParseException);
  });

  // ToString_ReturnsExpected
  it('should return expected string', () => {
    const op = new MoveAfterEditOperation();
    op.at = 2;
    op.run = 3;
    op.to = 5;

    expect(op.toString()).toBe('@2x3->@5');
  });

  // ToString_WithInputText_Note_Tags
  it('should return string with inputText, note, and tags', () => {
    const op = new MoveAfterEditOperation();
    op.inputText = 'abc';
    op.at = 2;
    op.run = 3;
    op.to = 5;
    op.note = 'note';
    op.tags = ['t1', 't2'];

    expect(op.toString()).toBe('"abc"@2x3->@5 (note) [t1 t2]');
  });
});
