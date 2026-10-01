import {
  AbstractControl,
  ValidatorFn,
  ValidationErrors,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';
import {
  PathKind,
  SchemaPath,
  SchemaPathRules,
  validate,
} from '@angular/forms/signals';

// https://www.tektutorialshub.com/angular/custom-validator-with-parameters-in-angular/

/**
 * General-purpose custom validators for reactive forms.
 * @deprecated Use CustomSignalValidators with signal forms.
 */
// https://github.com/angular/angular/issues/18867#issuecomment-357484102
// @dynamic
export class CustomValidators {
  /**
   * Validates a FormGroup or FormArray control checking if the count of their
   * controls with a true value is equal to or greater than the specified
   * number.
   *
   * @param min The minimum number of checked controls.
   */
  public static minChecked(min = 1): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      // https://trungk18.com/experience/angular-form-array-validate-at-least-one-checkbox-was-selected/
      let checked = 0;

      const group = (control as FormGroup) || (control as UntypedFormGroup);
      Object.keys(group.controls).forEach((key) => {
        const ctl = group.controls[key];
        if (ctl.value === true) {
          checked++;
        }
      });

      if (checked < min) {
        return {
          minChecked: true,
        };
      }
      return null;
    };
  }
}

/**
 * General-purpose custom validators for signal forms.
 */
export class CustomSignalValidators {
  /**
   * Validate an array of booleans, or an object whose properties are
   * booleans, checking if the count of its true values is equal to or
   * greater than the specified number. The error kind is `minChecked`.
   *
   * @param path Path of the field to validate.
   * @param min The minimum number of checked values.
   */
  public static minChecked<
    TValue extends boolean[] | Record<string, boolean> | null | undefined,
    TPathKind extends PathKind = PathKind.Root,
  >(
    path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
    min = 1,
  ): void {
    validate(path, ({ value }) => {
      const v = value();
      const values: boolean[] = !v
        ? []
        : Array.isArray(v)
          ? v
          : Object.values(v);
      return values.filter((b) => b === true).length < min
        ? { kind: 'minChecked' }
        : null;
    });
  }
}
