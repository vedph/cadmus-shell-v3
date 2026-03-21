import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

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

import { ColorToContrastPipe, StringToColorPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { FacetDefinition, PartDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings } from '@myrmidon/cadmus-api';

import { PartDefinitionEditorComponent } from '../part-definition-editor/part-definition-editor.component';

/**
 * Editor for a single facet definition and its part definitions.
 * This editor is used as a descendant of the facet definition list editor, and allows
 * to edit a single facet definition and its part definitions.
 */
@Component({
  selector: 'cadmus-facet-definition-editor',
  imports: [
    ReactiveFormsModule,
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
    StringToColorPipe,
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

  public id: FormControl<string>;
  public label: FormControl<string>;
  public colorKey: FormControl<string>;
  public description: FormControl<string>;
  public partDefinitions: FormControl<PartDefinition[]>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
  ) {
    // form
    this.id = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.label = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    // color key is a 6-digit hex string (without #)
    this.colorKey = formBuilder.control('', {
      validators: [Validators.pattern('^[0-9a-fA-F]{6}$')],
      nonNullable: true,
    });
    this.description = formBuilder.control('', {
      validators: [Validators.maxLength(1000)],
      nonNullable: true,
    });
    this.partDefinitions = formBuilder.control([], {
      validators: [Validators.required],
      nonNullable: true,
    });

    this.form = formBuilder.group({
      id: this.id,
      label: this.label,
      colorKey: this.colorKey,
      description: this.description,
      partDefinitions: this.partDefinitions,
    });

    // when model changes, update form
    effect(() => {
      const data = this.definition();
      this.updateForm(data);
    });
  }

  private updateForm(data: FacetDefinition | undefined | null): void {
    if (!data) {
      this.form.reset();
    } else {
      this.id.setValue(data.id);
      this.label.setValue(data.label);
      this.colorKey.setValue(data.colorKey);
      this.description.setValue(data.description);
      // sort by sortKey so that the displayed order always matches the key order
      const sorted = [...data.partDefinitions].sort((a, b) =>
        (a.sortKey ?? '').localeCompare(b.sortKey ?? ''),
      );
      this.partDefinitions.setValue(sorted);
      this.form.markAsPristine();
    }
  }

  private getDefinition(): FacetDefinition {
    return {
      id: this.id.value.trim(),
      label: this.label.value.trim(),
      colorKey: this.colorKey.value,
      description: this.description.value.trim(),
      partDefinitions: this.partDefinitions.value,
    };
  }

  //#region Part definitions
  private updatePartDefinitionSortKeys(): void {
    // assign an ordinal number as a 2-digits number to the sortKey
    // of each part definition, so that they are sorted in the order of the list
    const entries = this.partDefinitions.value.map((entry, index) => {
      return {
        ...entry,
        sortKey: (index + 1).toString().padStart(2, '0'),
      };
    });
    this.partDefinitions.setValue(entries);
  }

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
    const entries = [...this.partDefinitions.value];
    if (this.editedIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex(), 1, entry);
    }
    this.partDefinitions.setValue(entries);
    this.updatePartDefinitionSortKeys();
    this.closePartDefinition();
  }

  public deletePartDefinition(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete PartDefinition?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closePartDefinition();
          }
          const entries = [...this.partDefinitions.value];
          entries.splice(index, 1);
          this.partDefinitions.setValue(entries);
          this.updatePartDefinitionSortKeys();
        }
      });
  }

  public movePartDefinitionUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.partDefinitions.value[index];
    const entries = [...this.partDefinitions.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.partDefinitions.setValue(entries);
    // keep editedIndex in sync
    if (this.editedIndex() === index) {
      this.editedIndex.set(index - 1);
    } else if (this.editedIndex() === index - 1) {
      this.editedIndex.set(index);
    }
    this.updatePartDefinitionSortKeys();
  }

  public movePartDefinitionDown(index: number): void {
    if (index + 1 >= this.partDefinitions.value.length) {
      return;
    }
    const entry = this.partDefinitions.value[index];
    const entries = [...this.partDefinitions.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.partDefinitions.setValue(entries);
    // keep editedIndex in sync
    if (this.editedIndex() === index) {
      this.editedIndex.set(index + 1);
    } else if (this.editedIndex() === index + 1) {
      this.editedIndex.set(index);
    }
    this.updatePartDefinitionSortKeys();
  }
  //#endregion

  public onColorPick(value: string): void {
    // native color input returns "#rrggbb" — strip the leading "#"
    this.colorKey.setValue(value.slice(1));
    this.colorKey.markAsDirty();
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
    if (this.form.invalid) {
      // show validation errors
      this.form.markAllAsTouched();
      return;
    }

    const data = this.getDefinition();
    this.definition.set(data);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
