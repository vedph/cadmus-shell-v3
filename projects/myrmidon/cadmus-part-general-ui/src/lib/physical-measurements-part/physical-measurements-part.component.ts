import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { PhysicalMeasurement } from '@myrmidon/cadmus-mat-physical-size';

import {
  PHYSICAL_MEASUREMENTS_PART_TYPEID,
  PhysicalMeasurementsPart,
} from '../physical-measurements-part';

/**
 * PhysicalMeasurements part editor component.
 * Thesauri: physical-size-units, physical-size-dim-tags, physical-size-set-names (all optional).
 */
@Component({
  selector: 'cadmus-physical-measurements-part',
  templateUrl: './physical-measurements-part.component.html',
  styleUrl: './physical-measurements-part.component.scss',
  standalone: false,
})
export class PhysicalMeasurementsPartComponent
  extends ModelEditorComponentBase<PhysicalMeasurementsPart>
  implements OnInit
{
  public measurements: FormControl<PhysicalMeasurement[]>;

  // physical-size-units
  public unitEntries?: ThesaurusEntry[];
  // physical-size-dim-tags
  public dimTagEntries?: ThesaurusEntry[];
  // physical-size-set-names
  public nameEntries?: ThesaurusEntry[];

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.measurements = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      measurements: this.measurements,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'physical-size-units';
    if (this.hasThesaurus(key)) {
      this.unitEntries = thesauri[key].entries;
    } else {
      this.unitEntries = undefined;
    }
    key = 'physical-size-dim-tags';
    if (this.hasThesaurus(key)) {
      this.dimTagEntries = thesauri[key].entries;
    } else {
      this.dimTagEntries = undefined;
    }
    key = 'physical-size-set-names';
    if (this.hasThesaurus(key)) {
      this.nameEntries = thesauri[key].entries;
    } else {
      this.nameEntries = undefined;
    }
  }

  private updateForm(part?: PhysicalMeasurementsPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.measurements.setValue(part.measurements || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(
    data?: EditedObject<PhysicalMeasurementsPart>
  ): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): PhysicalMeasurementsPart {
    let part = this.getEditedPart(
      PHYSICAL_MEASUREMENTS_PART_TYPEID
    ) as PhysicalMeasurementsPart;
    part.measurements = this.measurements.value || [];
    return part;
  }

  public onMeasurementsChange(measurements: PhysicalMeasurement[]): void {
    this.measurements.setValue(measurements || []);
    this.measurements.markAsDirty();
    this.measurements.updateValueAndValidity();
  }
}
