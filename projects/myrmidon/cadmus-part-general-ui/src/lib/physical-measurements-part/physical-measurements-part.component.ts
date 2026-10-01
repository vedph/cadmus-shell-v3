import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
  inject,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import {
  PhysicalMeasurement,
  PhysicalMeasurementSetComponent,
} from '@myrmidon/cadmus-mat-physical-size';

import {
  ThesaurusEntry,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';

import {
  PHYSICAL_MEASUREMENTS_PART_TYPEID,
  PhysicalMeasurementsPart,
} from '../physical-measurements-part';
import {
  FormulaResult,
  PhysicalMeasurementsFormulaService,
  PhysicalMeasurementsSettings,
} from './physical-measurements-formula.service';
import { copyFormValue } from '../signal-form-utils';

interface PhysicalMeasurementsPartControls {
  measurements: PhysicalMeasurement[];
}

function toDraft(part?: PhysicalMeasurementsPart | null): PhysicalMeasurementsPartControls {
  return { measurements: copyFormValue(part?.measurements || []) };
}

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
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
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
export class PhysicalMeasurementsPartComponent extends ModelEditorComponentBase<PhysicalMeasurementsPart> {
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.measurements, 1);
  });

  // physical-size-units
  public readonly unitEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['physical-size-units']?.entries,
  );
  // physical-size-dim-tags
  public readonly dimTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['physical-size-dim-tags']?.entries,
  );
  // physical-size-set-names
  public readonly nameEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['physical-size-set-names']?.entries,
  );

  // settings loaded for this part's type/role ID (formulas), if any
  private readonly _settings = signal<PhysicalMeasurementsSettings | undefined>(
    undefined,
  );
  private readonly _formulaService = inject(PhysicalMeasurementsFormulaService);

  /**
   * The formula results computed from settings and the current
   * measurements, sorted alphabetically by their key, ready for display.
   */
  public readonly formulaResults = computed<FormulaResult[]>(() =>
    this._formulaService.computeResults(
      this._settings(),
      this.form.measurements().value(),
    ),
  );

  constructor() {
    super();
    // settings (formulas), looked up by this part's type ID and role ID
    this.initSettings<PhysicalMeasurementsSettings>(
      PHYSICAL_MEASUREMENTS_PART_TYPEID,
      (settings) => this._settings.set(settings),
    );
  }

  protected getValue(): PhysicalMeasurementsPart {
    let part = this.getEditedPart(
      PHYSICAL_MEASUREMENTS_PART_TYPEID,
    ) as PhysicalMeasurementsPart;
    part.measurements = copyFormValue(this._draft().measurements);
    return part;
  }

  public onMeasurementsChange(measurements: PhysicalMeasurement[]): void {
    this.form.measurements().value.set(copyFormValue(measurements || []));
    this.form.measurements().markAsDirty();
  }
}
