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

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  PhysicalMeasurement,
  PhysicalMeasurementSetComponent,
} from '@myrmidon/cadmus-mat-physical-size';

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
    TitleCasePipe,
    PhysicalMeasurementSetComponent,
    MatCardActions,
    CloseSaveButtonsComponent,
  ],
})
export class PhysicalMeasurementsPartComponent
  extends ModelEditorComponentBase<PhysicalMeasurementsPart>
  implements OnInit
{
  public measurements: FormControl<PhysicalMeasurement[]>;

  // physical-size-units
  public readonly unitEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // physical-size-dim-tags
  public readonly dimTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // physical-size-set-names
  public readonly nameEntries = signal<ThesaurusEntry[] | undefined>(undefined);

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
      this.unitEntries.set(thesauri[key].entries);
    } else {
      this.unitEntries.set(undefined);
    }
    key = 'physical-size-dim-tags';
    if (this.hasThesaurus(key)) {
      this.dimTagEntries.set(thesauri[key].entries);
    } else {
      this.dimTagEntries.set(undefined);
    }
    key = 'physical-size-set-names';
    if (this.hasThesaurus(key)) {
      this.nameEntries.set(thesauri[key].entries);
    } else {
      this.nameEntries.set(undefined);
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
    data?: EditedObject<PhysicalMeasurementsPart>,
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
      PHYSICAL_MEASUREMENTS_PART_TYPEID,
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
