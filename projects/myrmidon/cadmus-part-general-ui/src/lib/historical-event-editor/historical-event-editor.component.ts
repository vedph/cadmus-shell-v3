import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
} from '@angular/material/expansion';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { FlatLookupPipe } from '@myrmidon/ngx-tools';
import {
  AssertedChronotope,
  AssertedChronotopeSetComponent,
} from '@myrmidon/cadmus-refs-asserted-chronotope';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  renderLabelFromLastColon,
  ThesaurusTreeComponent,
} from '@myrmidon/cadmus-thesaurus-store';

import { HistoricalEvent, RelatedEntity } from '../historical-events-part';
import {
  copyFormValue,
  isImplicitSubmission,
  setFieldFromChild,
} from '@myrmidon/cadmus-ui';
import { RelatedEntityComponent } from '../related-entity/related-entity.component';

const RELATION_SEP = ':';

interface HistoricalEventControls {
  eid: string;
  type: string;
  tag: string;
  description: string;
  note: string;
  relatedEntities: RelatedEntity[];
  chronotopes: AssertedChronotope[];
  hasAssertion: boolean;
  assertion: Assertion | null;
}

function toDraft(event?: HistoricalEvent): HistoricalEventControls {
  return {
    eid: event?.eid || '',
    type: event?.type || '',
    tag: event?.tag || '',
    description: event?.description || '',
    note: event?.note || '',
    relatedEntities: copyFormValue(event?.relatedEntities || []),
    chronotopes: copyFormValue(event?.chronotopes || []),
    hasAssertion: !!event?.assertion,
    assertion: event?.assertion || null,
  };
}

/**
 * Historical event editor.
 */
@Component({
  selector: 'cadmus-historical-event-editor',
  templateUrl: './historical-event-editor.component.html',
  styleUrls: ['./historical-event-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatTabGroup,
    MatTab,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    AssertedChronotopeSetComponent,
    MatCheckbox,
    AssertionComponent,
    MatButton,
    MatIcon,
    MatIconButton,
    MatTooltip,
    RelatedEntityComponent,
    FlatLookupPipe,
    ThesaurusTreeComponent,
  ],
})
export class HistoricalEventEditorComponent {
  /**
   * The event being edited.
   */
  public readonly event = model<HistoricalEvent>();

  /**
   * Thesaurus event-types (hierarchical).
   */
  public readonly eventTypeEntries = input<ThesaurusEntry[]>();
  /**
   * Thesaurus event-tags.
   */
  public readonly eventTagEntries = input<ThesaurusEntry[]>();
  /**
   * Thesaurus event-relations (pseudo-hierarchical; the
   * separator used is : rather than .).
   */
  public readonly relationEntries = input<ThesaurusEntry[]>();
  /**
   * Thesaurus chronotope-tags.
   */
  public readonly ctTagEntries = input<ThesaurusEntry[]>();
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

  /**
   * The number of event type portions to cut from the event type ID when
   * building the prefix used to filter the corresponding relations IDs.
   * By default this is 0, i.e. the whole type ID (plus a final :) is
   * used as prefix. For instance, the ID "person.birth" generates prefix
   * "person:birth:". The portions of an ID are defined by splitting it at
   * each dot: so, should this property be 1, we would split the ID into
   * "person" and "birth", remove the last 1 tail(s), thus getting "person",
   * join back the portions and append a final colon, generating "person:".
   */
  public readonly eventTypeTailCut = input<number>(0);

  /**
   * True to disable ID lookup via scoped pin lookup.
   */
  public readonly noLookup = input<boolean>();

