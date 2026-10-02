import {
  ChangeDetectionStrategy,
  Component,
  model,
  effect,
  input,
  output,
  signal,
  linkedSignal,
  untracked,
} from '@angular/core';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  FormField,
  form,
  max,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';

import { MatTabGroup, MatTab } from '@angular/material/tabs';
import {
  MatFormField,
  MatLabel,
  MatError,
  MatSuffix,
} from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import {
  MatDatepickerInput,
  MatDatepickerToggle,
  MatDatepicker,
} from '@angular/material/datepicker';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { FlatLookupPipe, NgxToolsSignalValidators } from '@myrmidon/ngx-tools';

import { Keyword } from '../keywords-part';
import { BibEntry, BibAuthor } from '../bibliography-part';
import { BibAuthorsEditorComponent } from '../bib-authors-editor/bib-authors-editor.component';
import {
  copyFormValue,
  isImplicitSubmission,
  setFieldFromChild,
} from '@myrmidon/cadmus-ui';

interface BibEntryControls {
  // general
  key: string;
  type: string;
  tag: string;
  language: string;
  authors: BibAuthor[];
  title: string;
  note: string;
  // container
  contributors: BibAuthor[];
  container: string;
  edition: number | null;
  number: string;
  publisher: string;
  placePub: string;
  yearPub: number | null;
  location: string;
  accessDate: Date | null;
  firstPage: number | null;
  lastPage: number | null;
  // keywords
  keywords: Keyword[];
}

interface NewKeywordControls {
  language: string;
  text: string;
}

function toDraft(entry?: BibEntry): BibEntryControls {
  return {
    key: entry?.key || '',
    type: entry?.typeId || '',
    tag: entry?.tag || '',
    language: entry?.language || '',
    authors: copyFormValue(entry?.authors || []),
    title: entry?.title || '',
    note: entry?.note || '',
    contributors: copyFormValue(entry?.contributors || []),
    container: entry?.container || '',
    edition: entry?.edition || null,
    number: entry?.number || '',
    publisher: entry?.publisher || '',
    placePub: entry?.placePub || '',
    yearPub: entry?.yearPub || null,
    location: entry?.location || '',
    accessDate: entry?.accessDate || null,
    firstPage: entry?.firstPage || null,
    lastPage: entry?.lastPage || null,
    keywords: copyFormValue(entry?.keywords || []),
  };
}

/**
 * Dumb bibliography entry editor component, used by BibliographyPartComponent
 * to edit a single entry in the bibliography part.
 * Thesauri: bibliography-languages, bibliography-types, bibliography-tags,
 * bibliography-author-roles.
 */
@Component({
  selector: 'cadmus-bibliography-entry',
  templateUrl: './bibliography-entry.component.html',
  styleUrls: ['./bibliography-entry.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatTabGroup,
    MatTab,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatInput,
    MatError,
    BibAuthorsEditorComponent,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatSuffix,
    MatDatepicker,
    MatButton,
    MatTooltip,
    MatIcon,
    MatIconButton,
    FlatLookupPipe,
  ],
})
export class BibliographyEntryComponent {
  /**
   * The bibliography entry to edit.
   */
  public readonly entry = model<BibEntry>();
  /**
   * The entry change event fired when the user saves the editing.
   */
  public readonly editorClose = output();

