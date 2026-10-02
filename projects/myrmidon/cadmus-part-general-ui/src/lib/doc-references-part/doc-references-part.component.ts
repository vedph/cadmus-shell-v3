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
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';

import {
  DocReferencesPart,
  DOC_REFERENCES_PART_TYPEID,
} from '../doc-references-part';
import { LookupDocReferencesComponent } from '@myrmidon/cadmus-refs-lookup';
import { copyFormValue, setFieldFromChild } from '../signal-form-utils';

interface DocReferencesPartSettings {
  noLookup?: boolean;
  noCitation?: boolean;
  defaultPicker?: 'citation' | 'lookup';
}

interface DocReferencesPartControls {
  references: DocReference[];
}

function toDraft(part?: DocReferencesPart | null): DocReferencesPartControls {
  return { references: copyFormValue(part?.references || []) };
}

/**
 * Document references part editor.
 * Thesauri: doc-reference-tags, doc-reference-types (all optional).
 * Settings: see DocReferencesPartSettings.
 */
@Component({
  selector: 'cadmus-doc-references-part',
  templateUrl: './doc-references-part.component.html',
  styleUrls: ['./doc-references-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    LookupDocReferencesComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class DocReferencesPartComponent extends ModelEditorComponentBase<DocReferencesPart> {
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.references, 1);
  });

  // thesauri
  // doc-reference-types
  public readonly typeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-types']?.entries,
  );
  // doc-reference-tags
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-tags']?.entries,
  );

  public readonly settings = signal<DocReferencesPartSettings | undefined>(
    undefined,
  );

  constructor() {
    super();
    // settings
    this.initSettings<DocReferencesPartSettings>(
      DOC_REFERENCES_PART_TYPEID,
      (settings) => this.settings.set(settings),
    );
  }

  protected getValue(): DocReferencesPart {
    let part = this.getEditedPart(
      DOC_REFERENCES_PART_TYPEID,
    ) as DocReferencesPart;
    part.references = copyFormValue(this._draft().references);
    return part;
  }

  public onReferencesChange(references: DocReference[]): void {
    setFieldFromChild(this.form.references, copyFormValue(references || []));
  }
}