  public readonly editorClose = output();

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.event()));
  public readonly form = form(this._draft, (p) => {
    required(p.eid);
    maxLength(p.eid, 500);
    required(p.type);
    maxLength(p.type, 500);
    maxLength(p.tag, 50);
    maxLength(p.description, 1000);
    maxLength(p.note, 1000);
  });

  // related entity
  // the prefix used to filter the relation entries, from the event type
  public readonly typeEntryPrefix = computed<string | undefined>(() => {
    const type = this.form.type().value();
    return type ? this.getTypeEntryPrefix(type) : undefined;
  });

  // the current relation entries, filtered by the type prefix
  public readonly currentRelEntries = computed<ThesaurusEntry[]>(() => {
    if (!this.relationEntries()?.length) {
      return [];
    }
    const prefix = this.typeEntryPrefix();
    if (!prefix) {
      return this.relationEntries()!;
    }
    const filtered = this.relationEntries()!.filter((e) =>
      e.id.startsWith(prefix),
    );
    return filtered;
  });

  public readonly editedEntity = signal<RelatedEntity | undefined>(undefined);
  public readonly editedEntityIndex = signal<number>(-1);

  constructor() {
    // a new event was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.event();
      untracked(() => this.form().reset());
    });
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }

  private getTypeEntryPrefix(id: string): string {
    let p = id;

    // remove tail if any: by convention, an entry ID ending with ".-"
    // is always treated as a tailed ID where the ending "-" should be removed.
    // This is because that's the convention for representing parent entries
    // like "person.job.-" with children like "person.job.bishop".
    const tailSize = p.endsWith('.-')
      ? 1 + this.eventTypeTailCut()
      : this.eventTypeTailCut();

    if (tailSize > 0) {
      // split the event type ID (truly hierarchical, e.g. "person.birth")
      const tokens = p.split('.');
      if (tokens.length >= tailSize) {
        tokens.splice(tokens.length - tailSize);
      }
      p = tokens.join(RELATION_SEP);
      return p + RELATION_SEP;
    }
    return p.replace('.', RELATION_SEP) + RELATION_SEP;
  }

  public onTypeEntryChange(entry: ThesaurusEntry): void {
    this.form.type().value.set(entry.id);
    this.form.type().markAsDirty();
  }

  private getModel(): HistoricalEvent {
    const draft = this._draft();
    return {
      eid: draft.eid.trim(),
      type: draft.type.trim(),
      tag: draft.tag.trim() || undefined,
      description: draft.description.trim() || undefined,
      note: draft.note.trim() || undefined,
      chronotopes: draft.chronotopes.length
        ? copyFormValue(draft.chronotopes)
        : undefined,
      assertion: draft.hasAssertion ? draft.assertion || undefined : undefined,
      relatedEntities: draft.relatedEntities.length
        ? copyFormValue(draft.relatedEntities)
        : undefined,
    };
  }

  public onChronotopesChange(chronotope: AssertedChronotope[]): void {
    setFieldFromChild(this.form.chronotopes, copyFormValue(chronotope || []));
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    setFieldFromChild(this.form.assertion, assertion || null);
  }

  public addEntity(): void {
    this.editEntity(
      {
        id: { target: { gid: '', label: '' } },
        relation: this.currentRelEntries()?.length
          ? this.currentRelEntries()[0].id
          : '',
      },
      -1,
    );
  }

  public editEntity(entity: RelatedEntity, index: number): void {
    this.editedEntityIndex.set(index);
    this.editedEntity.set(structuredClone(entity));
  }

  public onEntityChange(entity: RelatedEntity): void {
    // nope if already present (id is a nested object handed back as a new
    // instance by the child editor, so it must be compared by value)
    if (
      this.form
        .relatedEntities()
        .value()
        .find(
          (e) =>
            JSON.stringify(e.id) === JSON.stringify(entity.id) &&
            e.relation === entity.relation,
        )
    ) {
      this.closeEntity();
      return;
    }
    // add or replace
    const entities = [...this.form.relatedEntities().value()];
    if (this.editedEntityIndex() === -1) {
      entities.push(entity);
    } else {
      entities.splice(this.editedEntityIndex(), 1, entity);
    }
    this.form.relatedEntities().value.set(entities);
    this.form.relatedEntities().markAsDirty();
    this.closeEntity();
  }

  public closeEntity(): void {
    this.editedEntityIndex.set(-1);
    this.editedEntity.set(undefined);
  }

  public deleteEntity(index: number): void {
    if (this.editedEntityIndex() === index) {
      this.closeEntity();
    }
    if (index > -1) {
      const entities = [...this.form.relatedEntities().value()];
      entities.splice(index, 1);
      this.form.relatedEntities().value.set(entities);
      this.form.relatedEntities().markAsDirty();
    }
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
    if (
      !isImplicitSubmission(event) ||
      this.form().invalid() ||
      !this.form().dirty()
    ) {
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
    this.event.set(this.getModel());
  }
}
