import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

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
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { KeywordsPart, Keyword, KEYWORDS_PART_TYPEID } from '../keywords-part';

interface KeywordsPartControls {
  keywords: Keyword[];
}

interface NewKeywordControls {
  language: string | null;
  text: string;
}

function compareKeywords(a: Keyword, b: Keyword): number {
  if (!a) {
    if (!b) {
      return 0;
    } else {
      return -1;
    }
  }
  if (!b) {
    return 1;
  }
  const n = a.language.localeCompare(b.language);
  if (n !== 0) {
    return n;
  }
  return a.value.localeCompare(b.value);
}

/**
 * Bound part -> editable draft: the keywords are copied and sorted.
 */
function toDraft(part?: KeywordsPart | null): KeywordsPartControls {
  return {
    keywords: (part?.keywords || [])
      .map((k) => ({ language: k.language, value: k.value }))
      .sort(compareKeywords),
  };
}

/**
 * Keywords editor component.
 * Thesauri: languages.
 */
@Component({
  selector: 'cadmus-keywords-part',
  templateUrl: './keywords-part.component.html',
  styleUrls: ['./keywords-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatBadge,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatError,
    MatInput,
    MatButton,
    MatIconButton,
    MatTooltip,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class KeywordsPartComponent extends ModelEditorComponentBase<KeywordsPart> {
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.keywords, 1);
  });

  // new keyword form
  private readonly _newDraft = signal<NewKeywordControls>({
    language: 'eng',
    text: '',
  });
  public readonly newForm = form(this._newDraft, (p) => {
    required(p.language);
    required(p.text);
    maxLength(p.text, 100);
  });

  // thesauri:
  // languages
  public readonly langEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['languages']?.entries,
  );

  protected getValue(): KeywordsPart {
    let part = this.getEditedPart(KEYWORDS_PART_TYPEID) as KeywordsPart;
    part.keywords = this._draft().keywords.map((k) => ({
      language: k.language,
      value: k.value,
    }));
    return part;
  }

  private setKeywords(keywords: Keyword[]): void {
    this.form.keywords().value.set(keywords);
    this.form.keywords().markAsDirty();
  }

  public addKeyword(): void {
    if (this.newForm().invalid()) {
      this.newForm().markAsTouched();
      return;
    }
    const keyword: Keyword = {
      language: this.newForm.language().value()!,
      value: this.newForm.text().value(),
    };
    const keywords = this.form.keywords().value();
    let i = 0;
    while (i < keywords.length) {
      const n = compareKeywords(keyword, keywords[i]);
      if (n === 0) {
        return;
      }
      if (n < 0) {
        break;
      }
      i++;
    }
    // insert in order
    const updated = [...keywords];
    updated.splice(i, 0, keyword);
    this.setKeywords(updated);
  }

  public deleteKeyword(keyword: Keyword): void {
    const keywords = [...this.form.keywords().value()];
    keywords.splice(keywords.indexOf(keyword), 1);
    this.setKeywords(keywords);
  }
}
