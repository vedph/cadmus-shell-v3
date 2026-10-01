import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  pattern,
  required,
} from '@angular/forms/signals';

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
 * The editable shape behind the form. Text fields use '' as their empty
 * value, as they are bound to native inputs.
 */
interface PartDefinitionControls {
  typeId: string;
  roleId: string;
  name: string;
  required: boolean;
  description: string;
  colorKey: string;
  groupKey: string;
  sortKey: string;
}

function toDraft(data: PartDefinition | undefined): PartDefinitionControls {
  return {
    typeId: data?.typeId || '',
    roleId: data?.roleId || '',
    name: data?.name || '',
    required: data?.isRequired || false,
    description: data?.description || '',
    colorKey: data?.colorKey || '',
    groupKey: data?.groupKey || '',
    sortKey: data?.sortKey || '',
  };
}

/**
 * Draft -> definition. Normalizes values (trimming, '' to undefined), so
 * the definition saved from a draft may differ from the draft itself.
 */
function toData(v: PartDefinitionControls): PartDefinition {
  return {
    typeId: v.typeId.trim(),
    roleId: v.roleId.trim() || undefined,
    name: v.name.trim(),
    isRequired: v.required,
    description: v.description.trim() || undefined,
    colorKey: v.colorKey.trim() || undefined,
    groupKey: v.groupKey.trim() || undefined,
    sortKey: v.sortKey.trim() || undefined,
  };
}

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
    FormField,
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
   * True to hide the sort key field. This is used when the sort key is
   * defined at the level of the part definitions list, and not at the level
   * of each part definition.
   */
  public readonly hideSortKey = input<boolean>(false);

  /**
   * Emitted when user requests to cancel the edit and close this editor.
   */
  public readonly cancelEdit = output();

  /**
   * The editable draft, derived from definition. On the echo of our own
   * save the live draft is kept, as toData() normalizes its values.
   */
  private readonly _draft = linkedSignal<
    PartDefinition | undefined,
    PartDefinitionControls
  >({
    source: () => this.definition(),
    computation: (data, previous) =>
      previous &&
      JSON.stringify(data) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(data),
  });

  public readonly form = form(this._draft, (path) => {
    required(path.typeId);
    maxLength(path.typeId, 100);
    required(path.name);
    maxLength(path.name, 100);
    maxLength(path.description, 1000);
    // color key has form RRGGBB, where RR, GG and BB are hex values
    // for red, green and blue
    pattern(path.colorKey, /^[0-9a-fA-F]{6}$/);
  });

  /**
   * True if the part type is a base text part, i.e. if the facet model settings
   * for the current part type ID has the baseText property set to true. In this
   * case, the role ID select is shown with the list of available fragment IDs
   * from the facet model settings; otherwise, a free text input is shown for
   * the role ID.
   */
  public readonly isBaseTextPart = computed<boolean>(() => {
    const settings = this.facetModelSettings();
    return settings?.parts?.[this.form.typeId().value()]?.baseText === true;
  });

  constructor() {
    // once the draft mirrors the bound definition again, clear interaction
    // state
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (
          JSON.stringify(draft) === JSON.stringify(toDraft(this.definition()))
        ) {
          this.form().reset();
        }
      });
    });
  }

  public onColorPick(value: string): void {
    // native color input returns "#rrggbb" — strip the leading "#"
    this.form.colorKey().value.set(value.slice(1));
    this.form.colorKey().markAsDirty();
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
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    this.definition.set(toData(this._draft()));

    if (pristine) {
      this.form().reset();
    }
  }
}
