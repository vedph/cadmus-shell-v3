import { FlagBitPipe } from './flag-bit.pipe';

describe('FlagBitPipe', () => {
  let pipe: FlagBitPipe;

  beforeEach(() => {
    pipe = new FlagBitPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the 1-based index of the lowest set bit', () => {
    expect(pipe.transform(1)).toBe('1');
    expect(pipe.transform(2)).toBe('2');
    expect(pipe.transform(4)).toBe('3');
    expect(pipe.transform(8)).toBe('4');
  });

  it('should return the lowest set bit when multiple bits are set', () => {
    expect(pipe.transform(0b1010)).toBe('2');
    expect(pipe.transform(0b1100)).toBe('3');
  });

  it('should return an empty string for a value with no bits set', () => {
    expect(pipe.transform(0)).toBe('');
  });

  it('should treat a falsy/null/undefined value as 0', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should find the highest supported bit (32nd)', () => {
    expect(pipe.transform(1 << 31)).toBe('32');
  });
});
