import { Injectable } from '@angular/core';

import { PhysicalMeasurement } from '@myrmidon/cadmus-mat-physical-size';

/**
 * A named interval for a physical measurements formula result. Any result
 * value falling within `min` (inclusive, when specified) and `max`
 * (inclusive, when specified) is associated with `name` when displayed.
 */
export interface FormulaInterval {
  min?: number;
  max?: number;
  name: string;
}

/**
 * Configuration for a physical measurements formula.
 */
export interface Formula {
  /**
   * The formula expression. This uses variable names prefixed by $ (e.g. $width)
   * and basic arithmetic operations with brackets for precedence (e.g.
   * "($width + $height) / 2"). Variables are filled from the measurements
   * added to the part: if a measurement named "width" and another named
   * "height" exist, they can be used in the formula as $width and $height.
   * All the variables used by a formula must be present among the
   * measurements for the formula to be evaluated.
   */
  expression: string;
  /**
   * The minimum number of integer digits to display for the formula result.
   */
  minIntDigits?: number;
  /**
   * The maximum number of decimal digits to display for the formula result.
   */
  maxDecDigits?: number;
  /**
   * The named intervals for the formula result. Any result value falling
   * within an interval is displayed alongside that interval's name.
   */
  intervals?: FormulaInterval[];
}

/**
 * Settings for the physical measurements formulas, keyed under the
 * PhysicalMeasurementsPart's type ID (and optionally role ID).
 */
export interface PhysicalMeasurementsSettings {
  formulas: Record<string, Formula>;
}

/**
 * A computed formula result, ready for display.
 */
export interface FormulaResult {
  /**
   * The formula's key in settings, used as its display label.
   */
  key: string;
  /**
   * The raw computed numeric value.
   */
  value: number;
  /**
   * The formatted value, according to the formula's minIntDigits/maxDecDigits.
   */
  formatted: string;
  /**
   * The name of the interval the value falls into, if any.
   */
  intervalName?: string;
  /**
   * True if any of the variables used by this formula refers to a
   * measurement name shared by more than one measurement (in which case
   * only the first one's value was used).
   */
  ambiguous: boolean;
}

/**
 * Evaluates physical measurements formulas defined in settings against a set
 * of measurements, computing display-ready results.
 *
 * Formulas are simple arithmetic expressions (+, -, *, / and brackets for
 * precedence) whose variables refer to measurement names, optionally
 * prefixed by $ (e.g. "$width" or just "width"). A formula is evaluated only
 * when all the variables it references are present among the measurements.
 * If a measurement name occurs more than once, the first value found is
 * used, and any formula using that name is flagged as ambiguous.
 *
 * This service is stateless and has no dependencies, so it can be reused
 * wherever the same formulas-over-measurements logic is needed, beyond the
 * PhysicalMeasurementsPart editor.
 */
