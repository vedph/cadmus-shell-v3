import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  linkedSignal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormField,
  applyEach,
  maxLength,
  required,
} from '@angular/forms/signals';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatFormField,
  MatLabel,
  MatError,
  MatHint,
} from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';

import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';
import {
  MetadataPart,
  METADATA_PART_TYPEID,
  Metadatum,
} from '../metadata-part';

interface MetadataPartSetting {
  noType?: boolean;
}

interface MetadatumRow {
  type: string;
  name: string;
  value: string;
}

interface MetadataPartControls {
  metadata: MetadatumRow[];
}

function toRow(item?: Metadatum): MetadatumRow {
  return {
    type: item?.type || '',
    name: item?.name || '',
    value: item?.value || '',
  };
}

function toDraft(part?: MetadataPart | null): MetadataPartControls {
  return { metadata: (part?.metadata || []).map((m) => toRow(m)) };
}

/**
 * Metadata part editor component.
 * Thesauri: metadata-types (optional).
 * Settings: noType (boolean, optional) - if true, the metadata type field
 * is not shown. This is globally applied to all metadata part instances.
 */
@Component({
  selector: 'cadmus-metadata-part',
  templateUrl: './metadata-part.component.html',
  styleUrls: ['./metadata-part.component.css'],
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
    MatButton,
    MatIconButton,
    MatTooltip,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatError,
    MatInput,
    MatHint,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class MetadataPartComponent extends ModelEditorComponentBase<MetadataPart> {
  /**
   * metadata-types thesaurus entries.
   */
  public readonly typeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['metadata-types']?.entries,
  );
  /**
   * metadata-names thesaurus entries.
   */
  public readonly nameEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['metadata-names']?.entries,
  );

  // signal set to true when there metadata type should not be displayed;
  // this is governed by a backend setting for all metadata part instances
  public readonly noType = signal<boolean>(false);

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.metadata, 1);
    applyEach(p.metadata, (row) => {
      maxLength(row.type, 100);
      required(row.name);
      maxLength(row.name, 500);
      required(row.value);
      maxLength(row.value, 1000);
    });
  });

  constructor() {
    super();
    // get setting for noType (global, not role-specific)
    this._appRepository
      ?.getSettingFor<MetadataPartSetting>(METADATA_PART_TYPEID)
      .then((setting) => {
        if (setting && setting.noType === true) {
          this.noType.set(true);
        }
      });
  }

  protected getValue(): MetadataPart {
    let part = this.getEditedPart(METADATA_PART_TYPEID) as MetadataPart;
    part.metadata = this.getMetadata();
    return part;
  }

  private setRows(rows: MetadatumRow[]): void {
    this.form.metadata().value.set(rows);
    this.form.metadata().markAsDirty();
  }

  public addMetadatum(item?: Metadatum): void {
    this.setRows([...this.form.metadata().value(), toRow(item)]);
  }

  public removeMetadatum(index: number): void {
    const rows = [...this.form.metadata().value()];
    rows.splice(index, 1);
    this.setRows(rows);
  }

  public moveMetadatumUp(index: number): void {
    if (index < 1) {
      return;
    }
    const rows = [...this.form.metadata().value()];
    const row = rows[index];
    rows.splice(index, 1);
    rows.splice(index - 1, 0, row);
    this.setRows(rows);
  }

  public moveMetadatumDown(index: number): void {
    const rows = [...this.form.metadata().value()];
    if (index + 1 >= rows.length) {
      return;
    }
    const row = rows[index];
    rows.splice(index, 1);
    rows.splice(index + 1, 0, row);
    this.setRows(rows);
  }

  private getMetadata(): Metadatum[] {
    return this._draft().metadata.map((row) => ({
      type: row.type.trim() || undefined,
      name: row.name.trim(),
      value: row.value.trim(),
    }));
  }
}