  // thesauri:
  // bibliography-languages
  public readonly langEntries = input<ThesaurusEntry[]>();
  // bibliography-types
  public readonly typeEntries = input<ThesaurusEntry[]>();
  // bibliography-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();
  // bibliography-author-roles
  public readonly roleEntries = input<ThesaurusEntry[]>();

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.entry()));
  public readonly form = form(this._draft, (p) => {
    // general
    maxLength(p.key, 300);
    required(p.type);
    maxLength(p.type, 50);
    maxLength(p.tag, 50);
    maxLength(p.language, 50);
    NgxToolsSignalValidators.strictMinLength(p.authors, 1);
    required(p.title);
    maxLength(p.title, 300);
    maxLength(p.note, 1000);
    // container
    maxLength(p.container, 300);
    min(p.edition, 0);
    max(p.edition, 100);
    maxLength(p.number, 50);
    maxLength(p.publisher, 100);
    maxLength(p.placePub, 100);
    min(p.yearPub, 0);
    max(p.yearPub, new Date().getFullYear());
    maxLength(p.location, 500);
    min(p.firstPage, 0);
    max(p.firstPage, 10000);
    min(p.lastPage, 0);
    max(p.lastPage, 10000);
  });

  // new keyword form
  private readonly _keyDraft = signal<NewKeywordControls>({
    language: '',
    text: '',
  });
  public readonly keyForm = form(this._keyDraft, (p) => {
    required(p.language);
    required(p.text);
    maxLength(p.text, 100);
  });

  constructor() {
    // a new entry was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.entry();
      untracked(() => this.form().reset());
    });

    // automatically set last page to first page when first is set to
    // something greater than last
    effect(() => {
      const first = this.form.firstPage().value();
      untracked(() => {
        const last = this.form.lastPage().value();
        if (first && last && last < first) {
          this.form.lastPage().value.set(first);
        }
      });
    });
  }

  private getEntry(): BibEntry {
    const draft = this._draft();
    return {
      key: draft.key.trim() || undefined,
      typeId: draft.type.trim(),
      tag: draft.tag.trim() || undefined,
      language: draft.language || undefined,
      authors: copyFormValue(draft.authors),
      title: draft.title.trim(),
      note: draft.note.trim() || undefined,
      contributors: draft.contributors.length
        ? copyFormValue(draft.contributors)
        : undefined,
      container: draft.container.trim() || undefined,
      edition: draft.edition || undefined,
      number: draft.number.trim() || undefined,
      publisher: draft.publisher.trim() || undefined,
      placePub: draft.placePub.trim() || undefined,
      yearPub: draft.yearPub || undefined,
      location: draft.location.trim() || undefined,
      accessDate: draft.accessDate || undefined,
      firstPage: draft.firstPage || undefined,
      lastPage: draft.lastPage || undefined,
      keywords: draft.keywords.length
        ? copyFormValue(draft.keywords)
        : undefined,
    };
  }

  public onAuthorsChange(authors: BibAuthor[]): void {
    setFieldFromChild(this.form.authors, copyFormValue(authors || []));
  }

  public onContributorsChange(contributors: BibAuthor[]): void {
    setFieldFromChild(
      this.form.contributors,
      copyFormValue(contributors || []),
    );
  }

  // #region Keywords
  private setKeywords(keywords: Keyword[]): void {
    this.form.keywords().value.set(keywords);
    this.form.keywords().markAsDirty();
  }

  public addKeyword(): void {
    if (this.keyForm().invalid()) {
      this.keyForm().markAsTouched();
      return;
    }
    const language = this.keyForm.language().value();
    const value = this.keyForm.text().value();
    const keywords = this.form.keywords().value();
    if (!keywords.some((k) => k.language === language && k.value === value)) {
      this.setKeywords([...keywords, { language, value }]);
      this.keyForm.text().value.set('');
      this.keyForm.text().reset();
    }
  }

  public deleteKeyword(index: number): void {
    const keywords = [...this.form.keywords().value()];
    keywords.splice(index, 1);
    this.setKeywords(keywords);
  }

  public moveKeywordUp(index: number): void {
    if (index < 1) {
      return;
    }
    const keywords = [...this.form.keywords().value()];
    const k = keywords[index];
    keywords.splice(index, 1);
    keywords.splice(index - 1, 0, k);
    this.setKeywords(keywords);
  }

  public moveKeywordDown(index: number): void {
    const keywords = [...this.form.keywords().value()];
    if (index + 1 >= keywords.length) {
      return;
    }
    const k = keywords[index];
    keywords.splice(index, 1);
    keywords.splice(index + 1, 0, k);
    this.setKeywords(keywords);
  }
  //#endregion

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
    this.save();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.entry.set(this.getEntry());
  }
}
