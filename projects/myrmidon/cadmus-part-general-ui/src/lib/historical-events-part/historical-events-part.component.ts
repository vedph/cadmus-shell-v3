import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
  signal,
} from '@angular/core';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { take } from 'rxjs/operators';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
} from '@angular/material/expansion';

import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AssertedChronotopesPipe } from '@myrmidon/cadmus-refs-asserted-chronotope';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
} from '@myrmidon/cadmus-ui';

import {
  mergeThesOrTaxoSettings,
  resolveThesOrTaxoEntries,
  ThesOrTaxoLabelPipe,
  ThesOrTaxoSettings,
} from '@myrmidon/cadmus-ui-thestaxo';

import { HistoricalEventEditorComponent } from '../historical-event-editor/historical-event-editor.component';

import {
  DEFAULT_EVENT_TYPE_SETTINGS,
  HistoricalEvent,
  HistoricalEventsPart,
  HistoricalEventsPartSettings,
  HISTORICAL_EVENTS_PART_TYPEID,
} from '../historical-events-part';

interface HistoricalEventsPartControls {
  events: HistoricalEvent[];
}

function toDraft(
  part?: HistoricalEventsPart | null,
): HistoricalEventsPartControls {
  return { events: copyFormValue(part?.events || []) };
}

/**
 * Historical events part.
 * Thesauri: event-types, event-tags, event-relations, chronotope-tags,
 * asserted-id-scopes, asserted-id-tags, assertion-tags, doc-reference-tags,
 * doc-reference-types, pin-link-scopes, pin-link-tags, asserted-id-features.
 * Settings (HistoricalEventsPartSettings): eventType, to pick the event type
 * from a taxonomy or another thesaurus rather than from event-types.
 */
@Component({
  selector: 'cadmus-historical-events-part',
  templateUrl: './historical-events-part.component.html',
  styleUrls: ['./historical-events-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    MatButton,
    MatIconButton,
    MatTooltip,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    HistoricalEventEditorComponent,
    MatCardActions,
    TitleCasePipe,
    AsyncPipe,
    AssertedChronotopesPipe,
    ThesOrTaxoLabelPipe,
    CloseSaveButtonsComponent,
  ],
})
export class HistoricalEventsPartComponent extends ModelEditorComponentBase<HistoricalEventsPart> {
  public readonly editedEventIndex = signal<number>(-1);
  public readonly editedEvent = signal<HistoricalEvent | undefined>(undefined);

  /**
   * Thesaurus event-types.
   */
  public readonly eventTypeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['event-types']?.entries,
  );
  /**
   * Thesaurus event-tags.
   */
  public readonly eventTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['event-tags']?.entries,
  );
  /**
   * Thesaurus event-relations.
   */
  public readonly relationEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['event-relations']?.entries,
  );
  /**
   * Thesaurus chronotope-tags.
   */
  public readonly ctTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['chronotope-tags']?.entries,
  );
  /**
   * Thesaurus assertion-tags.
   */
  public readonly assTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['assertion-tags']?.entries,
  );
  /**
   * Thesaurus doc-reference-tags.
   */
  public readonly refTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-tags']?.entries,
  );
  /**
   * Thesaurus doc-reference-types.
   */
  public readonly refTypeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-types']?.entries,
  );
  // pin-link-scopes
  public readonly idScopeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['pin-link-scopes']?.entries,
  );
  // pin-link-tags
  public readonly idTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['pin-link-tags']?.entries,
  );
  // asserted-id-features
  public readonly idFeatureEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['asserted-id-features']?.entries,
  );

  /**
   * The editor settings, role-specific or global, if any. These are
   * passed to the event editor.
   */
  public readonly settings = signal<HistoricalEventsPartSettings | undefined>(
    undefined,
  );

  /**
   * The effective event type picker settings, i.e. the editor settings
   * applied over the defaults.
   */
  public readonly typePickerSettings = computed<ThesOrTaxoSettings>(() =>
    mergeThesOrTaxoSettings(
      DEFAULT_EVENT_TYPE_SETTINGS,
      this.settings()?.eventType,
    ),
  );

  /**
   * The thesaurus entries used for the event type: the event-types entries,
   * unless settings specify a thesaurus to load.
   */
  public readonly typeEntries = computed(() =>
    resolveThesOrTaxoEntries(
      this.typePickerSettings(),
      this.eventTypeEntries(),
    ),
  );

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.events, 1);
  });

  constructor(private _dialogService: DialogService) {
    super();

    // settings: role-specific if any, else global
    this.initSettings<HistoricalEventsPartSettings>(
      HISTORICAL_EVENTS_PART_TYPEID,
      (settings) => {
        if (settings || !this.identity()?.roleId) {
          this.applySettings(settings);
          return;
        }
        this._appRepository
          ?.getSettingFor<HistoricalEventsPartSettings>(
            HISTORICAL_EVENTS_PART_TYPEID,
          )
          .then((global) => this.applySettings(global))
          .catch(() => this.applySettings(undefined));
      },
    );
  }

  private applySettings(
    settings: HistoricalEventsPartSettings | undefined,
  ): void {
    this.settings.set(settings || undefined);
  }

  protected override onDataSet(): void {
    // new data: close the event being edited, if any
    this.closeEvent();
  }

  protected getValue(): HistoricalEventsPart {
    let part = this.getEditedPart(
      HISTORICAL_EVENTS_PART_TYPEID,
    ) as HistoricalEventsPart;
    part.events = copyFormValue(this._draft().events);
    return part;
  }

  public closeEvent(): void {
    this.editedEventIndex.set(-1);
    this.editedEvent.set(undefined);
  }

  public addEvent(): void {
    this.editEvent(
      {
        eid: '',
        // in thesaurus mode, default to the first entry when available
        type:
          this.typePickerSettings().mode === 'thesaurus' &&
          this.typeEntries()?.length
            ? this.typeEntries()![0].id
            : '',
      },
      -1,
    );
  }

  public editEvent(event: HistoricalEvent, index: number): void {
    this.editedEventIndex.set(index);
    this.editedEvent.set(structuredClone(event));
  }

  public onEventSave(event: HistoricalEvent): void {
    const events = [...this.form.events().value()];
    if (this.editedEventIndex() === -1) {
      events.push(event);
    } else {
      events[this.editedEventIndex()] = event;
    }
    this.form.events().value.set(events);
    this.form.events().markAsDirty();
    this.closeEvent();
  }

  public deleteEvent(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete event?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          if (this.editedEventIndex() === index) {
            this.closeEvent();
          }
          const entries = [...this.form.events().value()];
          entries.splice(index, 1);
          this.form.events().value.set(entries);
          this.form.events().markAsDirty();
        }
      });
  }

  public moveEventUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.form.events().value()[index];
    const entries = [...this.form.events().value()];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.form.events().value.set(entries);
    this.form.events().markAsDirty();
  }

  public moveEventDown(index: number): void {
    if (index + 1 >= this.form.events().value().length) {
      return;
    }
    const entry = this.form.events().value()[index];
    const entries = [...this.form.events().value()];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.form.events().value.set(entries);
    this.form.events().markAsDirty();
  }
}
