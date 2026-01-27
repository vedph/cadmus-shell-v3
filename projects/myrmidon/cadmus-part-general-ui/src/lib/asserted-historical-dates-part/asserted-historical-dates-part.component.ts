import { Component, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  deepCopy,
  FlatLookupPipe,
  NgxToolsValidators,
} from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import {
  HistoricalDate,
  HistoricalDatePipe,
} from '@myrmidon/cadmus-refs-historical-date';
import {
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';
import { AssertedDate } from '@myrmidon/cadmus-refs-asserted-chronotope';

import {
  ASSERTED_HISTORICAL_DATES_PART_TYPEID,
  AssertedHistoricalDatesPart,
} from '../asserted-historical-dates-part';
import { AssertedHistoricalDateComponent } from '../asserted-historical-date/asserted-historical-date.component';

/**
 * Asserted historical parts editor.
 * Thesauri: asserted-historical-dates-tags, assertion-tags,
 * doc-reference-types, doc-reference-tags.
 */
@Component({
  selector: 'cadmus-asserted-historical-dates-part',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
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
})
export class AssertedHistoricalDatesPartComponent
  extends ModelEditorComponentBase<AssertedHistoricalDatesPart>
  implements OnInit
{
  public readonly maxDateCount = signal<number>(-1);
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<AssertedDate | undefined>(undefined);

  // asserted-historical-dates-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // assertion-tags
  public readonly assertionTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // doc-reference-types
  public readonly docReferenceTypeEntries = signal<
    ThesaurusEntry[] | undefined
  >(undefined);
  // doc-reference-tags
  public readonly docReferenceTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );

  public dates: FormControl<AssertedDate[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
  ) {
    super(authService, formBuilder);
    // form
    this.dates = formBuilder.control([], {
      // at least 1 entry
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      entries: this.dates,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'asserted-historical-dates-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }

    key = 'assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assertionTagEntries.set(thesauri[key].entries);
    } else {
      this.assertionTagEntries.set(undefined);
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.docReferenceTypeEntries.set(thesauri[key].entries);
    } else {
      this.docReferenceTypeEntries.set(undefined);
    }

    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.docReferenceTagEntries.set(thesauri[key].entries);
    } else {
      this.docReferenceTagEntries.set(undefined);
    }
  }

  private updateForm(part?: AssertedHistoricalDatesPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this._appRepository
      ?.getSettingFor<{ maxDateCount?: number }>(part.typeId, part.roleId)
      .then((setting) => {
        this.maxDateCount.set(setting?.maxDateCount || -1);
      }) || -1;
    this.dates.setValue(part.dates || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(
    data?: EditedObject<AssertedHistoricalDatesPart>,
  ): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): AssertedHistoricalDatesPart {
    let part = this.getEditedPart(
      ASSERTED_HISTORICAL_DATES_PART_TYPEID,
    ) as AssertedHistoricalDatesPart;
    part.dates = this.dates.value || [];
    return part;
  }

  public addDate(): void {
    // check max count if set
    if (
      this.maxDateCount() > 0 &&
      this.dates.value.length >= this.maxDateCount()
    ) {
      return;
    }

    const entry: AssertedDate = {
      a: { value: 0 },
    };
    this.editDate(entry, -1);
  }

  public editDate(entry: AssertedDate, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(deepCopy(entry));
  }

  public closeDate(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveDate(entry: AssertedDate): void {
    // ensure that no date exists with the same value
    let newValue = new HistoricalDate(entry).getSortValue();
    if (
      this.dates.value
        .map((e) => new HistoricalDate(e).getSortValue())
        .includes(newValue)
    ) {
      return;
    }

    const dates = [...this.dates.value];
    if (this.editedIndex() === -1) {
      dates.push(entry);
    } else {
      dates.splice(this.editedIndex(), 1, entry);
    }
    this.dates.setValue(dates);
    this.dates.markAsDirty();
    this.dates.updateValueAndValidity();
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
          const dates = [...this.dates.value];
          dates.splice(index, 1);
          this.dates.setValue(dates);
          this.dates.markAsDirty();
          this.dates.updateValueAndValidity();
        }
      });
  }

  public moveDateUp(index: number): void {
    if (index < 1) {
      return;
    }
    const date = this.dates.value[index];
    const dates = [...this.dates.value];
    dates.splice(index, 1);
    dates.splice(index - 1, 0, date);
    this.dates.setValue(dates);
    this.dates.markAsDirty();
    this.dates.updateValueAndValidity();
  }

  public moveDateDown(index: number): void {
    if (index + 1 >= this.dates.value.length) {
      return;
    }
    const date = this.dates.value[index];
    const dates = [...this.dates.value];
    dates.splice(index, 1);
    dates.splice(index + 1, 0, date);
    this.dates.setValue(dates);
    this.dates.markAsDirty();
    this.dates.updateValueAndValidity();
  }
}
