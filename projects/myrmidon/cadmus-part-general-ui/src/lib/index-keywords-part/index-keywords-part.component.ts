import {
  ChangeDetectionStrategy,
  Component,
  signal,
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
import { MatBadge } from '@angular/material/badge';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

import { FlatLookupPipe, NgxToolsSignalValidators } from '@myrmidon/ngx-tools';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
} from '@myrmidon/cadmus-ui';

import {
  IndexKeywordsPart,
  IndexKeyword,
  INDEX_KEYWORDS_PART_TYPEID,
} from '../index-keywords-part';
import { IndexKeywordComponent } from '../index-keyword/index-keyword.component';

interface IndexKeywordsPartControls {
  keywords: IndexKeyword[];
}

function toDraft(part?: IndexKeywordsPart | null): IndexKeywordsPartControls {
  return { keywords: copyFormValue(part?.keywords || []) };
}

interface IndexKeywordsPartSetting {
  noIndexId?: boolean;
}

/**
 * Index keywords part editor.
 * Thesauri: languages, keyword-indexes, keyword-tags.
 */
@Component({
  selector: 'cadmus-index-keywords-part',
  templateUrl: './index-keywords-part.component.html',
  styleUrls: ['./index-keywords-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatBadge,
    MatCardContent,
    MatButton,
    MatIconButton,
    MatTooltip,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    TitleCasePipe,
    FlatLookupPipe,
    IndexKeywordComponent,
    MatCardActions,
    CloseSaveButtonsComponent,
  ],
})
export class IndexKeywordsPartComponent extends ModelEditorComponentBase<IndexKeywordsPart> {
  public readonly editedKeyword = signal<IndexKeyword | undefined>(undefined);
  public readonly editedKeywordIndex = signal<number | undefined>(-1);

  // thesaurus
  public readonly idxEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['keyword-indexes']?.entries,
  );
  public readonly langEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['languages']?.entries,
  );
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['keyword-tags']?.entries,
  );

  public readonly noIndexId = signal<boolean>(false);

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.keywords, 1);
  });

  constructor() {
    super();

    // get setting for noIndexId (global, not role-specific)
    this._appRepository
      ?.getSettingFor<IndexKeywordsPartSetting>(INDEX_KEYWORDS_PART_TYPEID)
      .then((setting) => {
        if (setting && setting.noIndexId === true) {
          this.noIndexId.set(true);
        }
      });
  }

  protected getValue(): IndexKeywordsPart {
    let part = this.getEditedPart(
      INDEX_KEYWORDS_PART_TYPEID,
    ) as IndexKeywordsPart;
    part.keywords = copyFormValue(this._draft().keywords);
    return part;
  }

  public addKeyword(): void {
    const entry: IndexKeyword = {
      language: this.langEntries()?.[0]?.id || '',
      value: '',
    };
    this.editedKeywordIndex.set(-1);
    this.editedKeyword.set(entry);
  }

  public editKeyword(entry: IndexKeyword, index: number): void {
    this.editedKeywordIndex.set(index);
    this.editedKeyword.set(structuredClone(entry));
  }

  public closeKeyword(): void {
    this.editedKeywordIndex.set(-1);
    this.editedKeyword.set(undefined);
  }

  public saveKeyword(entry: IndexKeyword): void {
    const entries = [...this.form.keywords().value()];
    if (this.editedKeywordIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedKeywordIndex()!, 1, entry);
    }
    this.form.keywords().value.set(entries);
    this.form.keywords().markAsDirty();
    this.closeKeyword();
  }

  public deleteKeyword(index: number): void {
    if (this.editedKeywordIndex() === index) {
      this.closeKeyword();
    }
    const entries = [...this.form.keywords().value()];
    entries.splice(index, 1);
    this.form.keywords().value.set(entries);
    this.form.keywords().markAsDirty();
  }

  public moveKeywordUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.form.keywords().value()[index];
    const entries = [...this.form.keywords().value()];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.form.keywords().value.set(entries);
    this.form.keywords().markAsDirty();
    // keep editedKeywordIndex in sync
    if (this.editedKeywordIndex() === index) {
      this.editedKeywordIndex.set(index - 1);
    } else if (this.editedKeywordIndex() === index - 1) {
      this.editedKeywordIndex.set(index);
    }
  }

  public moveKeywordDown(index: number): void {
    if (index + 1 >= this.form.keywords().value().length) {
      return;
    }
    const entry = this.form.keywords().value()[index];
    const entries = [...this.form.keywords().value()];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.form.keywords().value.set(entries);
    this.form.keywords().markAsDirty();
    // keep editedKeywordIndex in sync
    if (this.editedKeywordIndex() === index) {
      this.editedKeywordIndex.set(index + 1);
    } else if (this.editedKeywordIndex() === index + 1) {
      this.editedKeywordIndex.set(index);
    }
  }
}
