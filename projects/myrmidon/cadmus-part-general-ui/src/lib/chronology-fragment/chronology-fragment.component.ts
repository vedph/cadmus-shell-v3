import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormField, maxLength, required } from '@angular/forms/signals';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  setFieldFromChild,
} from '@myrmidon/cadmus-ui';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardSubtitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  HistoricalDateModel,
  HistoricalDateComponent,
} from '@myrmidon/cadmus-refs-historical-date';

import { ChronologyFragment } from '../chronology-fragment';

interface ChronologyFragmentControls {
  date: HistoricalDateModel | null;
  tag: string;
  label: string;
  eventId: string;
}

function toDraft(fr?: ChronologyFragment | null): ChronologyFragmentControls {
  // a fragment with no date is reset, as a new one
  return !fr?.date
    ? { date: null, tag: '', label: '', eventId: '' }
    : {
        date: fr.date,
        tag: fr.tag || '',
        label: fr.label || '',
        eventId: fr.eventId || '',
      };
}

/**
 * Chronology fragment editor component.
 * Thesauri: "chronology-tags" when you want to use a closed set of tags.
 */
@Component({
  selector: 'cadmus-chronology-fragment',
  templateUrl: './chronology-fragment.component.html',
  styleUrls: ['./chronology-fragment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    HistoricalDateComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class ChronologyFragmentComponent extends ModelEditorComponentBase<ChronologyFragment> {
  // chronology-tags thesaurus entries
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['chronology-tags']?.entries,
  );

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    required(p.date);
    maxLength(p.tag, 100);
    maxLength(p.label, 150);
    maxLength(p.eventId, 300);
  });

  public onDateChange(date: HistoricalDateModel): void {
    setFieldFromChild(this.form.date, date);
  }

  protected getValue(): ChronologyFragment {
    let fr = this.getEditedFragment() as ChronologyFragment;
    const draft = this._draft();
    fr.date = draft.date!;
    // label and tag
    fr.label = draft.label.trim() || undefined;
    fr.eventId = draft.eventId.trim() || undefined;
    fr.tag = draft.tag.trim() || undefined;
    return fr;
  }
}
