import {
  ChangeDetectionStrategy,
  Component,
  model,
  effect,
  output,
  input,
  computed,
  linkedSignal,
  untracked,
} from '@angular/core';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { QuotationWorksService } from '../quotations-fragment/quotation-works.service';
import { QuotationEntry } from '../quotations-fragment';
import { isImplicitSubmission } from '@myrmidon/cadmus-ui';

interface QuotationEntryControls {
  author: string;
  work: string;
  citation: string;
  citationUri: string;
  variant: string;
  tag: string;
  note: string;
}

function toDraft(entry?: QuotationEntry): QuotationEntryControls {
  return {
    author: entry?.author || '',
    work: entry?.work || '',
    citation: entry?.citation || '',
    citationUri: entry?.citationUri || '',
    variant: entry?.variant || '',
    tag: entry?.tag || '',
    note: entry?.note || '',
  };
}

@Component({
  selector: 'cadmus-quotation-entry',
  templateUrl: './quotation-entry.component.html',
  styleUrls: ['./quotation-entry.component.css'],
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
export class QuotationEntryComponent {
  public readonly entry = model<QuotationEntry>();
  public readonly workDictionary = input<Record<string, ThesaurusEntry[]>>();
  public readonly tagEntries = input<ThesaurusEntry[]>();
  public readonly editorClose = output();

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.entry()));
  public readonly form = form(this._draft, (p) => {
    required(p.author);
    maxLength(p.author, 50);
    required(p.work);
    maxLength(p.work, 100);
    required(p.citation);
    maxLength(p.citation, 50);
    maxLength(p.citationUri, 200);
    maxLength(p.variant, 1000);
    maxLength(p.tag, 50);
    maxLength(p.note, 1000);
  });

  /**
   * The authors, collected from the works dictionary, if any.
   */
  public readonly authors = computed<ThesaurusEntry[]>(
    () => this._worksService.collectAuthors(this.workDictionary()) || [],
  );

  /**
   * The works of the selected author, from the works dictionary, if any.
   * In the dictionary the key is the author ID and the value is an array
   * where the 1st entry is the author, and all the others his works.
   */
  public readonly authorWorks = computed<ThesaurusEntry[]>(() => {
    const dct = this.workDictionary();
    const authorId = this.form.author().value();
    if (!dct || !authorId || !(dct[authorId]?.length > 1)) {
      return [];
    }
    return dct[authorId].slice(1);
  });

  constructor(
    private _dialogService: DialogService,
    private _worksService: QuotationWorksService,
  ) {
    // a new entry was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.entry();
      untracked(() => this.form().reset());
    });
  }

  private getEntry(): QuotationEntry {
    const draft = this._draft();
    return {
      author: draft.author.trim(),
      work: draft.work.trim(),
      citation: draft.citation.trim(),
      citationUri: draft.citationUri.trim() || undefined,
      variant: draft.variant.trim() || undefined,
      tag: draft.tag.trim() || undefined,
      note: draft.note.trim() || undefined,
    };
  }

  public cancel(): void {
    if (!this.form().dirty()) {
      this.editorClose.emit();
      return;
    }

    this._dialogService
      .confirm('Confirm Close', 'Drop entry changes?')
      .subscribe((result) => {
        if (result) {
          this.editorClose.emit();
        }
      });
  }

  /**
   * Handle Enter in this editor: in a text input, save as the save button
   * would, when enabled. This replaces the implicit submission of the form
   * this editor used to render.
   * @param event The keydown event.
   */
  public onEnterKey(event: Event): void {
    if (
      !isImplicitSubmission(event) ||
      this.form().invalid() ||
      !this.form().dirty()
    ) {
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
