import {
  ChangeDetectionStrategy,
  Component,
  model,
  effect,
  output,
  input,
  linkedSignal,
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  pattern,
  required,
} from '@angular/forms/signals';

import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { IndexKeyword } from '../index-keywords-part';
import { isImplicitSubmission } from '../signal-form-utils';

interface IndexKeywordControls {
  indexId: string;
  language: string;
  value: string;
  note: string;
  tag: string;
}

function toDraft(keyword?: IndexKeyword): IndexKeywordControls {
  return {
    indexId: keyword?.indexId || '',
    language: keyword?.language || '',
    value: keyword?.value || '',
    note: keyword?.note || '',
    tag: keyword?.tag || '',
  };
}

/**
 * Index keyword editor component.
 * Thesauri: index-keywords, index-keyword-tags, languages (all optional).
 */
@Component({
  selector: 'cadmus-index-keyword',
  templateUrl: './index-keyword.component.html',
  styleUrls: ['./index-keyword.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatInput,
    MatError,
    MatIconButton,
    MatTooltip,
    MatIcon,
  ],
})
export class IndexKeywordComponent {
  public readonly keyword = model<IndexKeyword>();

  // thesauri:
  // index-keywords
  public readonly idxEntries = input<ThesaurusEntry[]>();
  // index-keyword-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();
  // languages
  public readonly langEntries = input<ThesaurusEntry[]>();

  public readonly noIndexId = input<boolean>();

  public readonly editorClose = output();

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.keyword()));
  public readonly form = form(this._draft, (p) => {
    maxLength(p.indexId, 50);
    pattern(p.indexId, /^[-.a-zA-Z0-9_]{0,50}$/);
    required(p.value);
    maxLength(p.value, 100);
    maxLength(p.note, 200);
    maxLength(p.tag, 100);
  });

  constructor() {
    // a new keyword was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.keyword();
      untracked(() => this.form().reset());
    });
  }

  private getKeyword(): IndexKeyword {
    const draft = this._draft();
    return {
      indexId: draft.indexId.trim() || undefined,
      language: draft.language.trim(),
      value: draft.value.trim(),
      note: draft.note.trim() || undefined,
      tag: draft.tag.trim() || undefined,
    };
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  /**
   * Handle Enter in this editor: in a text input, save as the save button
   * would, when enabled. This replaces the implicit submission of the form
   * this editor used to render.
   * @param event The keydown event.
   */
  public onEnterKey(event: Event): void {
    if (!isImplicitSubmission(event) || this.form().invalid()) {
      return;
    }
    event.preventDefault();
    this.submit();
  }

  public submit(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    const keyword = this.getKeyword();
    this.keyword.set(keyword);
  }
}
