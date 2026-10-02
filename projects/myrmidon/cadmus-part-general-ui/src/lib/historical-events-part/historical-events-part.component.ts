import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
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

import { NgxToolsSignalValidators, FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AssertedChronotopesPipe } from '@myrmidon/cadmus-refs-asserted-chronotope';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
} from '@myrmidon/cadmus-ui';

import { HistoricalEventEditorComponent } from '../historical-event-editor/historical-event-editor.component';

import {
  HistoricalEvent,
  HistoricalEventsPart,
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
    AssertedChronotopesPipe,
    FlatLookupPipe,
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

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.events, 1);
  });

  constructor(private _dialogService: DialogService) {
    super();
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
        type: this.eventTypeEntries()?.length
          ? this.eventTypeEntries()![0].id
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
