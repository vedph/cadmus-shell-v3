import { Component, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormControl,
  FormBuilder,
  Validators,
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
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  ProperName,
  ProperNameComponent,
} from '@myrmidon/cadmus-refs-proper-name';

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
  DistrictLocationPart,
  DISTRICT_LOCATION_PART_TYPEID,
} from '../district-location-part';

/**
 * DistrictLocation part editor component.
 * Thesauri: district-name-piece-types (required), district-name-lang-entries.
 */
@Component({
  selector: 'cadmus-district-location-part',
  templateUrl: './district-location-part.component.html',
  styleUrl: './district-location-part.component.scss',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    ProperNameComponent,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class DistrictLocationPartComponent
  extends ModelEditorComponentBase<DistrictLocationPart>
  implements OnInit
{
  public place: FormControl<ProperName | null>;
  public note: FormControl<string | null>;
  public initialName?: ProperName | null;

  // district-name-piece-types
  public typeEntries?: ThesaurusEntry[];
  // district-name-lang-entries
  public langEntries?: ThesaurusEntry[];

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.place = formBuilder.control(null, Validators.required);
    this.note = formBuilder.control(null, Validators.maxLength(5000));
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      place: this.place,
      note: this.note,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    const key = 'district-name-piece-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries = thesauri[key].entries;
    } else {
      this.typeEntries = undefined;
    }
  }

  private updateForm(part?: DistrictLocationPart | null): void {
    if (!part) {
      this.initialName = undefined;
      this.form.reset();
      return;
    }
    this.initialName = part.place;
    this.place.setValue(part.place || null);
    this.note.setValue(part.note || null);

    this.form.markAsPristine();
  }

  public onNameChange(name: ProperName | undefined): void {
    this.place.setValue(name || null);
    this.place.updateValueAndValidity();
    this.place.markAsDirty();
  }

  protected override onDataSet(
    data?: EditedObject<DistrictLocationPart>
  ): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): DistrictLocationPart {
    let part = this.getEditedPart(
      DISTRICT_LOCATION_PART_TYPEID
    ) as DistrictLocationPart;

    part.place = this.place.value || { language: '', pieces: [] };
    part.note = this.note.value?.trim() || undefined;

    return part;
  }
}
