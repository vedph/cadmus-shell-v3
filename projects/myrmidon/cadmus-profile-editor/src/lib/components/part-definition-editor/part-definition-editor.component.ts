import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, input, model, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

// material
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';

import { PartDefinition } from '@myrmidon/cadmus-core';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatCheckbox } from '@angular/material/checkbox';

/**
 * Editor for a single part definition.
 */
@Component({
  selector: 'cadmus-part-definition-editor',
  imports: [
    ReactiveFormsModule,
    MatCheckbox,
    MatError,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatOption,
    MatSelect,
    MatTooltip
  ],
  templateUrl: './part-definition-editor.component.html',
  styleUrl: './part-definition-editor.component.css',
})
export class PartDefinitionEditorComponent {
  /**
   * The part to edit.
   */
  public readonly definition = model<PartDefinition | undefined>();

  /**
   * The list of available part type IDs to choose from when editing the
   * part definition. If not set, the editor will show a free text input
   * for the part type ID.
   */
  public readonly availablePartTypeIds = input<string[]>([]);

  /**
   * True to hide the sort key field. This is used when the sort key is
   * defined at the level of the part definitions list, and not at the level
   * of each part definition.
   */
  public readonly hideSortKey = input<boolean>(false);

  /**
   * Emitted when user requests to cancel the edit and close this editor.
   */
  public readonly cancelEdit = output();

  public typeId: FormControl<string>;
  public roleId: FormControl<string | null>;
  public name: FormControl<string>;
  public required: FormControl<boolean>;
  public description: FormControl<string | null>;
  public colorKey: FormControl<string | null>;
  public groupKey: FormControl<string | null>;
  public sortKey: FormControl<string | null>;
  public settings: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    // form
    this.typeId = formBuilder.control<string>('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.roleId = formBuilder.control<string | null>(null);
    this.name = formBuilder.control<string>('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.required = formBuilder.control<boolean>(false, {
      nonNullable: true,
    });
    this.description = formBuilder.control<string | null>(null, {
      validators: Validators.maxLength(1000),
    });
    // color key has form RRGGBB, where RR, GG and BB are hex values
    // for red, green and blue
    this.colorKey = formBuilder.control<string | null>(null, {
      validators: Validators.pattern('^[0-9a-fA-F]{6}$'),
    });
    this.groupKey = formBuilder.control<string | null>(null);
    this.sortKey = formBuilder.control<string | null>(null);
    this.settings = formBuilder.control<string | null>(null);

    this.form = formBuilder.group({
      typeId: this.typeId,
      roleId: this.roleId,
      name: this.name,
      required: this.required,
      description: this.description,
      colorKey: this.colorKey,
      groupKey: this.groupKey,
      sortKey: this.sortKey,
      settings: this.settings,
    });

    // when model changes, update form
    effect(() => {
      const data = this.definition();
      this.updateForm(data);
    });
  }

  private updateForm(data: PartDefinition | undefined | null): void {
    if (!data) {
      this.form.reset();
    } else {
      this.typeId.setValue(data.typeId);
      this.roleId.setValue(data.roleId || null);
      this.name.setValue(data.name || '');
      this.required.setValue(data.isRequired || false);
      this.description.setValue(data.description || null);
      this.colorKey.setValue(data.colorKey || null);
      this.groupKey.setValue(data.groupKey || null);
      this.sortKey.setValue(data.sortKey || null);
      this.settings.setValue(data.settings || null);
      this.form.markAsPristine();
    }
  }

  private getData(): PartDefinition {
    return {
      typeId: this.typeId.value.trim(),
      roleId: this.roleId.value?.trim() || undefined,
      name: this.name.value.trim(),
      isRequired: this.required.value,
      description: this.description.value?.trim() || undefined,
      colorKey: this.colorKey.value?.trim() || undefined,
      groupKey: this.groupKey.value?.trim() || undefined,
      sortKey: this.sortKey.value?.trim() || undefined,
      settings: this.settings.value?.trim() || undefined,
    };
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Saves the current form data by updating the `data` model signal.
   * This method can be called manually (e.g., by a Save button) or
   * automatically (via auto-save).
   * @param pristine If true (default), the form is marked as pristine
   * after saving.
   * Set to false for auto-save if you want the form to remain dirty.
   */
  public save(pristine = true): void {
    if (this.form.invalid) {
      // show validation errors
      this.form.markAllAsTouched();
      return;
    }

    const data = this.getData();
    this.definition.set(data);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
