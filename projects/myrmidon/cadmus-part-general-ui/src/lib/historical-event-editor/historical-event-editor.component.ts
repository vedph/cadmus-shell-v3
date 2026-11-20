import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  linkedSignal,
  untracked,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { of, switchMap } from 'rxjs';

import { MatTabGroup, MatTab, MatTabLabel } from '@angular/material/tabs';
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

import {
  AssertedChronotope,
  AssertedChronotopeSetComponent,
} from '@myrmidon/cadmus-refs-asserted-chronotope';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { renderLabelFromLastColon } from '@myrmidon/cadmus-thesaurus-store';
import {
  mergeThesOrTaxoSettings,
  resolveThesOrTaxoEntries,
  ThesOrTaxoLabelPipe,
  ThesOrTaxoPicker,
  ThesOrTaxoSettings,
  ThesOrTaxoSourceService,
} from '@myrmidon/cadmus-ui-thestaxo';
import {
  copyFormValue,
  isImplicitSubmission,
  setFieldFromChild,
} from '@myrmidon/cadmus-ui';

import {
  buildRelationPrefix,
  DEFAULT_EVENT_TYPE_SETTINGS,
  DEFAULT_RELATION_SETTINGS,
  filterRelationEntries,
  HistoricalEvent,
  HistoricalEventRelationFilter,
  HistoricalEventsPartSettings,
  RelatedEntity,
  resolveRelationFilter,
} from '../historical-events-part';
import { RelatedEntityComponent } from '../related-entity/related-entity.component';

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
 * Compare two related entities by value (their id is a nested object).
 */
function sameEntity(a: RelatedEntity, b: RelatedEntity): boolean {
  return (
    a.relation === b.relation && JSON.stringify(a.id) === JSON.stringify(b.id)
  );
}

/**
 * Historical event editor.
 * The event type and the relations of related entities are picked from
 * thesauri (by default), taxonomies, or typed, according to settings.
 * Relations picked from a thesaurus can be filtered by the event type.
 */
@Component({
  selector: 'cadmus-historical-event-editor',
  templateUrl: './historical-event-editor.component.html',
  styleUrls: ['./historical-event-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    FormField,
    MatTabGroup,
    MatTab,
    MatTabLabel,
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
    ThesOrTaxoPicker,
    ThesOrTaxoLabelPipe,
  ],
})
export class HistoricalEventEditorComponent {
  private readonly _source = inject(ThesOrTaxoSourceService);

  /**
   * The event being edited.
   */
  public readonly event = model<HistoricalEvent>();

  /**
   * Thesaurus event-types (hierarchical). These are used to pick the event
   * type in thesaurus mode, unless settings specify a thesaurus ID.
   */
  public readonly eventTypeEntries = input<ThesaurusEntry[]>();
  /**
   * Thesaurus event-tags.
   */
  public readonly eventTagEntries = input<ThesaurusEntry[]>();
  /**
   * Thesaurus event-relations (pseudo-hierarchical; the separator used is :
   * rather than .). These are used to pick relations in thesaurus mode,
   * unless settings specify a thesaurus ID.
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
   * The editor settings, typically got from the part editor settings.
   * Their defined properties override the defaults: picking the type from
   * eventTypeEntries as a tree, picking relations from relationEntries as
   * a list, and filtering relations by the prefix built from the type.
   */
  public readonly settings = input<HistoricalEventsPartSettings | undefined>();

  /**
   * The number of event type portions to cut from the event type ID when
   * building the prefix used to filter the corresponding relations IDs.
   * This is the default for the tailCut of the relation filter, which
   * overrides it when specified in settings.
   * @deprecated Use settings.relationFilter.tailCut.
   */
  public readonly eventTypeTailCut = input<number>(0);

  /**
   * True to disable ID lookup via scoped pin lookup.
   */
  public readonly noLookup = input<boolean>();

  public readonly editorClose = output();

  // #region settings
  /**
   * The effective settings for the event type picker.
   */
  public readonly typePickerSettings = computed<ThesOrTaxoSettings>(() =>
    mergeThesOrTaxoSettings(
      DEFAULT_EVENT_TYPE_SETTINGS,
      this.settings()?.eventType,
    ),
  );

  /**
   * The thesaurus entries for the event type picker: these are the
   * event-types entries, unless settings specify a thesaurus to load.
   */
  public readonly typeEntries = computed(() =>
    resolveThesOrTaxoEntries(
      this.typePickerSettings(),
      this.eventTypeEntries(),
    ),
  );

  /**
   * The effective settings for the relation picker.
   */
  public readonly relationPickerSettings = computed<ThesOrTaxoSettings>(() =>
    mergeThesOrTaxoSettings(
      DEFAULT_RELATION_SETTINGS,
      this.settings()?.relation,
    ),
  );

  /**
   * The effective relation filter.
   */
  public readonly relationFilter = computed<
    Required<HistoricalEventRelationFilter>
  >(() =>
    resolveRelationFilter(
      this.settings()?.relationFilter,
      this.eventTypeTailCut(),
    ),
  );

  /**
   * True if relations are picked from a thesaurus, and thus can be
   * filtered by the event type.
   */
  public readonly relationsFromThesaurus = computed<boolean>(
    () => this.relationPickerSettings().mode === 'thesaurus',
  );

