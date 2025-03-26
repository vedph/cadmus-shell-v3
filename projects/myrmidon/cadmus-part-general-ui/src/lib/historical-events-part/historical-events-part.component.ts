import { Component, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
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

import { NgxToolsValidators, FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AssertedChronotopesPipe } from '@myrmidon/cadmus-refs-asserted-chronotope';

import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  EditedObject,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import { HistoricalEventEditorComponent } from '../historical-event-editor/historical-event-editor.component';

import {
  HistoricalEvent,
  HistoricalEventsPart,
  HISTORICAL_EVENTS_PART_TYPEID,
} from '../historical-events-part';

/**
 * Historical events part.
 * Thesauri: event-types, event-tags, event-relations, chronotope-tags,
 * asserted-id-scopes, asserted-id-tags, assertion-tags, doc-reference-tags,
 * doc-reference-types, pin-link-scopes, pin-link-tags, pin-link-settings.
 */
@Component({
  selector: 'cadmus-historical-events-part',
  templateUrl: './historical-events-part.component.html',
  styleUrls: ['./historical-events-part.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
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
export class HistoricalEventsPartComponent
  extends ModelEditorComponentBase<HistoricalEventsPart>
  implements OnInit
{
  public editedEventIndex: number;
  public editedEvent: HistoricalEvent | undefined;
  // settings
  // by-type: true/false
  public pinByTypeMode?: boolean;
  // switch-mode: true/false
  public canSwitchMode?: boolean;
  // edit-target: true/false
  public canEditTarget?: boolean;

  /**
   * Thesaurus event-types.
   */
  public eventTypeEntries: ThesaurusEntry[] | undefined;
  /**
   * Thesaurus event-tags.
   */
  public eventTagEntries: ThesaurusEntry[] | undefined;
  /**
   * Thesaurus event-relations.
   */
  public relationEntries: ThesaurusEntry[] | undefined;
  /**
   * Thesaurus chronotope-tags.
   */
  public ctTagEntries: ThesaurusEntry[] | undefined;
  /**
   * Thesaurus assertion-tags.
   */
  public assTagEntries: ThesaurusEntry[] | undefined;
  /**
   * Thesaurus doc-reference-tags.
   */
  public refTagEntries: ThesaurusEntry[] | undefined;
  /**
   * Thesaurus doc-reference-types.
   */
  public refTypeEntries: ThesaurusEntry[] | undefined;
  // pin-link-scopes
  public idScopeEntries?: ThesaurusEntry[];
  // pin-link-tags
  public idTagEntries?: ThesaurusEntry[];

  public events: FormControl<HistoricalEvent[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    super(authService, formBuilder);
    this.editedEventIndex = -1;
    // form
    this.events = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      events: this.events,
    });
  }

  /**
   * Load settings from thesaurus entries.
   *
   * @param entries The thesaurus entries if any.
   */
  private loadSettings(entries?: ThesaurusEntry[]): void {
    if (!entries?.length) {
      this.pinByTypeMode = undefined;
      this.canSwitchMode = undefined;
      this.canEditTarget = undefined;
    }
    this.pinByTypeMode =
      entries?.find((e) => e.id === 'by-type')?.value === 'true';
    this.canSwitchMode =
      entries?.find((e) => e.id === 'switch-mode')?.value === 'true';
    this.canEditTarget =
      entries?.find((e) => e.id === 'edit-target')?.value === 'true';
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'event-types';
    if (this.hasThesaurus(key)) {
      this.eventTypeEntries = thesauri[key].entries;
    } else {
      this.eventTypeEntries = undefined;
    }
    key = 'event-tags';
    if (this.hasThesaurus(key)) {
      this.eventTagEntries = thesauri[key].entries;
    } else {
      this.eventTagEntries = undefined;
    }
    key = 'event-relations';
    if (this.hasThesaurus(key)) {
      this.relationEntries = thesauri[key].entries;
    } else {
      this.relationEntries = undefined;
    }
    key = 'chronotope-tags';
    if (this.hasThesaurus(key)) {
      this.ctTagEntries = thesauri[key].entries;
    } else {
      this.ctTagEntries = undefined;
    }
    key = 'assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assTagEntries = thesauri[key].entries;
    } else {
      this.assTagEntries = undefined;
    }
    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries = thesauri[key].entries;
    } else {
      this.refTagEntries = undefined;
    }
    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries = thesauri[key].entries;
    } else {
      this.refTypeEntries = undefined;
    }
    // pin-link
    key = 'pin-link-scopes';
    if (this.hasThesaurus(key)) {
      this.idScopeEntries = thesauri[key].entries;
    } else {
      this.idScopeEntries = undefined;
    }
    key = 'pin-link-tags';
    if (this.hasThesaurus(key)) {
      this.idTagEntries = thesauri[key].entries;
    } else {
      this.idTagEntries = undefined;
    }
    // load settings from thesaurus
    this.loadSettings(thesauri['pin-link-settings']?.entries);
  }

  private updateForm(part?: HistoricalEventsPart | null): void {
    this.closeEvent();
    if (!part) {
      this.form.reset();
      return;
    }
    this.events.setValue(part.events || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(
    data?: EditedObject<HistoricalEventsPart>
  ): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): HistoricalEventsPart {
    let part = this.getEditedPart(
      HISTORICAL_EVENTS_PART_TYPEID
    ) as HistoricalEventsPart;
    part.events = this.events.value || [];
    return part;
  }

  public closeEvent(): void {
    this.editedEventIndex = -1;
    this.editedEvent = undefined;
  }

  public addEvent(): void {
    this.editEvent(
      {
        eid: '',
        type: this.eventTypeEntries?.length ? this.eventTypeEntries[0].id : '',
      },
      -1
    );
  }

  public editEvent(event: HistoricalEvent, index: number): void {
    this.editedEventIndex = index;
    this.editedEvent = event;
  }

  public onEventSave(event: HistoricalEvent): void {
    const events = [...this.events.value];
    if (this.editedEventIndex === -1) {
      events.push(event);
    } else {
      events[this.editedEventIndex] = event;
    }
    this.events.setValue(events);
    this.events.updateValueAndValidity();
    this.events.markAsDirty();
    this.closeEvent();
  }

  public deleteEvent(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete event?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          if (this.editedEventIndex === index) {
            this.closeEvent();
          }
          const entries = [...this.events.value];
          entries.splice(index, 1);
          this.events.setValue(entries);
          this.events.updateValueAndValidity();
          this.events.markAsDirty();
        }
      });
  }

  public moveEventUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.events.value[index];
    const entries = [...this.events.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.events.setValue(entries);
    this.events.updateValueAndValidity();
    this.events.markAsDirty();
  }

  public moveEventDown(index: number): void {
    if (index + 1 >= this.events.value.length) {
      return;
    }
    const entry = this.events.value[index];
    const entries = [...this.events.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.events.setValue(entries);
    this.events.updateValueAndValidity();
    this.events.markAsDirty();
  }
}
