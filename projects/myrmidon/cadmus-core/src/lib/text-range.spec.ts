import { TextRange } from './text-range';

describe('TextRange', () => {
  describe('constructor', () => {
    it('should set start and length', () => {
      const r = new TextRange(2, 3);
      expect(r.start).toBe(2);
      expect(r.length).toBe(3);
    });

    it('should throw a RangeError when start is negative', () => {
      expect(() => new TextRange(-1, 3)).toThrow(RangeError);
    });

    it('should throw a RangeError when length is negative', () => {
      expect(() => new TextRange(0, -1)).toThrow(RangeError);
    });

    it('should allow a zero-length range', () => {
      const r = new TextRange(2, 0);
      expect(r.length).toBe(0);
    });
  });

  describe('parse', () => {
    it('should return null for an empty string', () => {
      expect(TextRange.parse('')).toBeNull();
    });

    it('should return null for a non-matching string', () => {
      expect(TextRange.parse('abc')).toBeNull();
    });

    it('should parse a plain start with implicit length 1', () => {
      const r = TextRange.parse('5')!;
      expect(r.start).toBe(5);
      expect(r.length).toBe(1);
    });

    it('should parse a "startxlength" pair', () => {
      const r = TextRange.parse('5x3')!;
      expect(r.start).toBe(5);
      expect(r.length).toBe(3);
    });

    it('should also parse the "×" multiplication sign as separator', () => {
      const r = TextRange.parse('5×3')!;
      expect(r.start).toBe(5);
      expect(r.length).toBe(3);
    });
  });

  describe('end', () => {
    it('should return the inclusive last index for a positive-length range', () => {
      expect(new TextRange(2, 3).end()).toBe(4);
    });

    it('should return start - 1 for a zero-length range starting after 0', () => {
      expect(new TextRange(2, 0).end()).toBe(1);
    });

    it('should return 0 for a zero-length range starting at 0', () => {
      expect(new TextRange(0, 0).end()).toBe(0);
    });
  });

  describe('isEqual', () => {
    it('should return false when compared with a falsy value', () => {
      expect(new TextRange(1, 2).isEqual(undefined as any)).toBe(false);
    });

    it('should return true for ranges with the same start and length', () => {
      expect(new TextRange(1, 2).isEqual(new TextRange(1, 2))).toBe(true);
    });

    it('should return false when start differs', () => {
      expect(new TextRange(1, 2).isEqual(new TextRange(2, 2))).toBe(false);
    });

    it('should return false when length differs', () => {
      expect(new TextRange(1, 2).isEqual(new TextRange(1, 3))).toBe(false);
    });
  });

  describe('toString', () => {
    it('should render just the start when length is 1', () => {
      expect(new TextRange(5, 1).toString()).toBe('5');
    });

    it('should render "start×length" when length is not 1', () => {
      expect(new TextRange(5, 3).toString()).toBe('5×3');
    });

    it('should render "start×0" for a zero-length range', () => {
      expect(new TextRange(5, 0).toString()).toBe('5×0');
    });

    it('should round-trip a multi-length range through parse', () => {
      const original = '5×3';
      expect(TextRange.parse(original)!.toString()).toBe(original);
    });
  });
});
