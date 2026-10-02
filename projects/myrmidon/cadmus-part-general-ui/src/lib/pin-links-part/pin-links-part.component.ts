import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
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
  AssertedCompositeId,
  AssertedCompositeIdsComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
  setFieldFromChild,
} from '@myrmidon/cadmus-ui';

import { PinLinksPart, PIN_LINKS_PART_TYPEID } from '../pin-links-part';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

interface PinLinksPartControls {
  links: AssertedCompositeId[];
}

function toDraft(part?: PinLinksPart | null): PinLinksPartControls {
  return { links: copyFormValue(part?.links || []) };
}

interface PinLinksPartSettings {
  lookupProviderOptions?: LookupProviderOptions;
}

/**
 * PinLinksPart editor component.
 * Thesauri: pin-link-scopes, pin-link-tags, pin-link-assertion-tags,
 * pin-link-docref-types, pin-link-docref-tags, asserted-id-features.
 * Settings: lookupProviderOptions (LookupProviderOptions).
 */
@Component({
  selector: 'cadmus-pin-links-part',
  templateUrl: './pin-links-part.component.html',
  styleUrls: ['./pin-links-part.component.css'],
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
    AssertedCompositeIdsComponent,
    MatCardActions,
    CloseSaveButtonsComponent,
  ],
})
export class PinLinksPartComponent extends ModelEditorComponentBase<PinLinksPart> {
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.links, 1);
  });

  // pin-link-scopes
  public readonly idScopeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['pin-link-scopes']?.entries,
  );
  // pin-link-tags
  public readonly idTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['pin-link-tags']?.entries,
  );
  // pin-link-assertion-tags
  public readonly assTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['pin-link-assertion-tags']?.entries,
  );
  // pin-link-docref-types
  public readonly refTypeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['pin-link-docref-types']?.entries,
  );
  // pin-link-docref-tags
  public readonly refTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['pin-link-docref-tags']?.entries,
  );
  // asserted-id-features
  public readonly featureEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['asserted-id-features']?.entries,
  );

  // lookup options depending on role
  public readonly lookupProviderOptions = signal<
    LookupProviderOptions | undefined
  >(undefined);

  constructor() {
    super();
    // settings
    this.initSettings<PinLinksPartSettings>(
      PIN_LINKS_PART_TYPEID,
      (settings) => {
        this.lookupProviderOptions.set(
          settings?.lookupProviderOptions || undefined,
        );
      },
    );
  }

  protected getValue(): PinLinksPart {
    let part = this.getEditedPart(PIN_LINKS_PART_TYPEID) as PinLinksPart;
    part.links = copyFormValue(this._draft().links);
    return part;
  }

  public onIdsChange(ids: AssertedCompositeId[]): void {
    setFieldFromChild(this.form.links, copyFormValue(ids || []));
  }
}
