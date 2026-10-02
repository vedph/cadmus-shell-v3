import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';

import { MatIcon } from '@angular/material/icon';
import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';

import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import {
  DecoratedCount,
  DecoratedCountsComponent,
} from '@myrmidon/cadmus-refs-decorated-counts';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';

import {
  DECORATED_COUNTS_PART_TYPEID,
  DecoratedCountsPart,
} from '../decorated-counts-part';
import { copyFormValue, setFieldFromChild } from '../signal-form-utils';

interface DecoratedCountsPartControls {
  counts: DecoratedCount[];
}

function toDraft(
  part?: DecoratedCountsPart | null,
): DecoratedCountsPartControls {
  return { counts: copyFormValue(part?.counts || []) };
}

/**
 * Decorated counts part editor component.
 * Thesauri: decorated-count-ids, decorated-count-tags (all optional).
 */
@Component({
  selector: 'cadmus-decorated-counts-part',
  templateUrl: './decorated-counts-part.component.html',
  styleUrl: './decorated-counts-part.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    DecoratedCountsComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class DecoratedCountsPartComponent extends ModelEditorComponentBase<DecoratedCountsPart> {
  // thesauri:
  // decorated-count-ids
  public readonly idEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['decorated-count-ids']?.entries,
  );
  // decorated-count-tags
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['decorated-count-tags']?.entries,
  );

  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.counts, 1);
  });

  protected getValue(): DecoratedCountsPart {
    let part = this.getEditedPart(
      DECORATED_COUNTS_PART_TYPEID,
    ) as DecoratedCountsPart;
    part.counts = copyFormValue(this._draft().counts);
    return part;
  }

  public onCountsChange(counts: DecoratedCount[]): void {
    setFieldFromChild(this.form.counts, copyFormValue(counts || []));
  }
}
