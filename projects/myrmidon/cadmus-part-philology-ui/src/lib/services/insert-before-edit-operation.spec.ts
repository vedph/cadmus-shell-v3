import { InsertBeforeEditOperation, ParseException } from './edit-operation';

describe('InsertBeforeEditOperation', () => {
  it('should insert at start', () => {
    const op = new InsertBeforeEditOperation();
    op.at = 0;
    op.text = 'abc';
    const a = 'xyz';

    const b = op.execute(a);

    expect(b).toBe('abcxyz');
  });

  it('should insert in middle', () => {
    const op = new InsertBeforeEditOperation();
    op.at = 2;
    op.text = 'abc';
    const a = 'xyz';

    const b = op.execute(a);

    expect(b).toBe('xabcyz');
  });

  it('should insert at end', () => {
    const op = new InsertBeforeEditOperation();
    op.at = 3;
    op.text = 'X';
    const a = 'abc';

    const b = op.execute(a);

    expect(b).toBe('abXc');
  });

  it('should throw on invalid position', () => {
    const op = new InsertBeforeEditOperation();
    op.at = 10;
    op.text = 'abc';
    const a = 'xyz';

    expect(() => op.execute(a)).toThrowError(RangeError);
  });

  it('should parse valid format', () => {
    const op = new InsertBeforeEditOperation();
    op.parse('@2+="abc"');

    expect(op.at).toBe(2);
    expect(op.text).toBe('abc');
  });

  it('should parse valid format with zero position', () => {
    const op = new InsertBeforeEditOperation();
    op.parse('@0+="abc"');

    expect(op.at).toBe(0);
    expect(op.text).toBe('abc');
  });

  it('should throw on invalid format', () => {
    const op = new InsertBeforeEditOperation();
    expect(() => op.parse('invalid!')).toThrowError(ParseException);
  });

  it('should throw on negative position', () => {
    const op = new InsertBeforeEditOperation();
    expect(() => op.parse('@-1+="abc"')).toThrowError(ParseException);
  });

  it('toString should return expected', () => {
    const op = new InsertBeforeEditOperation();
    op.at = 2;
    op.text = 'abc';

    const s = op.toString();

    expect(s).toBe('@2+="abc"');
  });

  it('toString with note and tags', () => {
    const op = new InsertBeforeEditOperation();
    op.at = 2;
    op.text = 'abc';
    op.note = 'note';
    op.tags = ['t1', 't2'];

    const s = op.toString();

    expect(s).toBe('@2+="abc" [t1 t2] {note}');
  });
});
