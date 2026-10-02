import {
  ChangeDetectionStrategy,
  effect,
  Component,
  input,
  model,
  output,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

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
import { isImplicitSubmission, setFieldFromChild } from '../signal-form-utils';

interface RelatedEntityControls {
  relation: string;
  id: AssertedCompositeId | null;
}

function toDraft(entity?: RelatedEntity): RelatedEntityControls {
  return {
    relation: entity?.relation || '',
    id: entity?.id || null,
  };
}

/**
 * Related entity component to edit the entity related to a historical event.
 */
@Component({
  selector: 'cadmus-related-entity',
  templateUrl: './related-entity.component.html',
  styleUrls: ['./related-entity.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
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
  /**
   * Thesaurus asserted-id-features.
   */
  public readonly idFeatureEntries = input<ThesaurusEntry[]>();

  public readonly editorClose = output();

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.entity()));
  public readonly form = form(this._draft, (p) => {
    required(p.relation);
    maxLength(p.relation, 500);
    required(p.id);
  });

  constructor() {
    // a new entity was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.entity();
      untracked(() => this.form().reset());
    });
  }

  private getEntity(): RelatedEntity {
    const draft = this._draft();
    return {
      relation: draft.relation.trim(),
      id: draft.id!,
    };
  }

  public onIdChange(id: AssertedCompositeId): void {
    setFieldFromChild(this.form.id, id);
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  /**
   * Handle Enter in this editor: in a text input, save as the save button
   * would, when enabled. This replaces the implicit submission of the form
   * this editor used to render.
   * @param event The keydown event.
   */
  public onEnterKey(event: Event): void {
    if (!isImplicitSubmission(event)) {
      return;
    }
    event.preventDefault();
    this.save();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.entity.set(this.getEntity());
  }
}
