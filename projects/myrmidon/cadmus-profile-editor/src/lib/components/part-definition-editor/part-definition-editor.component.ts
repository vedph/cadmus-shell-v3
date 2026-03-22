import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  effect,
  input,
  model,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

// material
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatError,
  MatFormField,
  MatInput,
  MatLabel,
} from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';

import { PartDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings } from '@myrmidon/cadmus-api';
import { MatSuffix } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatCheckbox } from '@angular/material/checkbox';

/**
 * Editor for a single part definition. This allows users to edit the part definition
 * properties: type ID, selected from a list if facet model settings are provided,
 * or entered freely if not (but this should not happen, as at least part definitions
 * should be present and these provide fallback model settings); role ID, selected
 * from a closed list when the part type is a base text part, or entered freely otherwise;
 * name; color; group; sort key; description; and whether the part is required or not
 * in its facet.
 * NOTE: part definition settings are not edited here. They are defined server-side
 * and will later be obsoleted.
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
    MatSuffix,
    MatTooltip,
  ],
  templateUrl: './part-definition-editor.component.html',
  styleUrl: './part-definition-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartDefinitionEditorComponent {
  /**
   * The part to edit.
   */
  public readonly definition = model<PartDefinition | undefined>();

  /**
   * The facet models settings, used to get the list of available part type IDs,
   * and whether they are base text parts; in this case, the same settings also
   * provide the list of their available role IDs from the fragments property.
   */
  public readonly facetModelSettings = input<FacetModelSettings | undefined>(
    undefined,
  );

  /**
   * The list of available part type IDs, taken from the facet model settings.
   * If the facet model settings are not provided, or do not contain any part
   * definition, this list is empty and the type ID must be entered freely.
   */
  public readonly availablePartTypeIds = computed(() => {
    const settings = this.facetModelSettings();
    return settings?.parts ? Object.keys(settings.parts) : [];
  });

  /**
   * The list of available fragment IDs, taken from the facet model settings.
   * This is used to populate the role ID select when the part type is a base
   * text part (i.e. its baseText property in settings is true).
   */
  public readonly availableFragmentIds = computed(() => {
    const settings = this.facetModelSettings();
    return settings?.fragments ? Object.keys(settings.fragments) : [];
  });

  /**
   * True if the part type is a base text part, i.e. if the facet model settings
   * for the current part type ID has the baseText property set to true. In this
   * case, the role ID select is shown with the list of available fragment IDs
   * from the facet model settings; otherwise, a free text input is shown for
   * the role ID.
   * Initialized in the constructor so it can reactively track typeId changes
   * via a toSignal-wrapped valueChanges observable.
   */
  public readonly isBaseTextPart: Signal<boolean>;

  /** Signal that mirrors typeId.valueChanges so computed() can track it. */
  private readonly _typeIdValue: Signal<string>;

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
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    // form
    this.typeId = formBuilder.control<string>('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    // mirror typeId value as a signal so computed() tracks it reactively
    this._typeIdValue = toSignal(this.typeId.valueChanges, {
      initialValue: this.typeId.value,
    });
    this.isBaseTextPart = computed(() => {
      const settings = this.facetModelSettings();
      return settings?.parts?.[this._typeIdValue()]?.baseText === true;
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

    this.form = formBuilder.group({
      typeId: this.typeId,
      roleId: this.roleId,
      name: this.name,
      required: this.required,
      description: this.description,
      colorKey: this.colorKey,
      groupKey: this.groupKey,
      sortKey: this.sortKey,
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
    };
  }

  public onColorPick(value: string): void {
    // native color input returns "#rrggbb" — strip the leading "#"
    this.colorKey.setValue(value.slice(1));
    this.colorKey.markAsDirty();
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
