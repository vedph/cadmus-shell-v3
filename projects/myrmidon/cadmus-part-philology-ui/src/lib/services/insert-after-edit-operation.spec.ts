import { InsertAfterEditOperation } from './insert-after-edit-operation';
import { ParseException } from './edit-operation';

describe('InsertAfterEditOperation', () => {
  it('should insert at start', () => {
    const op = new InsertAfterEditOperation();
    op.at = 0;
    op.text = 'abc';
    const a = 'xyz';

    const b = op.execute(a);

    expect(b).toBe('xyzabc');
  });

  it('should insert in middle', () => {
    const op = new InsertAfterEditOperation();
    op.at = 2;
    op.text = 'abc';
    const a = 'xyz';

    const b = op.execute(a);

    expect(b).toBe('xyabcz');
  });

  it('should insert at end', () => {
    const op = new InsertAfterEditOperation();
    op.at = 3;
    op.text = 'abc';
    const a = 'xyz';

    const b = op.execute(a);

    expect(b).toBe('xyzabc');
  });

  it('should throw on null or undefined input', () => {
    const op = new InsertAfterEditOperation();
    op.at = 1;
    op.text = 'abc';

    expect(() => op.execute(undefined as any)).toThrowError(
      'Input cannot be null or undefined'
    );
    expect(() => op.execute(null as any)).toThrowError(
      'Input cannot be null or undefined'
    );
  });

  it('should throw on invalid position', () => {
    const op = new InsertAfterEditOperation();
    op.at = 5;
    op.text = 'abc';
    const a = 'xyz';

    expect(() => op.execute(a)).toThrow();
  });

  it('should parse valid format', () => {
    const op = new InsertAfterEditOperation();
    op.parse('@2=+"abc"');

    expect(op.at).toBe(2);
    expect(op.text).toBe('abc');
  });

  it('should parse valid format with zero position', () => {
    const op = new InsertAfterEditOperation();
    op.parse('@0=+"abc"');

    expect(op.at).toBe(0);
    expect(op.text).toBe('abc');
  });

  it('should throw on invalid format', () => {
    const op = new InsertAfterEditOperation();
    expect(() => op.parse('invalid!')).toThrowError(ParseException);
  });

  it('should throw on negative position', () => {
    const op = new InsertAfterEditOperation();
    expect(() => op.parse('@-1=+"abc"')).toThrowError(ParseException);
  });

  it('toString should return expected', () => {
    const op = new InsertAfterEditOperation();
    op.at = 2;
    op.text = 'abc';

    const s = op.toString();

    expect(s).toBe('@2=+"abc"');
  });

  it('toString with note and tags', () => {
    const op = new InsertAfterEditOperation();
    op.at = 2;
    op.text = 'abc';
    op.note = 'note';
    op.tags.push('t1');
    op.tags.push('t2');

    const s = op.toString();

    expect(s).toBe('@2=+"abc" (note) [t1 t2]');
  });
});
