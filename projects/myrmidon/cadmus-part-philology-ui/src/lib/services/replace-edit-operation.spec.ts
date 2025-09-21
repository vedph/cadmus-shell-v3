import { ReplaceEditOperation } from './replace-edit-operation';
import { ParseException } from './edit-operation';

describe('ReplaceEditOperation', () => {
  it('should replace a single character', () => {
    const op = new ReplaceEditOperation();
    op.at = 2;
    op.run = 1;
    op.text = 'X';
    const a = 'abcde';

    const b = op.execute(a);

    expect(b).toBe('aXcde');
  });

  it('should replace multiple characters', () => {
    const op = new ReplaceEditOperation();
    op.at = 2;
    op.run = 3;
    op.text = 'XY';
    const a = 'abcdef';

    const b = op.execute(a);

    expect(b).toBe('aXYef');
  });

  it('should throw for invalid position', () => {
    const op = new ReplaceEditOperation();
    op.at = 0;
    op.run = 1;
    op.text = 'X';
    const a = 'abc';

    expect(() => op.execute(a)).toThrowError(RangeError);
  });

  it('should throw for invalid length', () => {
    const op = new ReplaceEditOperation();
    op.at = 2;
    op.run = 0;
    op.text = 'X';
    const a = 'abc';

    expect(() => op.execute(a)).toThrowError(RangeError);
  });

  it('should parse quoted text, position, replacement', () => {
    const op = new ReplaceEditOperation();
    op.parse('"abc"@2="X"');

    expect(op.inputText).toBe('abc');
    expect(op.at).toBe(2);
    expect(op.run).toBe(1);
    expect(op.text).toBe('X');
  });

  it('should parse quoted text, position, length, replacement', () => {
    const op = new ReplaceEditOperation();
    op.parse('"abc"@2x3="XY"');

    expect(op.inputText).toBe('abc');
    expect(op.at).toBe(2);
    expect(op.run).toBe(3);
    expect(op.text).toBe('XY');
  });

  it('should parse position only', () => {
    const op = new ReplaceEditOperation();
    op.parse('@4="Z"');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(4);
    expect(op.run).toBe(1);
    expect(op.text).toBe('Z');
  });

  it('should parse position and length with x', () => {
    const op = new ReplaceEditOperation();
    op.parse('@4x2="Z"');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(4);
    expect(op.run).toBe(2);
    expect(op.text).toBe('Z');
  });

  it('should parse position and length with times sign', () => {
    const op = new ReplaceEditOperation();
    op.parse('@4×2="Z"');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(4);
    expect(op.run).toBe(2);
    expect(op.text).toBe('Z');
  });

  it('should throw for invalid format', () => {
    const op = new ReplaceEditOperation();
    expect(() => op.parse('invalid!')).toThrowError(ParseException);
  });

  it('should throw for invalid position', () => {
    const op = new ReplaceEditOperation();
    expect(() => op.parse('@0="X"')).toThrowError(ParseException);
  });

  it('should throw for invalid length', () => {
    const op = new ReplaceEditOperation();
    expect(() => op.parse('@2x0="X"')).toThrowError(ParseException);
  });

  it('toString should return expected', () => {
    const op = new ReplaceEditOperation();
    op.at = 2;
    op.run = 3;
    op.text = 'XY';

    const s = op.toString();

    expect(s).toBe('@2x3="XY"');
  });

  it('toString with inputText, note, tags', () => {
    const op = new ReplaceEditOperation();
    op.inputText = 'abc';
    op.at = 2;
    op.run = 3;
    op.text = 'XY';
    op.note = 'note';
    op.tags = ['t1', 't2'];

    const s = op.toString();

    expect(s).toBe('"abc"@2x3="XY" (note) [t1 t2]');
  });
});
