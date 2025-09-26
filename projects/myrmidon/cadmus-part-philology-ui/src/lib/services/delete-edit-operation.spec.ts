import { DeleteEditOperation, ParseException } from './edit-operation';

describe('DeleteEditOperation', () => {
  describe('parse', () => {
    it('should parse @3!', () => {
      const op = new DeleteEditOperation();
      op.parse('@3!');
      expect(op.inputText).toBeUndefined();
      expect(op.at).toBe(3);
      expect(op.run).toBe(1);
    });

    it('should parse "A"@3!', () => {
      const op = new DeleteEditOperation();
      op.parse('"A"@3!');
      expect(op.inputText).toBe('A');
      expect(op.at).toBe(3);
      expect(op.run).toBe(1);
    });

    it('should parse @3x2!', () => {
      const op = new DeleteEditOperation();
      op.parse('@3x2!');
      expect(op.inputText).toBeUndefined();
      expect(op.at).toBe(3);
      expect(op.run).toBe(2);
    });

    it('should parse "foo"@2x4!', () => {
      const op = new DeleteEditOperation();
      op.parse('"foo"@2x4!');
      expect(op.inputText).toBe('foo');
      expect(op.at).toBe(2);
      expect(op.run).toBe(4);
    });

    it('should parse with note and tags', () => {
      const op = new DeleteEditOperation();
      op.parse('"test"@5x3! [tag1 tag2] {test note}');
      expect(op.inputText).toBe('test');
      expect(op.at).toBe(5);
      expect(op.run).toBe(3);
      expect(op.tags).toEqual(['tag1', 'tag2']);
      expect(op.note).toBe('test note');
    });

    it('should parse with only note', () => {
      const op = new DeleteEditOperation();
      op.parse('@1! {just a note}');
      expect(op.at).toBe(1);
      expect(op.run).toBe(1);
      expect(op.note).toBe('just a note');
      expect(op.tags).toBeUndefined();
    });

    it('should parse with only tags', () => {
      const op = new DeleteEditOperation();
      op.parse('@7x2! [single]');
      expect(op.at).toBe(7);
      expect(op.run).toBe(2);
      expect(op.tags).toEqual(['single']);
      expect(op.note).toBeUndefined();
    });

    it('should throw on invalid format', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('bad')).toThrowError(ParseException);
    });

    it('should throw on invalid position', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('@0!')).toThrowError(ParseException);
      expect(() => op.parse('@-1!')).toThrowError(ParseException);
      expect(() => op.parse('@x!')).toThrowError(ParseException);
    });

    it('should throw on invalid run', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('@2x0!')).toThrowError(ParseException);
      expect(() => op.parse('@2x-1!')).toThrowError(ParseException);
      expect(() => op.parse('@2xx!')).toThrowError(ParseException);
    });

    it('should throw on empty string', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('')).toThrowError();
      expect(() => op.parse('   ')).toThrowError();
    });

    it('should throw on missing exclamation mark', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('@1')).toThrowError(ParseException);
    });

    it('should throw on malformed quoted text', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('"unclosed@1!')).toThrowError(ParseException);
    });
  });

  describe('execute', () => {
    it('should delete 1 char at position', () => {
      const op = new DeleteEditOperation();
      op.at = 2;
      op.run = 1;
      expect(op.execute('abcde')).toBe('acde');
    });

    it('should delete multiple chars at position', () => {
      const op = new DeleteEditOperation();
      op.at = 2;
      op.run = 3;
      expect(op.execute('abcde')).toBe('ae');
    });

    it('should delete from beginning', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 2;
      expect(op.execute('hello')).toBe('llo');
    });

    it('should delete from end', () => {
      const op = new DeleteEditOperation();
      op.at = 4;
      op.run = 2;
      expect(op.execute('hello')).toBe('hel');
    });

    it('should delete entire string', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 5;
      expect(op.execute('hello')).toBe('');
    });

    it('should delete single character string', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 1;
      expect(op.execute('a')).toBe('');
    });

    it('should throw if input is null or undefined', () => {
      const op = new DeleteEditOperation();
      op.at = 1;
      op.run = 1;
      expect(() => op.execute(null as any)).toThrow();
      expect(() => op.execute(undefined as any)).toThrow();
    });

    it('should throw if position is out of range', () => {
      const op = new DeleteEditOperation();
      op.at = 10;
      op.run = 1;
      expect(() => op.execute('abc')).toThrow();
    });

    it('should throw if run is out of range', () => {
      const op = new DeleteEditOperation();
      op.at = 2;
      op.run = 10;
      expect(() => op.execute('abc')).toThrow();
    });

    it('should throw if position is less than 1', () => {
      const op = new DeleteEditOperation();
      op.at = 0;
      op.run = 1;
      expect(() => op.execute('abc')).toThrow();
    });

    it('should throw if run extends beyond string length', () => {
      const op = new DeleteEditOperation();
      op.at = 3;
      op.run = 2;
      expect(() => op.execute('abc')).toThrow();
    });
  });

  describe('toString', () => {
    it('should stringify minimal', () => {
      const op = new DeleteEditOperation();
      op.at = 2;
      op.run = 1;
      expect(op.toString()).toBe('@2!');
    });

    it('should stringify with inputText', () => {
      const op = new DeleteEditOperation();
      op.inputText = 'A';
      op.at = 2;
      op.run = 1;
      expect(op.toString()).toBe('"A"@2!');
    });

    it('should stringify with run > 1', () => {
      const op = new DeleteEditOperation();
      op.at = 2;
      op.run = 3;
      expect(op.toString()).toBe('@2x3!');
    });

    it('should stringify with note and tags', () => {
      const op = new DeleteEditOperation();
      op.inputText = 'foo';
      op.at = 2;
      op.run = 2;
      op.note = 'note';
      op.tags = ['a', 'b'];
      expect(op.toString()).toBe('"foo"@2x2! [a b] {note}');
    });

    it('should stringify with empty inputText', () => {
      const op = new DeleteEditOperation();
      op.inputText = '';
      op.at = 1;
      op.run = 1;
      expect(op.toString()).toBe('@1!');
    });

    it('should stringify with only note', () => {
      const op = new DeleteEditOperation();
      op.at = 3;
      op.run = 1;
      op.note = 'test note';
      expect(op.toString()).toBe('@3! {test note}');
    });

    it('should stringify with only tags', () => {
      const op = new DeleteEditOperation();
      op.at = 4;
      op.run = 2;
      op.tags = ['tag1', 'tag2', 'tag3'];
      expect(op.toString()).toBe('@4x2! [tag1 tag2 tag3]');
    });

    it('should stringify with special characters in inputText', () => {
      const op = new DeleteEditOperation();
      op.inputText = 'text with spaces';
      op.at = 1;
      op.run = 1;
      expect(op.toString()).toBe('"text with spaces"@1!');
    });
  });

  describe('integration', () => {
    it('should parse and execute correctly', () => {
      const op = new DeleteEditOperation();
      op.parse('@3x2!');
      expect(op.execute('abcdef')).toBe('abef');
    });

    it('should roundtrip toString and parse', () => {
      const op1 = new DeleteEditOperation();
      op1.inputText = 'test';
      op1.at = 5;
      op1.run = 3;
      op1.note = 'note';
      op1.tags = ['tag1', 'tag2'];

      const stringified = op1.toString();

      const op2 = new DeleteEditOperation();
      op2.parse(stringified);

      expect(op2.inputText).toBe(op1.inputText);
      expect(op2.at).toBe(op1.at);
      expect(op2.run).toBe(op1.run);
      expect(op2.note).toBe(op1.note);
      expect(op2.tags).toEqual(op1.tags);
    });
  });
});
