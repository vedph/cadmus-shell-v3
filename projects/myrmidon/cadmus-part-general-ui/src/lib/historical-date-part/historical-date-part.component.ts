import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import {
  HistoricalDate,
  HistoricalDateModel,
} from '@myrmidon/cadmus-refs-historical-date';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';

import {
  HistoricalDatePart,
  HISTORICAL_DATE_PART_TYPEID,
} from '../historical-date-part';

@Component({
  selector: 'cadmus-historical-date-part',
  templateUrl: './historical-date-part.component.html',
  styleUrls: ['./historical-date-part.component.css'],
})
export class HistoricalDatePartComponent
  extends ModelEditorComponentBase<HistoricalDatePart>
  implements OnInit
{
  public references: FormControl<DocReference[]>;
  public date: FormControl<HistoricalDateModel>;

  public typeEntries: ThesaurusEntry[] | undefined;
  public tagEntries: ThesaurusEntry[] | undefined;

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.date = formBuilder.control(new HistoricalDate(), {
      nonNullable: true,
    });
    this.references = formBuilder.control([], { nonNullable: true });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      date: this.date,
      references: this.references,
    });
  }

  private updateForm(part?: HistoricalDatePart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.references.setValue(part.references || []);
    this.date.setValue(part.date);
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries = thesauri[key].entries;
    } else {
      this.typeEntries = undefined;
    }
  }

  protected override onDataSet(data?: EditedObject<HistoricalDatePart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    this.updateForm(data?.value);
  }

  protected getValue(): HistoricalDatePart {
    let part = this.getEditedPart(
      HISTORICAL_DATE_PART_TYPEID
    ) as HistoricalDatePart;
    part.date = this.date.value;
    part.references = this.references.value?.length
      ? this.references.value
      : undefined;
    return part;
  }

  public onDateChange(date?: HistoricalDateModel): void {
    if (date) {
      this.date.setValue(date);
      this.date.markAsDirty();
      this.date.updateValueAndValidity();
    }
  }

  public onReferencesChange(references: DocReference[]): void {
    this.references.setValue(references);
    this.references.updateValueAndValidity();
    this.references.markAsDirty();
  }
}
