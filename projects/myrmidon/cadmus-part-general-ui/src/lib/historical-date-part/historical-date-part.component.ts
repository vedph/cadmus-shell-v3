import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
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
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

import {
  HistoricalDate,
  HistoricalDateModel,
  HistoricalDateComponent,
} from '@myrmidon/cadmus-refs-historical-date';
import {
  DocReference,
  DocReferencesComponent,
} from '@myrmidon/cadmus-refs-doc-references';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';

import {
  HistoricalDatePart,
  HISTORICAL_DATE_PART_TYPEID,
} from '../historical-date-part';
import { copyFormValue } from '../signal-form-utils';

interface HistoricalDatePartControls {
  date: HistoricalDateModel;
  references: DocReference[];
}

function toDraft(part?: HistoricalDatePart | null): HistoricalDatePartControls {
  return {
    date: part?.date || new HistoricalDate(),
    references: copyFormValue(part?.references || []),
  };
}

/**
 * Historical date part editor.
 * Thesauri: doc-reference-tags, doc-reference-types (all optional).
 */
@Component({
  selector: 'cadmus-historical-date-part',
  templateUrl: './historical-date-part.component.html',
  styleUrls: ['./historical-date-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
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
export class HistoricalDatePartComponent extends ModelEditorComponentBase<HistoricalDatePart> {
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft);

  // thesauri:
  // doc-reference-types
  public readonly typeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-types']?.entries,
  );
  // doc-reference-tags
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-tags']?.entries,
  );

  protected getValue(): HistoricalDatePart {
    let part = this.getEditedPart(
      HISTORICAL_DATE_PART_TYPEID,
    ) as HistoricalDatePart;
    const draft = this._draft();
    part.date = draft.date;
    part.references = draft.references.length
      ? copyFormValue(draft.references)
      : undefined;
    return part;
  }

  public onDateChange(date: HistoricalDateModel): void {
    this.form.date().value.set(date);
    this.form.date().markAsDirty();
  }

  public onReferencesChange(references: DocReference[]): void {
    this.form.references().value.set(copyFormValue(references));
    this.form.references().markAsDirty();
  }
}
