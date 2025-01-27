import { Component, effect, input, model, output } from '@angular/core';
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
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import {
  AssertedCompositeId,
  AssertedCompositeIdComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { RelatedEntity } from '../historical-events-part';

/**
 * Related entity component to edit the entity related to a historical event.
 */
@Component({
  selector: 'cadmus-related-entity',
  templateUrl: './related-entity.component.html',
  styleUrls: ['./related-entity.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatError,
    MatInput,
    AssertedCompositeIdComponent,
    MatIconButton,
    MatIcon,
    MatTooltip,
  ],
})
export class RelatedEntityComponent {
  public readonly entity = model<RelatedEntity>();

  // relation entries
  public readonly relationEntries = input<ThesaurusEntry[]>();
  public readonly idScopeEntries = input<ThesaurusEntry[]>();
  /**
   * Thesaurus asserted-id-tags.
   */
  public readonly idTagEntries = input<ThesaurusEntry[]>();
  /**
   * Thesaurus assertion-tags.
   */
  public readonly assTagEntries = input<ThesaurusEntry[]>();
  /**
   * Thesaurus doc-reference-tags.
   */
  public readonly refTagEntries = input<ThesaurusEntry[]>();
  /**
   * Thesaurus doc-reference-types.
   */
  public readonly refTypeEntries = input<ThesaurusEntry[]>();

  // settings for lookup
  // by-type: true/false
  public readonly pinByTypeMode = input<boolean>();
  // switch-mode: true/false
  public readonly canSwitchMode = input<boolean>();
  // edit-target: true/false
  public readonly canEditTarget = input<boolean>();

  public readonly editorClose = output();

  // form
  public relation: FormControl<string | null>;
  public id: FormControl<AssertedCompositeId | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.relation = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.id = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.form = formBuilder.group({
      relation: this.relation,
      id: this.id,
    });

    effect(() => {
      this.updateForm(this.entity());
    });
  }

  private updateForm(entity: RelatedEntity | undefined): void {
    if (!entity) {
      this.form.reset();
      return;
    }
    this.relation.setValue(entity.relation);
    this.id.setValue(entity.id);
    this.form.markAsPristine();
  }

  private getEntity(): RelatedEntity {
    return {
      relation: this.relation.value?.trim()!,
      id: this.id.value!,
    };
  }

  public onIdChange(id: AssertedCompositeId): void {
    this.id.setValue(id);
    this.id.updateValueAndValidity();
    this.id.markAsDirty();
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.entity.set(this.getEntity());
  }
}
