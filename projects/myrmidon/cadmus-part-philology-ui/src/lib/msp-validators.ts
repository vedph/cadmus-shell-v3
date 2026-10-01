// OBSOLETE: use edit-operation.component.ts instead
import {
  PathKind,
  SchemaPath,
  SchemaPathRules,
  validate,
} from '@angular/forms/signals';
import { MspOperation } from './msp-operation';

export class MspValidators {
  /**
   * Validate a string field as an MSP operation. An empty value is valid.
   * The error kind is `msp`.
   *
   * @param path Path of the field to validate.
   */
  public static msp<
    TValue extends string | null | undefined,
    TPathKind extends PathKind = PathKind.Root,
  >(path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>): void {
    validate(path, ({ value }) => {
      const text = value();
      if (text) {
        const op = MspOperation.parse(text);
        if (!op || op.validate()) {
          return { kind: 'msp' };
        }
      }
      return null;
    });
  }
}
