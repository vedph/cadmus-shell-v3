import {
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
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

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

import { deepCopy, FlatLookupPipe } from '@myrmidon/ngx-tools';
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
import { RelatedEntityComponent } from '../related-entity/related-entity.component';

const RELATION_SEP = ':';

/**
 * Historical event editor.
 */
@Component({
  selector: 'cadmus-historical-event-editor',
  templateUrl: './historical-event-editor.component.html',
  styleUrls: ['./historical-event-editor.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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

  // event
  public eid: FormControl<string | null>;
  public type: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public description: FormControl<string | null>;
  public note: FormControl<string | null>;
  public relatedEntities: FormControl<RelatedEntity[]>;
  public chronotopes: FormControl<AssertedChronotope[]>;
  public hasAssertion: FormControl<boolean>;
  public assertion: FormControl<Assertion | null>;
  public form: FormGroup;

  // related entity
  // the prefix used to filter the relation entries
  public readonly typeEntryPrefix = signal<string | undefined>(undefined);

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
      e.id.startsWith(prefix)
    );
    return filtered;
  });

  public readonly editedEntity = signal<RelatedEntity | undefined>(undefined);
  public readonly editedEntityIndex = signal<number>(-1);

  constructor(formBuilder: FormBuilder) {
    // form
    this.eid = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.type = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.description = formBuilder.control(null, Validators.maxLength(1000));
    this.note = formBuilder.control(null, Validators.maxLength(1000));
    this.relatedEntities = formBuilder.control([], { nonNullable: true });
    this.chronotopes = formBuilder.control([], { nonNullable: true });
    this.hasAssertion = formBuilder.control(false, { nonNullable: true });
    this.assertion = formBuilder.control(null);
    this.form = formBuilder.group({
      eid: this.eid,
      type: this.type,
      tag: this.tag,
      description: this.description,
      note: this.note,
      relatedEntities: this.relatedEntities,
      chronotopes: this.chronotopes,
      hasAssertion: this.hasAssertion,
      assertion: this.assertion,
    });

    effect(() => {
      const event = this.event();
      this.updateForm(event);
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

  private updateTypeEntryPrefix(id: string): void {
    const prefix = this.getTypeEntryPrefix(id);
    this.typeEntryPrefix.set(prefix);
  }

  public onTypeEntryChange(entry: ThesaurusEntry): void {
    setTimeout(() => {
      this.type.setValue(entry.id);
      this.updateTypeEntryPrefix(entry.id);
    }, 0);
  }

  private updateForm(model: HistoricalEvent | undefined): void {
    if (!model) {
      this.form.reset();
      return;
    }
    this.eid.setValue(model.eid, { emitEvent: false });
    this.type.setValue(model.type, { emitEvent: false });
    this.tag.setValue(model.tag || null, { emitEvent: false });
    this.description.setValue(model.description || null, { emitEvent: false });
    this.note.setValue(model.note || null, { emitEvent: false });
    this.chronotopes.setValue(model.chronotopes || [], { emitEvent: false });
    this.hasAssertion.setValue(model.assertion ? true : false, {
      emitEvent: false,
    });
    this.assertion.setValue(model.assertion || null, { emitEvent: false });
    this.relatedEntities.setValue(model.relatedEntities || [], {
      emitEvent: false,
    });

    this.form.markAsPristine();

    setTimeout(() => {
      this.updateTypeEntryPrefix(model.type);
    }, 0);
  }

  private getModel(): HistoricalEvent {
    return {
      eid: this.eid.value?.trim() || '',
      type: this.type.value?.trim() || '',
      tag: this.tag.value?.trim() || '',
      description: this.description.value?.trim() || undefined,
      note: this.note.value?.trim() || undefined,
      chronotopes: this.chronotopes.value.length
        ? this.chronotopes.value
        : undefined,
      assertion: this.hasAssertion.value
        ? this.assertion.value || undefined
        : undefined,
      relatedEntities: this.relatedEntities.value.length
        ? this.relatedEntities.value
        : undefined,
    };
  }

  public onChronotopesChange(chronotope: AssertedChronotope[]): void {
    this.chronotopes.setValue(chronotope);
    this.chronotopes.updateValueAndValidity();
    this.chronotopes.markAsDirty();
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.assertion.setValue(assertion || null);
    this.assertion.updateValueAndValidity();
    this.assertion.markAsDirty();
  }

  public addEntity(): void {
    this.editEntity(
      {
        id: { target: { gid: '', label: '' } },
        relation: this.currentRelEntries()?.length
          ? this.currentRelEntries()[0].id
          : '',
      },
      -1
    );
  }

  public editEntity(entity: RelatedEntity, index: number): void {
    this.editedEntityIndex.set(index);
    this.editedEntity.set(deepCopy(entity));
  }

  public onEntityChange(entity: RelatedEntity): void {
    // nope if already present
    if (
      this.relatedEntities.value.find(
        (e) => e.id === entity.id && e.relation === entity.relation
      )
    ) {
      this.closeEntity();
      return;
    }
    // add or replace
    const entities = [...this.relatedEntities.value];
    if (this.editedEntityIndex() === -1) {
      entities.push(entity);
    } else {
      entities.splice(this.editedEntityIndex(), 1, entity);
    }
    this.relatedEntities.setValue(entities);
    this.relatedEntities.updateValueAndValidity();
    this.relatedEntities.markAsDirty();
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
      const entities = [...this.relatedEntities.value];
      entities.splice(index, 1);
      this.relatedEntities.setValue(entities);
      this.relatedEntities.updateValueAndValidity();
      this.relatedEntities.markAsDirty();
    }
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.event.set(this.getModel());
  }
}
