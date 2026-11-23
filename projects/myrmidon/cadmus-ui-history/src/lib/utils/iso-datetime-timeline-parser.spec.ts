import {
  DAY_MS,
  formatLocalDateTime,
  IsoDateTimeTimelineParser,
} from './iso-datetime-timeline-parser';

describe('IsoDateTimeTimelineParser', () => {
  const parser = new IsoDateTimeTimelineParser();

  it('should reject invalid text', () => {
    expect(parser.parse('')).toBeNull();
    expect(parser.parse('abc')).toBeNull();
    expect(parser.parse('2026-13')).toBeNull();
    expect(parser.parse('2026-02-30')).toBeNull();
    expect(parser.parse('2026-02-10T24:00')).toBeNull();
    expect(parser.parse('2026-02-10T10:60')).toBeNull();
  });

  it('should parse a year as the whole year', () => {
    const r = parser.parse('2026')!;
    expect(r.start.value).toBe(new Date(2026, 0, 1).getTime());
    expect(r.end.value).toBe(new Date(2027, 0, 1).getTime() - 1);
  });

  it('should parse a month as the whole month', () => {
    const r = parser.parse('2026-02')!;
    expect(r.start.value).toBe(new Date(2026, 1, 1).getTime());
    expect(r.end.value).toBe(new Date(2026, 2, 1).getTime() - 1);
  });

  it('should parse a day as the whole day', () => {
    const r = parser.parse('2026-11-23')!;
    expect(r.start.value).toBe(new Date(2026, 10, 23).getTime());
    expect(r.end.value).toBe(new Date(2026, 10, 24).getTime() - 1);
  });

  it('should parse a local datetime with T or space', () => {
    const t = parser.parse('2026-11-23T10:05')!;
    const s = parser.parse('2026-11-23 10:05')!;
    expect(t.start.value).toBe(new Date(2026, 10, 23, 10, 5).getTime());
    expect(t.end.value).toBe(new Date(2026, 10, 23, 10, 6).getTime() - 1);
    expect(s).toEqual(t);
  });

  it('should parse seconds as the whole second', () => {
    const r = parser.parse('2026-11-23T10:05:07')!;
    expect(r.start.value).toBe(new Date(2026, 10, 23, 10, 5, 7).getTime());
    expect(r.end.value - r.start.value).toBe(999);
  });

  it('should format according to the step, so that the result is parseable', () => {
    const value = new Date(2026, 10, 23, 10, 5, 7).getTime();
    expect(parser.format(value, DAY_MS)).toBe('2026-11-23');
    expect(parser.format(value)).toBe('2026-11-23 10:05');
    expect(parser.format(value, 1000)).toBe('2026-11-23 10:05:07');
    for (const step of [undefined, 1000, DAY_MS]) {
      expect(parser.parse(parser.format(value, step))).not.toBeNull();
    }
  });

  it('formatLocalDateTime should pad values', () => {
    expect(formatLocalDateTime(new Date(2026, 0, 2, 3, 4, 5), true)).toBe(
      '2026-01-02 03:04:05',
    );
  });
});
