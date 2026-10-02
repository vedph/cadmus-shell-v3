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
  AssertedId,
  AssertedIdsComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
  setFieldFromChild,
} from '@myrmidon/cadmus-ui';

import {
  ExternalIdsPart,
  EXTERNAL_IDS_PART_TYPEID,
} from '../external-ids-part';

interface ExternalIdsPartControls {
  ids: AssertedId[];
}

function toDraft(part?: ExternalIdsPart | null): ExternalIdsPartControls {
  return { ids: copyFormValue(part?.ids || []) };
}

/**
 * External IDs part editor component. This is just a collection of asserted
 * IDs.
 * Thesauri: external-id-types, external-id-tags, assertion-tags,
 * doc-reference-types, doc-reference-tags (all optional).
 * Note: this part is obsolete. You should rather use pin-links-part.
 */
@Component({
  selector: 'cadmus-refs-external-ids-part',
  templateUrl: './external-ids-part.component.html',
  styleUrls: ['./external-ids-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    AssertedIdsComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class ExternalIdsPartComponent extends ModelEditorComponentBase<ExternalIdsPart> {
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.ids, 1);
  });

  // external-id-scopes
  public readonly idScopeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['external-id-scopes']?.entries,
  );
  // external-id-tags
  public readonly idTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['external-id-tags']?.entries,
  );

  // thesauri for assertions:
  // assertion-tags
  public readonly assTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['assertion-tags']?.entries,
  );
  // doc-reference-types
  public readonly refTypeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-types']?.entries,
  );
  // doc-reference-tags
  public readonly refTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-tags']?.entries,
  );

  protected getValue(): ExternalIdsPart {
    let part = this.getEditedPart(EXTERNAL_IDS_PART_TYPEID) as ExternalIdsPart;
    part.ids = copyFormValue(this._draft().ids);
    return part;
  }

  public onIdsChange(ids: AssertedId[]): void {
    setFieldFromChild(this.form.ids, copyFormValue(ids || []));
  }
}
