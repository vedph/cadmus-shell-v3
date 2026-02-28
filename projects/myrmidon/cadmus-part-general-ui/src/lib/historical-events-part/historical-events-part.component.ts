import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
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

import {
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
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
 * doc-reference-types, pin-link-scopes, pin-link-tags, asserted-id-features.
 */
@Component({
  selector: 'cadmus-historical-events-part',
  templateUrl: './historical-events-part.component.html',
  styleUrls: ['./historical-events-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  public readonly editedEventIndex = signal<number>(-1);
  public readonly editedEvent = signal<HistoricalEvent | undefined>(undefined);

  /**
   * Thesaurus event-types.
   */
  public readonly eventTypeEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  /**
   * Thesaurus event-tags.
   */
  public readonly eventTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  /**
   * Thesaurus event-relations.
   */
  public readonly relationEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  /**
   * Thesaurus chronotope-tags.
   */
  public readonly ctTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  /**
   * Thesaurus assertion-tags.
   */
  public readonly assTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  /**
   * Thesaurus doc-reference-tags.
   */
  public readonly refTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  /**
   * Thesaurus doc-reference-types.
   */
  public readonly refTypeEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // pin-link-scopes
  public readonly idScopeEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // pin-link-tags
  public readonly idTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // asserted-id-features
  public readonly idFeatureEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );

  public events: FormControl<HistoricalEvent[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
  ) {
    super(authService, formBuilder);
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

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'event-types';
    if (this.hasThesaurus(key)) {
      this.eventTypeEntries.set(thesauri[key].entries);
    } else {
      this.eventTypeEntries.set(undefined);
    }
    key = 'event-tags';
    if (this.hasThesaurus(key)) {
      this.eventTagEntries.set(thesauri[key].entries);
    } else {
      this.eventTagEntries.set(undefined);
    }
    key = 'event-relations';
    if (this.hasThesaurus(key)) {
      this.relationEntries.set(thesauri[key].entries);
    } else {
      this.relationEntries.set(undefined);
    }
    key = 'chronotope-tags';
    if (this.hasThesaurus(key)) {
      this.ctTagEntries.set(thesauri[key].entries);
    } else {
      this.ctTagEntries.set(undefined);
    }
    key = 'assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assTagEntries.set(thesauri[key].entries);
    } else {
      this.assTagEntries.set(undefined);
    }
    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries.set(thesauri[key].entries);
    } else {
      this.refTagEntries.set(undefined);
    }
    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries.set(thesauri[key].entries);
    } else {
      this.refTypeEntries.set(undefined);
    }
    // pin-link
    key = 'pin-link-scopes';
    if (this.hasThesaurus(key)) {
      this.idScopeEntries.set(thesauri[key].entries);
    } else {
      this.idScopeEntries.set(undefined);
    }
    key = 'pin-link-tags';
    if (this.hasThesaurus(key)) {
      this.idTagEntries.set(thesauri[key].entries);
    } else {
      this.idTagEntries.set(undefined);
    }
    key = 'asserted-id-features';
    if (this.hasThesaurus(key)) {
      this.idFeatureEntries.set(thesauri[key].entries);
    } else {
      this.idFeatureEntries.set(undefined);
    }
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
    data?: EditedObject<HistoricalEventsPart>,
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
      HISTORICAL_EVENTS_PART_TYPEID,
    ) as HistoricalEventsPart;
    part.events = this.events.value || [];
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
    const events = [...this.events.value];
    if (this.editedEventIndex() === -1) {
      events.push(event);
    } else {
      events[this.editedEventIndex()] = event;
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
          if (this.editedEventIndex() === index) {
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
