import { ColorService } from './color.service';

describe('ColorService', () => {
  let service: ColorService;

  beforeEach(() => {
    service = new ColorService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRgb', () => {
    it('should return null for a falsy input', () => {
      expect(service.getRgb('')).toBeNull();
    });

    it('should return null for an invalid string', () => {
      expect(service.getRgb('not-a-color')).toBeNull();
    });

    it('should parse a 3-digit hex color, scaling each digit by 0x11', () => {
      expect(service.getRgb('f00')).toEqual([255, 0, 0]);
      expect(service.getRgb('#0f0')).toEqual([0, 255, 0]);
    });

    it('should parse a 6-digit hex color', () => {
      expect(service.getRgb('ff0000')).toEqual([255, 0, 0]);
      expect(service.getRgb('#00ff00')).toEqual([0, 255, 0]);
      expect(service.getRgb('0000ff')).toEqual([0, 0, 255]);
    });
  });

  describe('getContrastColor', () => {
    it('should return black for an invalid color', () => {
      expect(service.getContrastColor('nope')).toBe('black');
    });

    it('should return black for a light background', () => {
      expect(service.getContrastColor('ffffff')).toBe('black');
    });

    it('should return white for a dark background', () => {
      expect(service.getContrastColor('000000')).toBe('white');
    });
  });

  describe('hslToRgb', () => {
    it('should convert pure red (h=0)', () => {
      expect(service.hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should convert pure green (h=120)', () => {
      expect(service.hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should convert pure blue (h=240)', () => {
      expect(service.hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should convert black regardless of hue (l=0)', () => {
      expect(service.hslToRgb(180, 100, 0)).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should convert white regardless of hue (l=100)', () => {
      expect(service.hslToRgb(180, 100, 100)).toEqual({
        r: 255,
        g: 255,
        b: 255,
      });
    });
  });

  describe('rgbToString', () => {
    it('should render each component as a 2-digit hex value', () => {
      expect(service.rgbToString(255, 0, 128)).toBe('ff0080');
    });

    it('should zero-pad single-digit hex values', () => {
      expect(service.rgbToString(0, 1, 15)).toBe('00010f');
    });
  });

  describe('nextPaletteColor', () => {
    it('should return a 6-character hex string', () => {
      const color = service.nextPaletteColor(0, 5);
      expect(color).toMatch(/^[0-9a-f]{6}$/);
    });

    it('should return different colors for different indices', () => {
      const c1 = service.nextPaletteColor(0, 5);
      const c2 = service.nextPaletteColor(2, 5);
      expect(c1).not.toBe(c2);
    });

    it('should not throw with blueBoost disabled', () => {
      expect(() => service.nextPaletteColor(3, 5, false)).not.toThrow();
    });
  });
});
