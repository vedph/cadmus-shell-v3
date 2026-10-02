import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormField, maxLength, required } from '@angular/forms/signals';

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

import {
  ProperName,
  ProperNameComponent,
} from '@myrmidon/cadmus-refs-proper-name';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
  setFieldFromChild,
} from '@myrmidon/cadmus-ui';

import {
  DistrictLocationPart,
  DISTRICT_LOCATION_PART_TYPEID,
} from '../district-location-part';

interface DistrictLocationPartControls {
  place: ProperName | null;
  note: string;
}

function toDraft(
  part?: DistrictLocationPart | null,
): DistrictLocationPartControls {
  return {
    place: copyFormValue(part?.place || null),
    note: part?.note || '',
  };
}

/**
 * DistrictLocation part editor component.
 * Thesauri: district-name-piece-types (required), district-name-lang-entries.
 */
@Component({
  selector: 'cadmus-district-location-part',
  templateUrl: './district-location-part.component.html',
  styleUrl: './district-location-part.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
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
export class DistrictLocationPartComponent extends ModelEditorComponentBase<DistrictLocationPart> {
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    required(p.place);
    maxLength(p.note, 5000);
  });

  /**
   * The name for the name editor. It changes only with data, not with
   * the name editor's own changes.
   */
  public readonly name = computed<ProperName | undefined>(
    () => this.data()?.value?.place,
  );

  // thesauri:
  // district-name-piece-types
  public readonly typeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['district-name-piece-types']?.entries,
  );
  // district-name-lang-entries
  public readonly langEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['district-name-lang-entries']?.entries,
  );

  public onNameChange(name: ProperName | undefined): void {
    setFieldFromChild(this.form.place, copyFormValue(name || null));
  }

  protected getValue(): DistrictLocationPart {
    let part = this.getEditedPart(
      DISTRICT_LOCATION_PART_TYPEID,
    ) as DistrictLocationPart;
    const draft = this._draft();
    part.place = copyFormValue(draft.place) || { language: '', pieces: [] };
    part.note = draft.note?.trim() || undefined;

    return part;
  }
}
