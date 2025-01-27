import { Component, effect, model, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { FlagDefinition } from '@myrmidon/cadmus-core';

/**
 * Flag definition editor.
 */
@Component({
  selector: 'cadmus-flag-definition-editor',
  templateUrl: './flag-definition-editor.component.html',
  styleUrls: ['./flag-definition-editor.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatError,
    MatInput,
    MatCheckbox,
    MatIconButton,
    MatTooltip,
    MatIcon,
  ],
})
export class FlagDefinitionEditorComponent {
  public readonly flag = model<FlagDefinition>();

  public readonly editorClose = output();

  public id: FormControl<number>;
  public label: FormControl<string | null>;
  public colorKey: FormControl<string | null>;
  public description: FormControl<string | null>;
  public isAdmin: FormControl<boolean>;
  public form: FormGroup;
  public flagNumbers: number[];

  constructor(formBuilder: FormBuilder) {
    // https://2ality.com/2014/05/es6-array-methods.html
    this.flagNumbers = Array.from({ length: 32 }, (_, i) => i + 1);
    // form
    this.id = formBuilder.control(1, {
      validators: [Validators.required, Validators.min(1), Validators.max(32)],
      nonNullable: true,
    });
    this.label = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
    ]);
    this.colorKey = formBuilder.control(null, Validators.required);
    this.description = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(100),
    ]);
    this.isAdmin = formBuilder.control(false, { nonNullable: true });
    this.form = formBuilder.group({
      id: this.id,
      label: this.label,
      colorKey: this.colorKey,
      description: this.description,
      isAdmin: this.isAdmin,
    });

    effect(() => {
      this.updateForm(this.flag());
    });
  }

  private getBit(value: number): number {
    let test = 1;
    for (let i = 0; i < 32; i++) {
      if ((value & test) !== 0) {
        return i;
      }
      test <<= 1;
    }
    return -1;
  }

  private updateForm(definition: FlagDefinition | undefined): void {
    if (!definition) {
      this.form.reset();
      return;
    }

    this.id.setValue(this.getBit(definition.id) + 1);
    this.label.setValue(definition.label);
    this.colorKey.setValue('#' + definition.colorKey || null);
    this.description.setValue(definition.description);
    this.isAdmin.setValue(definition.isAdmin === true);

    this.form.markAsPristine();
  }

  private getFlag(): FlagDefinition {
    return {
      id: 1 << (this.id.value - 1),
      label: this.label.value?.trim() || '',
      colorKey: this.colorKey.value?.substring(1) || '',
      description: this.description.value?.trim() || '',
      isAdmin: this.isAdmin.value === true,
    };
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.flag.set(this.getFlag());
  }
}
