import { SwapEditOperation } from './swap-edit-operation';
import { ParseException } from './edit-operation';

describe('SwapEditOperation', () => {
  it('should swap single chars', () => {
    const op = new SwapEditOperation();
    op.at = 2;
    op.run = 1;
    op.at2 = 4;
    op.run2 = 1;
    const a = 'abcde';

    const b = op.execute(a);

    expect(b).toBe('adcbe');
  });

  it('should swap multi chars', () => {
    const op = new SwapEditOperation();
    op.at = 2;
    op.run = 2;
    op.at2 = 5;
    op.run2 = 2;
    const a = 'abcdefg';

    const b = op.execute(a);

    expect(b).toBe('aefdbcg');
  });

  it('should throw on overlapping', () => {
    const op = new SwapEditOperation();
    op.at = 2;
    op.run = 3;
    op.at2 = 4;
    op.run2 = 2;
    const a = 'abcdefg';

    expect(() => op.execute(a)).toThrowError();
  });

  it('should throw on invalid position', () => {
    const op = new SwapEditOperation();
    op.at = 0;
    op.run = 1;
    op.at2 = 3;
    op.run2 = 1;
    const a = 'abc';

    expect(() => op.execute(a)).toThrowError();
  });

  it('should throw on invalid second position', () => {
    const op = new SwapEditOperation();
    op.at = 1;
    op.run = 1;
    op.at2 = 0;
    op.run2 = 1;
    const a = 'abc';

    expect(() => op.execute(a)).toThrowError();
  });

  it('should parse quoted text, positions, and lengths', () => {
    const op = new SwapEditOperation();
    op.parse('"abc"@2x2<>"def"@5x2');

    expect(op.inputText).toBe('abc');
    expect(op.at).toBe(2);
    expect(op.run).toBe(2);
    expect(op.inputText2).toBe('def');
    expect(op.at2).toBe(5);
    expect(op.run2).toBe(2);
  });

  it('should parse positions only', () => {
    const op = new SwapEditOperation();
    op.parse('@2<>@4');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(2);
    expect(op.run).toBe(1);
    expect(op.inputText2).toBeUndefined();
    expect(op.at2).toBe(4);
    expect(op.run2).toBe(1);
  });

  it('should parse positions and lengths with x', () => {
    const op = new SwapEditOperation();
    op.parse('@2x2<>@5x2');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(2);
    expect(op.run).toBe(2);
    expect(op.inputText2).toBeUndefined();
    expect(op.at2).toBe(5);
    expect(op.run2).toBe(2);
  });

  it('should parse positions and lengths with times sign', () => {
    const op = new SwapEditOperation();
    op.parse('@2×2<>@5×2');

    expect(op.inputText).toBeUndefined();
    expect(op.at).toBe(2);
    expect(op.run).toBe(2);
    expect(op.inputText2).toBeUndefined();
    expect(op.at2).toBe(5);
    expect(op.run2).toBe(2);
  });

  it('should throw on invalid format', () => {
    const op = new SwapEditOperation();
    expect(() => op.parse('invalid!')).toThrowError(ParseException);
  });

  it('should throw on invalid first position', () => {
    const op = new SwapEditOperation();
    expect(() => op.parse('@0<>@2')).toThrowError(ParseException);
  });

  it('should throw on invalid first length', () => {
    const op = new SwapEditOperation();
    expect(() => op.parse('@2x0<>@3')).toThrowError(ParseException);
  });

  it('should throw on invalid second position', () => {
    const op = new SwapEditOperation();
    expect(() => op.parse('@2<>@0')).toThrowError(ParseException);
  });

  it('should throw on invalid second length', () => {
    const op = new SwapEditOperation();
    expect(() => op.parse('@2<>@3x0')).toThrowError(ParseException);
  });

  it('toString should return expected', () => {
    const op = new SwapEditOperation();
    op.at = 2;
    op.run = 2;
    op.at2 = 5;
    op.run2 = 2;

    const s = op.toString();

    expect(s).toBe('@2x2<>@5x2');
  });

  it('toString with inputText, note, tags', () => {
    const op = new SwapEditOperation();
    op.inputText = 'abc';
    op.at = 2;
    op.run = 2;
    op.inputText2 = 'def';
    op.at2 = 5;
    op.run2 = 2;
    op.note = 'note';
    op.tags = ['t1', 't2'];

    const s = op.toString();

    expect(s).toBe('"abc"@2x2<>"def"@5x2 (note) [t1 t2]');
  });
});
