import {
  ChangeDetectionStrategy,
  Component,
  linkedSignal,
  WritableSignal,
} from '@angular/core';
import { FieldTree, FormField, form, maxLength } from '@angular/forms/signals';
import { Observable, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { ThesaurusFilter } from '@myrmidon/cadmus-core';

import { ThesaurusListRepository } from '../state/thesaurus-list.repository';

/**
 * The editable shape behind the filter form. Text fields use '' as their
 * empty value, as they are bound to native inputs.
 */
interface ThesaurusFilterControls {
  id: string;
  /** null for "any" (see the alias select). */
  alias: boolean | null;
  language: string;
}

/**
 * The values of a cleared filter form.
 */
function makeEmptyDraft(): ThesaurusFilterControls {
  return { id: '', alias: null, language: 'en' };
}

function toDraft(filter: ThesaurusFilter | undefined): ThesaurusFilterControls {
  return !filter
    ? makeEmptyDraft()
    : {
        id: filter.id || '',
        alias: filter.isAlias ?? null,
        language: filter.language || 'en',
      };
}

@Component({
  selector: 'cadmus-thesaurus-filter',
  templateUrl: './thesaurus-filter.component.html',
  styleUrls: ['./thesaurus-filter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
    MatIconButton,
    MatTooltip,
    MatIcon,
  ],
})
export class ThesaurusFilterComponent {
  public filter$: Observable<ThesaurusFilter>;

  /**
   * The editable draft: rebuilt from the repository filter whenever it
   * changes (including after apply), and locally edited in between.
   */
  private readonly _draft: WritableSignal<ThesaurusFilterControls>;

  public readonly form: FieldTree<ThesaurusFilterControls>;

  constructor(private _repository: ThesaurusListRepository) {
    this.filter$ = _repository.filter$;
    // like the old filter$?.pipe(...), tolerate a missing filter$
    const filter = toSignal(_repository.filter$ ?? of(undefined));
    this._draft = linkedSignal(() => toDraft(filter()));
    this.form = form(this._draft, (path) => {
      // [formField] renders these as the inputs' maxlength attributes
      maxLength(path.id, 100);
      maxLength(path.language, 2);
    });
  }

  private getFilter(): ThesaurusFilter {
    const v = this._draft();
    return {
      id: v.id,
      isAlias: v.alias ?? undefined,
      language: v.language,
    };
  }

  public reset(): void {
    this._draft.set(makeEmptyDraft());
    this.apply();
  }

  public apply(): void {
    if (this.form().invalid()) {
      return;
    }
    const filter = this.getFilter();
    this._repository.setFilter(filter);
  }
}
