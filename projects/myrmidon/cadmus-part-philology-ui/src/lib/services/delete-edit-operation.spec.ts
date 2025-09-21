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

    it('should throw on invalid format', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('bad')).toThrow(ParseException);
    });

    it('should throw on invalid position', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('@0!')).toThrow(ParseException);
      expect(() => op.parse('@-1!')).toThrow(ParseException);
      expect(() => op.parse('@x!')).toThrow(ParseException);
    });

    it('should throw on invalid run', () => {
      const op = new DeleteEditOperation();
      expect(() => op.parse('@2x0!')).toThrow(ParseException);
      expect(() => op.parse('@2x-1!')).toThrow(ParseException);
      expect(() => op.parse('@2xx!')).toThrow(ParseException);
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
  });
});
