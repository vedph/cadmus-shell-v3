import { PhysicalMeasurement } from '@myrmidon/cadmus-mat-physical-size';

import {
  PhysicalMeasurementsFormulaService,
  PhysicalMeasurementsSettings,
} from './physical-measurements-formula.service';

function measurement(name: string, value: number): PhysicalMeasurement {
  return { name, value, unit: 'mm' };
}

describe('PhysicalMeasurementsFormulaService', () => {
  let service: PhysicalMeasurementsFormulaService;

  const sizeSettings: PhysicalMeasurementsSettings = {
    formulas: {
      proporzione: {
        expression: 'height / width',
        minIntDigits: 1,
        maxDecDigits: 2,
      },
      taglia: {
        expression: 'height + width',
        intervals: [
          { max: 321, name: 'piccola' },
          { min: 322, max: 490, name: 'medio-piccola' },
          { min: 491, max: 670, name: 'medio-grande' },
          { min: 671, name: 'grande' },
        ],
      },
    },
  };

  beforeEach(() => {
    // this service has no dependencies, so it can be instantiated directly
    // without TestBed
    service = new PhysicalMeasurementsFormulaService();
  });

  it('should return no results when there are no settings', () => {
    expect(
      service.computeResults(undefined, [measurement('width', 210)]),
    ).toEqual([]);
  });

  it('should return no results when settings have no formulas', () => {
    expect(
      service.computeResults({ formulas: {} }, [measurement('width', 210)]),
    ).toEqual([]);
  });

  it('should skip a formula while any of its variables is missing', () => {
    const results = service.computeResults(sizeSettings, [
      measurement('width', 210),
    ]);
    expect(results).toEqual([]);
  });

  it('should compute all the formulas once all their variables are available', () => {
    const results = service.computeResults(sizeSettings, [
      measurement('width', 210),
      measurement('height', 297),
    ]);

    expect(results).toHaveLength(2);
    // alphabetical order by key
    expect(results[0].key).toBe('proporzione');
    expect(results[0].value).toBeCloseTo(297 / 210);
    expect(results[0].formatted).toBe('1.41');
    expect(results[0].intervalName).toBeUndefined();
    expect(results[0].ambiguous).toBe(false);

    expect(results[1].key).toBe('taglia');
    expect(results[1].value).toBe(507);
    expect(results[1].formatted).toBe('507');
    expect(results[1].intervalName).toBe('medio-grande');
    expect(results[1].ambiguous).toBe(false);
  });

  it('should sort results alphabetically by key regardless of settings order', () => {
    const results = service.computeResults(
      {
        formulas: {
          zeta: { expression: '$a' },
          alfa: { expression: '$a' },
          medio: { expression: '$a' },
        },
      },
      [measurement('a', 1)],
    );
    expect(results.map((r) => r.key)).toEqual(['alfa', 'medio', 'zeta']);
  });

  it.each([
    [100, 200, 'piccola'], // sum 300 <= 321
    [200, 200, 'medio-piccola'], // sum 400
    [300, 300, 'medio-grande'], // sum 600
    [400, 400, 'grande'], // sum 800
  ])(
    'should associate the interval matching the result for width=%i height=%i',
    (width, height, expected) => {
      const results = service.computeResults(sizeSettings, [
        measurement('width', width),
        measurement('height', height),
      ]);
      const taglia = results.find((r) => r.key === 'taglia');
      expect(taglia?.intervalName).toBe(expected);
    },
  );

  it('should accept variables both prefixed with $ and bare', () => {
    const results = service.computeResults(
      {
        formulas: {
          withDollar: { expression: '$a + $b' },
          withoutDollar: { expression: 'a + b' },
        },
      },
      [measurement('a', 2), measurement('b', 3)],
    );
    expect(results.find((r) => r.key === 'withDollar')?.value).toBe(5);
    expect(results.find((r) => r.key === 'withoutDollar')?.value).toBe(5);
  });

  it('should format results using minIntDigits and maxDecDigits', () => {
    const results = service.computeResults(
      {
        formulas: {
          padded: { expression: '$a / $b', minIntDigits: 2, maxDecDigits: 2 },
        },
      },
      [measurement('a', 1), measurement('b', 2)],
    );
    const result = results[0];
    expect(result.value).toBeCloseTo(0.5);
    // maxDecDigits caps decimals (no padding); minIntDigits pads the
    // integer part with leading zeroes
    expect(result.formatted).toBe('00.5');
  });

  it('should evaluate brackets and precedence correctly', () => {
    const results = service.computeResults(
      {
        formulas: {
          avg: { expression: '($a + $b) / 2' },
        },
      },
      [measurement('a', 10), measurement('b', 20)],
    );
    expect(results[0].value).toBe(15);
  });

  it('should use only the first value of a repeated measurement name, flagging the result as ambiguous', () => {
    const results = service.computeResults(
      {
        formulas: {
          doubled: { expression: '$width * 2' },
        },
      },
      [measurement('width', 10), measurement('width', 999)],
    );
    expect(results[0].value).toBe(20);
    expect(results[0].ambiguous).toBe(true);
  });

  it('should not flag a formula as ambiguous when it does not use a duplicated name', () => {
    const results = service.computeResults(
      {
        formulas: {
          single: { expression: '$height * 2' },
        },
      },
      [
        measurement('width', 10),
        measurement('width', 999),
        measurement('height', 5),
      ],
    );
    expect(results[0].ambiguous).toBe(false);
  });

  it('should ignore a formula whose expression cannot be evaluated, while still computing the others', () => {
    const results = service.computeResults(
      {
        formulas: {
          broken: { expression: '$width / )' },
          ok: { expression: '$width * 2' },
        },
      },
      [measurement('width', 10)],
    );
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('ok');
  });

  it('should ignore measurements with no name', () => {
    const results = service.computeResults(
      {
        formulas: { doubled: { expression: '$width * 2' } },
      },
      [{ value: 1, unit: 'mm' } as PhysicalMeasurement, measurement('width', 10)],
    );
    expect(results[0].value).toBe(20);
  });
});
