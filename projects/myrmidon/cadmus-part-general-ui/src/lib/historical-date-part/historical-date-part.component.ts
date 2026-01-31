import { Component, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  HistoricalDate,
  HistoricalDateModel,
  HistoricalDateComponent,
} from '@myrmidon/cadmus-refs-historical-date';
import {
  DocReference,
  DocReferencesComponent,
} from '@myrmidon/cadmus-refs-doc-references';

import {
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import {
  HistoricalDatePart,
  HISTORICAL_DATE_PART_TYPEID,
} from '../historical-date-part';

/**
 * Historical date part editor.
 * Thesauri: doc-reference-tags, doc-reference-types (all optional).
 */
@Component({
  selector: 'cadmus-historical-date-part',
  templateUrl: './historical-date-part.component.html',
  styleUrls: ['./historical-date-part.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    HistoricalDateComponent,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    DocReferencesComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class HistoricalDatePartComponent
  extends ModelEditorComponentBase<HistoricalDatePart>
  implements OnInit
{
  // form
  public references: FormControl<DocReference[]>;
  public date: FormControl<HistoricalDateModel>;

  // thesauri:
  // doc-reference-types
  public readonly typeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // doc-reference-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

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
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries.set(thesauri[key].entries);
    } else {
      this.typeEntries.set(undefined);
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
      HISTORICAL_DATE_PART_TYPEID,
    ) as HistoricalDatePart;
    part.date = this.date.value;
    part.references = this.references.value?.length
      ? this.references.value
      : undefined;
    return part;
  }

  public onDateChange(date: HistoricalDateModel): void {
    this.date.setValue(date);
    this.date.markAsDirty();
    this.date.updateValueAndValidity();
  }

  public onReferencesChange(references: DocReference[]): void {
    this.references.setValue(references);
    this.references.updateValueAndValidity();
    this.references.markAsDirty();
  }
}
