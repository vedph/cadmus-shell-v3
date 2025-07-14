import { Component, OnInit } from '@angular/core';
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

import { FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';
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
  public maxDateCount = -1;
  public editedIndex: number;
  public edited: AssertedDate | undefined;

  // asserted-historical-dates-tags
  public tagEntries?: ThesaurusEntry[];
  // assertion-tags
  public assertionTagEntries?: ThesaurusEntry[];
  // doc-reference-types
  public docReferenceTypeEntries?: ThesaurusEntry[];
  // doc-reference-tags
  public docReferenceTagEntries?: ThesaurusEntry[];

  public dates: FormControl<AssertedDate[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    super(authService, formBuilder);
    this.editedIndex = -1;
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
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }

    key = 'assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assertionTagEntries = thesauri[key].entries;
    } else {
      this.assertionTagEntries = undefined;
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.docReferenceTypeEntries = thesauri[key].entries;
    } else {
      this.docReferenceTypeEntries = undefined;
    }

    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.docReferenceTagEntries = thesauri[key].entries;
    } else {
      this.docReferenceTagEntries = undefined;
    }
  }

  private updateForm(part?: AssertedHistoricalDatesPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this._appRepository
      ?.getSettingFor(part.typeId, part.roleId)
      .then((setting) => {
        this.maxDateCount = setting?.maxDateCount || -1;
      }) || -1;
    this.dates.setValue(part.dates || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(
    data?: EditedObject<AssertedHistoricalDatesPart>
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
      ASSERTED_HISTORICAL_DATES_PART_TYPEID
    ) as AssertedHistoricalDatesPart;
    part.dates = this.dates.value || [];
    return part;
  }

  public addDate(): void {
    // check max count if set
    if (this.maxDateCount > 0 && this.dates.value.length >= this.maxDateCount) {
      return;
    }

    const entry: AssertedDate = {
      a: { value: 0 },
    };
    this.editDate(entry, -1);
  }

  public editDate(entry: AssertedDate, index: number): void {
    this.editedIndex = index;
    this.edited = entry;
  }

  public closeDate(): void {
    this.editedIndex = -1;
    this.edited = undefined;
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

    const entries = [...this.dates.value];
    if (this.editedIndex === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex, 1, entry);
    }
    this.dates.setValue(entries);
    this.dates.markAsDirty();
    this.dates.updateValueAndValidity();
    this.closeDate();
  }

  public deleteDate(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete date?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex === index) {
            this.closeDate();
          }
          const entries = [...this.dates.value];
          entries.splice(index, 1);
          this.dates.setValue(entries);
          this.dates.markAsDirty();
          this.dates.updateValueAndValidity();
        }
      });
  }

  public moveDateUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.dates.value[index];
    const entries = [...this.dates.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.dates.setValue(entries);
    this.dates.markAsDirty();
    this.dates.updateValueAndValidity();
  }

  public moveDateDown(index: number): void {
    if (index + 1 >= this.dates.value.length) {
      return;
    }
    const entry = this.dates.value[index];
    const entries = [...this.dates.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.dates.setValue(entries);
    this.dates.markAsDirty();
    this.dates.updateValueAndValidity();
  }
}