  // the ID of the relations thesaurus to load, when set by settings
  private readonly _relThesaurusId = computed<string | null>(() => {
    const s = this.relationPickerSettings();
    return s.mode === 'thesaurus' && s.source ? s.source : null;
  });

  private readonly _loadedRelEntries = toSignal(
    toObservable(this._relThesaurusId).pipe(
      switchMap((id) => (id ? this._source.getThesaurusEntries(id) : of(null))),
    ),
    { initialValue: null },
  );

  /**
   * All the relation entries, from the thesaurus specified by settings
   * (undefined while loading), or from relationEntries.
   */
  public readonly allRelEntries = computed<
    readonly ThesaurusEntry[] | undefined
  >(() =>
    this._relThesaurusId()
      ? (this._loadedRelEntries() ?? undefined)
      : this.relationEntries(),
  );
  // #endregion

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

  /**
   * True if any field in the general tab is invalid.
   */
  public readonly generalInvalid = computed<boolean>(
    () =>
      this.form.eid().invalid() ||
      this.form.type().invalid() ||
      this.form.tag().invalid() ||
      this.form.description().invalid() ||
      this.form.note().invalid(),
  );

  // #region related entities
  /**
   * The current related entities.
   */
  public readonly relatedEntities = computed<RelatedEntity[]>(() =>
    this.form.relatedEntities().value(),
  );

  /**
   * The current chronotopes.
   */
  public readonly chronotopes = computed<AssertedChronotope[]>(() =>
    this.form.chronotopes().value(),
  );

  /**
   * The prefix used to filter the relation entries, from the event type,
   * or undefined when relations are not filtered.
   */
  public readonly typeEntryPrefix = computed<string | undefined>(() =>
    this.relationsFromThesaurus()
      ? buildRelationPrefix(this.form.type().value(), this.relationFilter())
      : undefined,
  );

  /**
   * The current relation entries, filtered by the event type.
   */
  public readonly currentRelEntries = computed<ThesaurusEntry[]>(() =>
    this.relationsFromThesaurus()
      ? filterRelationEntries(
          this.allRelEntries(),
          this.form.type().value(),
          this.relationFilter(),
        )
      : [],
  );

  /**
   * The entries passed to the related entity editor: the current relation
   * entries in thesaurus mode, once all the entries are available.
   * Otherwise, undefined, so that the relation picker can load them by
   * itself, or use a taxonomy.
   */
  public readonly relatedEntityEntries = computed<
    readonly ThesaurusEntry[] | undefined
  >(() =>
    this.relationsFromThesaurus() && this.allRelEntries() !== undefined
      ? this.currentRelEntries()
      : undefined,
  );

  /**
   * The indexes of the related entities whose relation does not fit the
   * current event type, e.g. because the type was changed after adding
   * them. This applies only when relations are filtered.
   */
  public readonly mismatchedEntities = computed<ReadonlySet<number>>(() => {
    const result = new Set<number>();
    const prefix = this.typeEntryPrefix();
    const all = this.allRelEntries();
    if (!prefix || !all?.length) {
      return result;
    }
    // with fallback to all, any relation fits when none matches the prefix
    if (
      this.relationFilter().fallbackToAll &&
      !all.some((e) => e.id.startsWith(prefix))
    ) {
      return result;
    }
    this.form
      .relatedEntities()
      .value()
      .forEach((e, i) => {
        if (!e.relation.startsWith(prefix)) {
          result.add(i);
        }
      });
    return result;
  });

  public readonly editedEntity = signal<RelatedEntity | undefined>(undefined);
  public readonly editedEntityIndex = signal<number>(-1);
  // #endregion

  constructor() {
    // a new event was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit), and no entity edited
    effect(() => {
      this.event();
      untracked(() => {
        this.form().reset();
        this.closeEntity();
      });
    });
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }

  /**
   * Set the event type from the specified thesaurus entry. The type picker
   * is bound to the form, so this is just for setting the type from code.
   * @param entry The thesaurus entry.
   */
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
    const entries = this.currentRelEntries();
    this.editEntity(
      {
        id: { target: { gid: '', label: '' } },
        relation: entries.length ? entries[0].id : '',
      },
      -1,
    );
  }

  public editEntity(entity: RelatedEntity, index: number): void {
    this.editedEntityIndex.set(index);
    this.editedEntity.set(structuredClone(entity));
  }

  public onEntityChange(entity: RelatedEntity): void {
    const entities = [...this.form.relatedEntities().value()];

    // nope if already present
    if (entities.some((e) => sameEntity(e, entity))) {
      this.closeEntity();
      return;
    }
    // add or replace
    const index = this.editedEntityIndex();
    if (index < 0 || index >= entities.length) {
      entities.push(entity);
    } else {
      entities.splice(index, 1, entity);
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
    if (index < 0 || index >= this.form.relatedEntities().value().length) {
      return;
    }
    if (this.editedEntityIndex() === index) {
      this.closeEntity();
    } else if (this.editedEntityIndex() > index) {
      // keep pointing to the same entity after the removal
      this.editedEntityIndex.update((i) => i - 1);
    }
    const entities = [...this.form.relatedEntities().value()];
    entities.splice(index, 1);
    this.form.relatedEntities().value.set(entities);
    this.form.relatedEntities().markAsDirty();
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
