import { TokenLocation } from './token-location';
import { TokenPoint } from './token-point';

describe('TokenLocation', () => {
  describe('constructor', () => {
    it('should set primary and leave secondary undefined by default', () => {
      const p = new TokenPoint(1, 1);
      const loc = new TokenLocation(p);
      expect(loc.primary).toBe(p);
      expect(loc.secondary).toBeUndefined();
    });

    it('should set both primary and secondary when provided', () => {
      const p = new TokenPoint(1, 1);
      const s = new TokenPoint(1, 2);
      const loc = new TokenLocation(p, s);
      expect(loc.primary).toBe(p);
      expect(loc.secondary).toBe(s);
    });
  });

  describe('parse', () => {
    it('should return null for an empty string', () => {
      expect(TokenLocation.parse('')).toBeNull();
    });

    it('should return null (not a zombie object) for a malformed non-empty string', () => {
      // regression test: 'not-a-location'.split('-', 2) yields ['not', 'a'],
      // a 2-element pair, so the old code went on to construct
      // `new TokenLocation(TokenPoint.parse('not')!, ...)` - TokenPoint.parse
      // returns null for non-numeric input, producing a TokenLocation with
      // primary=null instead of returning null for the whole parse.
      expect(TokenLocation.parse('not-a-location')).toBeNull();
      expect(TokenLocation.parse('garbage')).toBeNull();
    });

    it('should parse a single point location', () => {
      const loc = TokenLocation.parse('1.2')!;
      expect(loc.primary.y).toBe(1);
      expect(loc.primary.x).toBe(2);
      expect(loc.secondary).toBeUndefined();
    });

    it('should parse a range location', () => {
      const loc = TokenLocation.parse('1.2-1.4')!;
      expect(loc.primary.toString()).toBe('1.2');
      expect(loc.secondary!.toString()).toBe('1.4');
    });

    it('should parse points with at/run portions', () => {
      const loc = TokenLocation.parse('1.1@3x2-1.2@1x2')!;
      expect(loc.primary.toString()).toBe('1.1@3x2');
      expect(loc.secondary!.toString()).toBe('1.2@1x2');
    });
  });

  describe('isRange', () => {
    it('should be false when there is no secondary point', () => {
      expect(new TokenLocation(new TokenPoint(1, 1)).isRange()).toBe(false);
    });

    it('should be true when a secondary point is present', () => {
      expect(
        new TokenLocation(new TokenPoint(1, 1), new TokenPoint(1, 2)).isRange()
      ).toBe(true);
    });
  });

  describe('toString', () => {
    it('should render a single point as just the primary point', () => {
      expect(TokenLocation.parse('1.2')!.toString()).toBe('1.2');
    });

    it('should render a range as "primary-secondary"', () => {
      expect(TokenLocation.parse('1.2-1.4')!.toString()).toBe('1.2-1.4');
    });
  });

  describe('compareTo', () => {
    it('should compare by primary point first', () => {
      const a = TokenLocation.parse('1.1')!;
      const b = TokenLocation.parse('1.2')!;
      expect(a.compareTo(b)).toBeLessThan(0);
      expect(b.compareTo(a)).toBeGreaterThan(0);
    });

    it('should compare by secondary point when both have one and primaries are equal', () => {
      const a = TokenLocation.parse('1.1-1.2')!;
      const b = TokenLocation.parse('1.1-1.3')!;
      expect(a.compareTo(b)).toBeLessThan(0);
    });

    it('should return 0 when neither has a secondary and primaries are equal', () => {
      const a = TokenLocation.parse('1.1')!;
      const b = TokenLocation.parse('1.1')!;
      expect(a.compareTo(b)).toBe(0);
    });

    it('should consider a range greater than a point sharing the same primary', () => {
      const point = TokenLocation.parse('1.1')!;
      const range = TokenLocation.parse('1.1-1.5')!;
      expect(point.compareTo(range)).toBeLessThan(0);
      expect(range.compareTo(point)).toBeGreaterThan(0);
    });
  });

  describe('overlaps', () => {
    it('should return false when the other location has no primary', () => {
      const a = TokenLocation.parse('1.1')!;
      const other = new TokenLocation(undefined as any);
      expect(a.overlaps(other)).toBe(false);
    });

    // both points
    it('point vs equal point should overlap', () => {
      const a = TokenLocation.parse('1.1')!;
      const b = TokenLocation.parse('1.1')!;
      expect(a.overlaps(b)).toBe(true);
    });

    it('point vs different point should not overlap', () => {
      const a = TokenLocation.parse('1.1')!;
      const b = TokenLocation.parse('1.2')!;
      expect(a.overlaps(b)).toBe(false);
    });

    // this=range, other=point
    it('range containing a point should overlap it', () => {
      const range = TokenLocation.parse('1.1-1.3')!;
      const point = TokenLocation.parse('1.2')!;
      expect(range.overlaps(point)).toBe(true);
    });

    it('range not containing a point should not overlap it', () => {
      const range = TokenLocation.parse('1.1-1.3')!;
      const point = TokenLocation.parse('1.4')!;
      expect(range.overlaps(point)).toBe(false);
    });

    // this=point, other=range
    it('point inside another range should overlap it', () => {
      const point = TokenLocation.parse('1.2')!;
      const range = TokenLocation.parse('1.1-1.3')!;
      expect(point.overlaps(range)).toBe(true);
    });

    it('point outside another range should not overlap it', () => {
      const point = TokenLocation.parse('1.5')!;
      const range = TokenLocation.parse('1.1-1.3')!;
      expect(point.overlaps(range)).toBe(false);
    });

    // both ranges
    it('overlapping ranges should overlap', () => {
      const a = TokenLocation.parse('1.1-1.3')!;
      const b = TokenLocation.parse('1.2-1.4')!;
      expect(a.overlaps(b)).toBe(true);
      expect(b.overlaps(a)).toBe(true);
    });

    it('adjacent touching ranges should overlap (inclusive bounds)', () => {
      const a = TokenLocation.parse('1.1-1.2')!;
      const b = TokenLocation.parse('1.2-1.3')!;
      expect(a.overlaps(b)).toBe(true);
    });

    it('disjoint ranges should not overlap', () => {
      const a = TokenLocation.parse('1.1-1.2')!;
      const b = TokenLocation.parse('1.4-1.5')!;
      expect(a.overlaps(b)).toBe(false);
    });
  });
});
