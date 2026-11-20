import {
  ChangeDetectionStrategy,
  computed,
  effect,
  Component,
  input,
  model,
  output,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

import { MatError } from '@angular/material/form-field';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import {
  AssertedCompositeId,
  AssertedCompositeIdComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { isImplicitSubmission, setFieldFromChild } from '@myrmidon/cadmus-ui';
import {
  mergeThesOrTaxoSettings,
  ThesOrTaxoPicker,
  ThesOrTaxoSettings,
} from '@myrmidon/cadmus-ui-thestaxo';

import {
  DEFAULT_RELATION_SETTINGS,
  RelatedEntity,
} from '../historical-events-part';

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
 * The relation is picked from a thesaurus (default), a taxonomy, or typed,
 * according to relationSettings.
 */
@Component({
  selector: 'cadmus-related-entity',
  templateUrl: './related-entity.component.html',
  styleUrls: ['./related-entity.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatError,
    AssertedCompositeIdComponent,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
    ThesOrTaxoPicker,
  ],
})
export class RelatedEntityComponent {
  public readonly entity = model<RelatedEntity>();

  /**
   * The relation entries to pick from, in thesaurus mode. When defined,
   * these are used even if relationSettings specify a thesaurus ID: so the
   * parent editor can pass entries already filtered by the event type.
   * When there are no entries, the relation is typed.
   */
  public readonly relationEntries = input<readonly ThesaurusEntry[]>();

  /**
   * The settings for the relation picker. Their defined properties
   * override the defaults (DEFAULT_RELATION_SETTINGS), i.e. picking the
   * relation from relationEntries, displayed as a list.
   */
  public readonly relationSettings = input<ThesOrTaxoSettings | undefined>();

  /**
   * Thesaurus asserted-id-scopes.
   */
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

  /**
   * The effective relation picker settings.
   */
  public readonly relationPickerSettings = computed<ThesOrTaxoSettings>(() =>
    mergeThesOrTaxoSettings(DEFAULT_RELATION_SETTINGS, this.relationSettings()),
  );

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
