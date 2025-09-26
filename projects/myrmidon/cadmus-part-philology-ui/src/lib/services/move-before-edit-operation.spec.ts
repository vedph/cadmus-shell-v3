import { MoveBeforeEditOperation, ParseException } from './edit-operation';

describe('MoveBeforeEditOperation', () => {
  it('should move single char forward', () => {
    const op = new MoveBeforeEditOperation();
    op.at = 2;
    op.run = 1;
    op.to = 4;
    const a = 'abcde';

    const b = op.execute(a);

    expect(b).toBe('acbde');
  });

  it('should move single char backward', () => {
    const op = new MoveBeforeEditOperation();
    op.at = 4;
    op.run = 1;
    op.to = 1;
    const a = 'abcde';

    const b = op.execute(a);

    expect(b).toBe('dabce');
  });

  it('should move multi char forward', () => {
    const op = new MoveBeforeEditOperation();
    op.at = 2;
    op.run = 2;
    op.to = 5;
    const a = 'abcdef';

    const b = op.execute(a);

    expect(b).toBe('adbcef');
  });

  it('should move multi char backward', () => {
    const op = new MoveBeforeEditOperation();
    op.at = 4;
    op.run = 2;
    op.to = 1;
    const a = 'abcdef';

    const b = op.execute(a);

    expect(b).toBe('deabcf');
  });

  it('should throw for invalid position', () => {
    const op = new MoveBeforeEditOperation();
    op.at = 0;
    op.run = 1;
    op.to = 2;
    const a = 'abc';

    expect(() => op.execute(a)).toThrow();
  });

  it('should throw for invalid target position', () => {
    const op = new MoveBeforeEditOperation();
    op.at = 1;
    op.run = 1;
    op.to = 0;
    const a = 'abc';

    expect(() => op.execute(a)).toThrow();
  });

  it('should parse quoted text, position, target', () => {
    const op = new MoveBeforeEditOperation();
    op.parse('"abc"@2>@4');

    expect(op.inputText).toBe('abc');
    expect(op.at).toBe(2);
    expect(op.run).toBe(1);
    expect(op.to).toBe(4);
  });

  it('should parse quoted text, position, length, target', () => {
    const op = new MoveBeforeEditOperation();
    op.parse('"abc"@2x3>@4');

    expect(op.inputText).toBe('abc');
    expect(op.at).toBe(2);
    expect(op.run).toBe(3);
    expect(op.to).toBe(4);
  });

  it('should parse position only', () => {
    const op = new MoveBeforeEditOperation();
    op.parse('@4>@2');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(4);
    expect(op.run).toBe(1);
    expect(op.to).toBe(2);
  });

  it('should parse position and length with x', () => {
    const op = new MoveBeforeEditOperation();
    op.parse('@4x2>@2');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(4);
    expect(op.run).toBe(2);
    expect(op.to).toBe(2);
  });

  it('should parse position and length with times', () => {
    const op = new MoveBeforeEditOperation();
    op.parse('@4×2>@2');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(4);
    expect(op.run).toBe(2);
    expect(op.to).toBe(2);
  });

  it('should throw for invalid format', () => {
    const op = new MoveBeforeEditOperation();
    expect(() => op.parse('invalid!')).toThrowError(ParseException);
  });

  it('should throw for invalid position', () => {
    const op = new MoveBeforeEditOperation();
    expect(() => op.parse('@0>@2')).toThrowError(ParseException);
  });

  it('should throw for invalid length', () => {
    const op = new MoveBeforeEditOperation();
    expect(() => op.parse('@2x0>@3')).toThrowError(ParseException);
  });

  it('should throw for invalid target position', () => {
    const op = new MoveBeforeEditOperation();
    expect(() => op.parse('@2>@0')).toThrowError(ParseException);
  });

  it('should return expected string from toString', () => {
    const op = new MoveBeforeEditOperation();
    op.at = 2;
    op.run = 3;
    op.to = 5;

    const s = op.toString();

    expect(s).toBe('@2x3>@5');
  });

  it('should return expected string with inputText, note, tags', () => {
    const op = new MoveBeforeEditOperation();
    op.inputText = 'abc';
    op.at = 2;
    op.run = 3;
    op.to = 5;
    op.note = 'note';
    op.tags = ['t1', 't2'];

    const s = op.toString();

    expect(s).toBe('"abc"@2x3>@5 [t1 t2] {note}');
  });
});
