import { CsvReader } from './csv-reader';

describe('CsvReader', () => {
  it('should be created', () => {
    expect(new CsvReader('')).toBeTruthy();
  });

  it('should read row A|B|C no LF', () => {
    const reader = new CsvReader('A,B,C');
    // row 1
    let row = reader.read();
    expect(row).toBeTruthy();
    if (!row) {
      return;
    }
    expect(row[0]).toBe('A');
    expect(row[1]).toBe('B');
    expect(row[2]).toBe('C');
    // no more rows
    row = reader.read();
    expect(row).toBeNull();
  });

  it('should read rows A|B and C|D', () => {
    const reader = new CsvReader('A,B\nC,D\n');
    // row 1
    let row = reader.read();
    expect(row).toBeTruthy();
    if (!row) {
      return;
    }
    expect(row[0]).toBe('A');
    expect(row[1]).toBe('B');
    // row 2
     row = reader.read();
    expect(row).toBeTruthy();
    if (!row) {
      return;
    }
    expect(row[0]).toBe('C');
    expect(row[1]).toBe('D');
    // no more rows
    row = reader.read();
    expect(row).toBeNull();
  });

  function readAll(text: string, options?: any): string[][] {
    const reader = new CsvReader(text, options);
    const rows: string[][] = [];
    let row: readonly string[] | null;
    while ((row = reader.read()) !== null) {
      rows.push([...row]);
    }
    return rows;
  }

  describe('quoted fields (regression: quoting was completely broken)', () => {
    it('should parse a simple quoted field as the very first field of a row', () => {
      // this used to throw "Invalid CSV at 0:1" for ANY quoted first field,
      // because handleQuote() treated index 0 (falsy) as "escaped" instead
      // of checking whether the previous char was a backslash
      expect(readAll('"ab",c')).toEqual([['ab', 'c']]);
    });

    it('should preserve a comma embedded in a quoted field', () => {
      expect(readAll('"a,b",c')).toEqual([['a,b', 'c']]);
    });

    it('should preserve a newline embedded in a quoted field', () => {
      expect(readAll('"a\nb",c')).toEqual([['a\nb', 'c']]);
    });

    it('should unescape a backslash-escaped quote inside a quoted field', () => {
      expect(readAll('"a\\"b",c')).toEqual([['a"b', 'c']]);
    });

    it('should still throw on a quote appearing mid unquoted field', () => {
      expect(() => readAll('a"b,c')).toThrow();
    });
  });

  describe('options', () => {
    it('should trim fields by default', () => {
      expect(readAll(' a , b ')).toEqual([['a', 'b']]);
    });

    it('should not trim fields when trimming is false', () => {
      expect(readAll(' a , b ', { trimming: false })).toEqual([[' a ', ' b ']]);
    });

    it('should support a custom field separator', () => {
      expect(readAll('a;b;c', { fieldSeparator: ';' })).toEqual([
        ['a', 'b', 'c'],
      ]);
    });
  });

  it('should return no rows for empty text', () => {
    expect(readAll('')).toEqual([]);
  });
});
