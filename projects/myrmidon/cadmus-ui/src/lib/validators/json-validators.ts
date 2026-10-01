import { AbstractControl } from '@angular/forms';
import {
  PathKind,
  SchemaPath,
  SchemaPathRules,
  validate,
} from '@angular/forms/signals';

/**
 * Simple JSON validator for reactive forms.
 * @deprecated Use JsonSignalValidators with signal forms.
 */
export class JsonValidators {
  public static json(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    if (!control.value) {
      // we allow empty code
      return null;
    }
    try {
      JSON.parse(control.value);
    } catch (e) {
      return { json: true };
    }
    return null;
  }
}

/**
 * Simple JSON validator for signal forms.
 */
export class JsonSignalValidators {
  /**
   * Validate a string field as JSON code. An empty value is valid.
   * The error kind is `json`.
   *
   * @param path Path of the field to validate.
   */
  public static json<
    TValue extends string | null | undefined,
    TPathKind extends PathKind = PathKind.Root,
  >(path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>): void {
    validate(path, ({ value }) => {
      const code = value();
      if (!code) {
        return null;
      }
      try {
        JSON.parse(code);
      } catch {
        return { kind: 'json' };
      }
      return null;
    });
  }
}
