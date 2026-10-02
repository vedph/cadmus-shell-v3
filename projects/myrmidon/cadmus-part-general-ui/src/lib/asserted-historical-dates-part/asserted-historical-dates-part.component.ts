import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  linkedSignal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FlatLookupPipe, NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  HistoricalDate,
  HistoricalDatePipe,
} from '@myrmidon/cadmus-refs-historical-date';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
} from '@myrmidon/cadmus-ui';
import { AssertedHistoricalDate } from '@myrmidon/cadmus-refs-asserted-chronotope';

import {
  ASSERTED_HISTORICAL_DATES_PART_TYPEID,
  AssertedHistoricalDatesPart,
} from '../asserted-historical-dates-part';
import { AssertedHistoricalDateComponent } from '../asserted-historical-date/asserted-historical-date.component';

interface AssertedHistoricalDatesPartControls {
  dates: AssertedHistoricalDate[];
}

function toDraft(
  part?: AssertedHistoricalDatesPart | null,
): AssertedHistoricalDatesPartControls {
  return { dates: copyFormValue(part?.dates || []) };
}

/**
 * Asserted historical parts editor.
 * Thesauri: asserted-historical-dates-tags, assertion-tags,
 * doc-reference-types, doc-reference-tags.
 */
@Component({
  selector: 'cadmus-asserted-historical-dates-part',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    HelpLinkComponent,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    // cadmus
    FlatLookupPipe,
    HistoricalDatePipe,
    AssertedHistoricalDateComponent,
    CloseSaveButtonsComponent,
  ],
  templateUrl: './asserted-historical-dates-part.component.html',
  styleUrl: './asserted-historical-dates-part.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedHistoricalDatesPartComponent extends ModelEditorComponentBase<AssertedHistoricalDatesPart> {
  /**
   * The maximum allowed date count. -1 means no limit. The limit
   * is set in the part backend settings.
   */
  public readonly maxDateCount = signal<number>(-1);

  // component state
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<AssertedHistoricalDate | undefined>(
    undefined,
  );

  // thesauri:
  // asserted-historical-dates-tags
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['asserted-historical-dates-tags']?.entries,
  );
  // assertion-tags
  public readonly assertionTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['assertion-tags']?.entries,
  );
  // doc-reference-types
  public readonly docReferenceTypeEntries = computed<
    ThesaurusEntry[] | undefined
  >(() => this.data()?.thesauri?.['doc-reference-types']?.entries);
  // doc-reference-tags
  public readonly docReferenceTagEntries = computed<
    ThesaurusEntry[] | undefined
  >(() => this.data()?.thesauri?.['doc-reference-tags']?.entries);

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.dates, 1);
  });

  constructor(private _dialogService: DialogService) {
    super();
    // settings
    this.initSettings<{ maxDateCount?: number }>(
      ASSERTED_HISTORICAL_DATES_PART_TYPEID,
      (settings) => this.maxDateCount.set(settings?.maxDateCount || -1),
    );
  }

  protected getValue(): AssertedHistoricalDatesPart {
    let part = this.getEditedPart(
      ASSERTED_HISTORICAL_DATES_PART_TYPEID,
    ) as AssertedHistoricalDatesPart;
    part.dates = copyFormValue(this._draft().dates);
    return part;
  }

  public addDate(): void {
    // check max count if set
    if (
      this.maxDateCount() > 0 &&
      this.form.dates().value().length >= this.maxDateCount()
    ) {
      return;
    }

    const entry: AssertedHistoricalDate = {
      a: { value: 0 },
    };
    this.editDate(entry, -1);
  }

  public editDate(entry: AssertedHistoricalDate, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(entry));
  }

  public closeDate(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveDate(entry: AssertedHistoricalDate): void {
    // ensure that no date exists with the same value
    let newValue = new HistoricalDate(entry).getSortValue();
    if (
      this.form
        .dates()
        .value()
        .map((e) => new HistoricalDate(e).getSortValue())
        .includes(newValue)
    ) {
      return;
    }

    const dates = [...this.form.dates().value()];
    if (this.editedIndex() === -1) {
      dates.push(entry);
    } else {
      dates.splice(this.editedIndex(), 1, entry);
    }
    this.form.dates().value.set(dates);
    this.form.dates().markAsDirty();
    this.closeDate();
  }

  public deleteDate(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete date?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closeDate();
          }
          const dates = [...this.form.dates().value()];
          dates.splice(index, 1);
          this.form.dates().value.set(dates);
          this.form.dates().markAsDirty();
        }
      });
  }

  public moveDateUp(index: number): void {
    if (index < 1) {
      return;
    }
    const date = this.form.dates().value()[index];
    const dates = [...this.form.dates().value()];
    dates.splice(index, 1);
    dates.splice(index - 1, 0, date);
    this.form.dates().value.set(dates);
    this.form.dates().markAsDirty();
  }

  public moveDateDown(index: number): void {
    if (index + 1 >= this.form.dates().value().length) {
      return;
    }
    const date = this.form.dates().value()[index];
    const dates = [...this.form.dates().value()];
    dates.splice(index, 1);
    dates.splice(index + 1, 0, date);
    this.form.dates().value.set(dates);
    this.form.dates().markAsDirty();
  }
}
