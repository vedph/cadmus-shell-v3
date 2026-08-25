import { TokenPoint } from './token-point';

describe('TokenPoint', () => {
  describe('constructor', () => {
    it('should set y and x, defaulting at and run to 0', () => {
      const pt = new TokenPoint(1, 2);
      expect(pt.y).toBe(1);
      expect(pt.x).toBe(2);
      expect(pt.at).toBe(0);
      expect(pt.run).toBe(0);
    });

    it('should set at and run when provided', () => {
      const pt = new TokenPoint(1, 2, 3, 4);
      expect(pt.at).toBe(3);
      expect(pt.run).toBe(4);
    });
  });

  describe('parse', () => {
    it('should return null for a string not matching the pattern', () => {
      expect(TokenPoint.parse('not-a-point')).toBeNull();
    });

    it('should parse a plain "Y.X" point', () => {
      const pt = TokenPoint.parse('1.2')!;
      expect(pt.y).toBe(1);
      expect(pt.x).toBe(2);
      expect(pt.at).toBe(0);
      expect(pt.run).toBe(0);
    });

    it('should parse "Y.X@A" defaulting run to 1', () => {
      const pt = TokenPoint.parse('1.2@3')!;
      expect(pt.y).toBe(1);
      expect(pt.x).toBe(2);
      expect(pt.at).toBe(3);
      expect(pt.run).toBe(1);
    });

    it('should parse "Y.X@AxR"', () => {
      const pt = TokenPoint.parse('1.2@3x4')!;
      expect(pt.y).toBe(1);
      expect(pt.x).toBe(2);
      expect(pt.at).toBe(3);
      expect(pt.run).toBe(4);
    });
  });

  describe('toString', () => {
    it('should render a plain point as "Y.X"', () => {
      expect(new TokenPoint(1, 2).toString()).toBe('1.2');
    });

    it('should omit @A when at is falsy even if run is set', () => {
      expect(new TokenPoint(1, 2, 0, 4).toString()).toBe('1.2');
    });

    it('should omit xR when run is falsy even if at is set', () => {
      expect(new TokenPoint(1, 2, 3, 0).toString()).toBe('1.2');
    });

    it('should render "Y.X@A" when run is 1', () => {
      expect(new TokenPoint(1, 2, 3, 1).toString()).toBe('1.2@3');
    });

    it('should render "Y.X@AxR" when run is greater than 1', () => {
      expect(new TokenPoint(1, 2, 3, 4).toString()).toBe('1.2@3x4');
    });

    it('should round-trip through parse', () => {
      const original = '2.5@3x4';
      expect(TokenPoint.parse(original)!.toString()).toBe(original);
    });
  });

  describe('compareTo', () => {
    it('should compare by y first', () => {
      expect(new TokenPoint(1, 5).compareTo(new TokenPoint(2, 1))).toBeLessThan(0);
      expect(new TokenPoint(2, 1).compareTo(new TokenPoint(1, 5))).toBeGreaterThan(0);
    });

    it('should compare by x when y is equal', () => {
      expect(new TokenPoint(1, 1).compareTo(new TokenPoint(1, 2))).toBeLessThan(0);
      expect(new TokenPoint(1, 2).compareTo(new TokenPoint(1, 1))).toBeGreaterThan(0);
    });

    it('should compare by at when y and x are equal', () => {
      expect(
        new TokenPoint(1, 1, 1, 1).compareTo(new TokenPoint(1, 1, 2, 1))
      ).toBeLessThan(0);
    });

    it('should compare by run when y, x and at are equal', () => {
      expect(
        new TokenPoint(1, 1, 1, 1).compareTo(new TokenPoint(1, 1, 1, 2))
      ).toBeLessThan(0);
    });

    it('should return 0 for equal points', () => {
      expect(new TokenPoint(1, 2, 3, 4).compareTo(new TokenPoint(1, 2, 3, 4))).toBe(
        0
      );
    });
  });

  describe('integralCompareTo', () => {
    it('should compare by y then x, ignoring at/run', () => {
      expect(
        new TokenPoint(1, 2, 3, 4).integralCompareTo(new TokenPoint(1, 2, 9, 9))
      ).toBe(0);
      expect(
        new TokenPoint(1, 1).integralCompareTo(new TokenPoint(1, 2))
      ).toBeLessThan(0);
      expect(
        new TokenPoint(2, 1).integralCompareTo(new TokenPoint(1, 1))
      ).toBeGreaterThan(0);
    });
  });
});
