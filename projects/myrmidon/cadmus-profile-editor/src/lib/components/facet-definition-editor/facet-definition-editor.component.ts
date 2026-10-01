import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatError,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/form-field';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';

import { ColorToContrastPipe, EllipsisPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { FacetDefinition, PartDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings } from '@myrmidon/cadmus-api';

import { PartDefinitionEditorComponent } from '../part-definition-editor/part-definition-editor.component';

/**
 * Editor for a single facet definition and its part definitions.
 * This editor is used as a descendant of the facet definition list editor, and allows
 * to edit a single facet definition and its part definitions.
 */
/**
 * The editable shape behind the form.
 */
interface FacetDefinitionControls {
  id: string;
  label: string;
  colorKey: string;
  description: string;
  partDefinitions: PartDefinition[];
}

/**
 * A plain copy of a part definition, with its string keys only. The form
 * tags each item of its partDefinitions array with a hidden identity Symbol:
 * copying through Object.entries keeps such tags away from the objects we
 * receive and from those we emit (a spread would copy an enumerable Symbol).
 */
function copyPart(d: PartDefinition): PartDefinition {
  return Object.fromEntries(Object.entries(d)) as unknown as PartDefinition;
}

/**
 * Bound definition -> draft. Part definitions are sorted by sortKey, so that
 * the displayed order always matches the key order, and copied: the draft
 * must not adopt the caller's own objects.
 */
function toDraft(data: FacetDefinition | undefined): FacetDefinitionControls {
  return {
    id: data?.id || '',
    label: data?.label || '',
    colorKey: data?.colorKey || '',
    description: data?.description || '',
    partDefinitions: [...(data?.partDefinitions || [])]
      .sort((a, b) => (a.sortKey ?? '').localeCompare(b.sortKey ?? ''))
      .map(copyPart),
  };
}

/**
 * Draft -> definition. Normalizes values (trimming), so the definition
 * saved from a draft may differ from the draft itself.
 */
function toData(v: FacetDefinitionControls): FacetDefinition {
  return {
    id: v.id.trim(),
    label: v.label.trim(),
    colorKey: v.colorKey,
    description: v.description.trim(),
    partDefinitions: v.partDefinitions.map(copyPart),
  };
}

@Component({
  selector: 'cadmus-facet-definition-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckbox,
    MatError,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    MatSuffix,
    MatTab,
    MatTabGroup,
    MatTooltip,
    ColorToContrastPipe,
    EllipsisPipe,
    PartDefinitionEditorComponent,
  ],
  templateUrl: './facet-definition-editor.component.html',
  styleUrl: './facet-definition-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacetDefinitionEditorComponent {
  /**
   * The facet definition to edit.
   */
  public readonly definition = model<FacetDefinition | undefined>();

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
   * Emitted when user requests to cancel the edit and close this editor.
   */
  public readonly cancelEdit = output();

  // edited part definition
  public readonly edited = signal<PartDefinition | undefined>(undefined);
  public readonly editedIndex = signal<number>(-1);

  /**
   * The editable draft, derived from definition. On the echo of our own
   * save the live draft is kept, as toData() normalizes its values.
   */
  private readonly _draft = linkedSignal<
    FacetDefinition | undefined,
    FacetDefinitionControls
  >({
    source: () => this.definition(),
    computation: (data, previous) =>
      previous &&
      JSON.stringify(data) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(data),
  });

  public readonly form = form(this._draft, (path) => {
    required(path.id);
    maxLength(path.id, 100);
    required(path.label);
    maxLength(path.label, 100);
    // color key is a 6-digit hex string (without #)
    pattern(path.colorKey, /^[0-9a-fA-F]{6}$/);
    maxLength(path.description, 1000);
    // at least 1 part definition. Unlike reactive forms' required, the
    // signal forms required() rule accepts an empty array
    validate(path.partDefinitions, ({ value }) =>
      value().length ? null : { kind: 'required' },
    );
  });

  constructor(private _dialogService: DialogService) {
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

  /**
   * Set the part definitions, reassigning their sort keys as 2-digits
   * ordinal numbers, so that they are sorted in the order of the list.
   */
  private setPartDefinitions(definitions: PartDefinition[]): void {
    this.form.partDefinitions().value.set(
      definitions.map((entry, index) => ({
        ...entry,
        sortKey: (index + 1).toString().padStart(2, '0'),
      })),
    );
    this.form.partDefinitions().markAsDirty();
  }

  //#region Part definitions
  public addPartDefinition(): void {
    const definition: PartDefinition = {
      typeId: this.availablePartTypeIds().length
        ? this.availablePartTypeIds()[0]
        : '',
      name: 'new',
    };
    this.editedIndex.set(-1);
    this.edited.set(definition);
  }

  public editPartDefinition(entry: PartDefinition, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(entry));
  }

  public closePartDefinition(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public savePartDefinition(entry: PartDefinition): void {
    const entries = [...this.form.partDefinitions().value()];
    if (this.editedIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex(), 1, entry);
    }
    this.setPartDefinitions(entries);
    this.closePartDefinition();
  }

  public deletePartDefinition(index: number): void {
    const definition = this.form.partDefinitions().value()[index];
    this._dialogService
      .confirm('Confirmation', `Delete part "${definition.name}"?`)
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closePartDefinition();
          }
          const definitions = [...this.form.partDefinitions().value()];
          definitions.splice(index, 1);
          this.setPartDefinitions(definitions);
        }
      });
  }

  public movePartDefinitionUp(index: number): void {
    if (index < 1) {
      return;
    }
    const definitions = [...this.form.partDefinitions().value()];
    const definition = definitions[index];
    definitions.splice(index, 1);
    definitions.splice(index - 1, 0, definition);
    // keep editedIndex in sync
    if (this.editedIndex() === index) {
      this.editedIndex.set(index - 1);
    } else if (this.editedIndex() === index - 1) {
      this.editedIndex.set(index);
    }
    this.setPartDefinitions(definitions);
  }

  public movePartDefinitionDown(index: number): void {
    if (index + 1 >= this.form.partDefinitions().value().length) {
      return;
    }
    const definitions = [...this.form.partDefinitions().value()];
    const definition = definitions[index];
    definitions.splice(index, 1);
    definitions.splice(index + 1, 0, definition);
    // keep editedIndex in sync
    if (this.editedIndex() === index) {
      this.editedIndex.set(index + 1);
    } else if (this.editedIndex() === index + 1) {
      this.editedIndex.set(index);
    }
    this.setPartDefinitions(definitions);
  }
  //#endregion

  public onColorPick(value: string): void {
    // native color input returns "#rrggbb" — strip the leading "#"
    this.form.colorKey().value.set(value.slice(1));
    this.form.colorKey().markAsDirty();
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Saves the current form data by updating the `definition` model signal.
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