@Injectable({ providedIn: 'root' })
export class PhysicalMeasurementsFormulaService {
  /**
   * Compute the results of all the formulas in settings which can be fully
   * resolved from the given measurements, sorted alphabetically by their
   * key. Formulas with unresolved variables are silently skipped, as are
   * formulas whose expression cannot be evaluated (e.g. malformed text).
   *
   * @param settings The formulas settings, or undefined if none apply.
   * @param measurements The current measurements.
   */
  public computeResults(
    settings: PhysicalMeasurementsSettings | undefined,
    measurements: PhysicalMeasurement[],
  ): FormulaResult[] {
    if (!settings?.formulas) {
      return [];
    }
    const { values, ambiguousNames } =
      this.buildMeasurementValueMap(measurements);
    const results: FormulaResult[] = [];

    for (const key of Object.keys(settings.formulas)) {
      const formula = settings.formulas[key];
      const variables = this.extractVariables(formula.expression);
      if (variables.length === 0 || !variables.every((v) => values.has(v))) {
        continue;
      }

      let value: number;
      try {
        value = this.evaluateExpression(
          this.substituteVariables(formula.expression, values),
        );
      } catch (error) {
        console.warn(`Failed to evaluate formula "${key}"`, error);
        continue;
      }
      if (!isFinite(value)) {
        continue;
      }

      const interval = formula.intervals?.find(
        (i) =>
          (i.min === undefined || value >= i.min) &&
          (i.max === undefined || value <= i.max),
      );

      results.push({
        key,
        value,
        formatted: this.formatValue(value, formula),
        intervalName: interval?.name,
        ambiguous: variables.some((v) => ambiguousNames.has(v)),
      });
    }

    return results.sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Extract the unique variable names (without the leading $, when present)
   * referenced by a formula's text.
   */
  private extractVariables(text: string): string[] {
    const names = new Set<string>();
    const re = /\$?([A-Za-z_]\w*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      names.add(m[1]);
    }
    return Array.from(names);
  }

  /**
   * Replace all the variables referenced by a formula's text with their
   * numeric values, so that the resulting string only contains numbers,
   * basic arithmetic operators (+, -, *, /) and brackets.
   */
  private substituteVariables(
    text: string,
    values: Map<string, number>,
  ): string {
    return text.replace(/\$?([A-Za-z_]\w*)/g, (_match, name: string) => {
      const value = values.get(name);
      if (value === undefined) {
        throw new Error(`Unknown variable "${name}" in formula "${text}"`);
      }
      return `(${value})`;
    });
  }

  /**
   * Evaluate a simple arithmetic expression made of numbers, the basic
   * operators (+, -, *, /) and brackets for precedence. This purposely
   * avoids any use of eval/Function to keep evaluation safe, as formulas
   * may come from user-editable backend settings.
   */
  private evaluateExpression(expr: string): number {
    let pos = 0;

    const peek = (): string => expr[pos];
    const skipSpaces = (): void => {
      while (pos < expr.length && /\s/.test(expr[pos])) pos++;
    };

    const parseNumber = (): number => {
      skipSpaces();
      const start = pos;
      while (pos < expr.length && /[0-9.]/.test(expr[pos])) pos++;
      if (pos === start) {
        throw new Error(
          `Expected number at position ${pos} in expression "${expr}"`,
        );
      }
      return parseFloat(expr.slice(start, pos));
    };

    const parseFactor = (): number => {
      skipSpaces();
      if (peek() === '(') {
        pos++;
        const value = parseExpr();
        skipSpaces();
        if (peek() !== ')') {
          throw new Error(
            `Expected ")" at position ${pos} in expression "${expr}"`,
          );
        }
        pos++;
        return value;
      }
      if (peek() === '-') {
        pos++;
        return -parseFactor();
      }
      if (peek() === '+') {
        pos++;
        return parseFactor();
      }
      return parseNumber();
    };

    const parseTerm = (): number => {
      let value = parseFactor();
      skipSpaces();
      while (peek() === '*' || peek() === '/') {
        const op = peek();
        pos++;
        const rhs = parseFactor();
        value = op === '*' ? value * rhs : value / rhs;
        skipSpaces();
      }
      return value;
    };

    const parseExpr = (): number => {
      let value = parseTerm();
      skipSpaces();
      while (peek() === '+' || peek() === '-') {
        const op = peek();
        pos++;
        const rhs = parseTerm();
        value = op === '+' ? value + rhs : value - rhs;
        skipSpaces();
      }
      return value;
    };

    const result = parseExpr();
    skipSpaces();
    if (pos !== expr.length) {
      throw new Error(
        `Unexpected character at position ${pos} in expression "${expr}"`,
      );
    }
    return result;
  }

  /**
   * Format a formula's computed value according to its minIntDigits
   * (padding the integer part with leading zeroes) and maxDecDigits
   * (rounding the decimal part) settings.
   */
  private formatValue(value: number, formula: Formula): string {
    let rounded = value;
    if (formula.maxDecDigits !== undefined && formula.maxDecDigits >= 0) {
      const factor = Math.pow(10, formula.maxDecDigits);
      rounded = Math.round(value * factor) / factor;
    }
    const negative = rounded < 0;
    const [intPart, decPart] = Math.abs(rounded).toString().split('.');
    const paddedIntPart =
      formula.minIntDigits && formula.minIntDigits > intPart.length
        ? intPart.padStart(formula.minIntDigits, '0')
        : intPart;
    return (
      (negative ? '-' : '') + paddedIntPart + (decPart ? '.' + decPart : '')
    );
  }

  /**
   * Build a lookup map of measurement name to its (first) value, plus the
   * set of names shared by more than one measurement.
   */
  private buildMeasurementValueMap(measurements: PhysicalMeasurement[]): {
    values: Map<string, number>;
    ambiguousNames: Set<string>;
  } {
    const values = new Map<string, number>();
    const seen = new Set<string>();
    const ambiguousNames = new Set<string>();
    for (const m of measurements || []) {
      if (!m?.name) {
        continue;
      }
      if (seen.has(m.name)) {
        ambiguousNames.add(m.name);
        continue;
      }
      seen.add(m.name);
      values.set(m.name, m.value);
    }
    return { values, ambiguousNames };
  }
}
