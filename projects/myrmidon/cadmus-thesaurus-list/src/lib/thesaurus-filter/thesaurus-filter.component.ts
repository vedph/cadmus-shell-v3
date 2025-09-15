import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { ThesaurusFilter } from '@myrmidon/cadmus-core';

import { ThesaurusListRepository } from '../state/thesaurus-list.repository';

@Component({
  selector: 'cadmus-thesaurus-filter',
  templateUrl: './thesaurus-filter.component.html',
  styleUrls: ['./thesaurus-filter.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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

  public id: FormControl<string>;
  public alias: FormControl<boolean>;
  public language: FormControl<string>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _repository: ThesaurusListRepository
  ) {
    this.filter$ = _repository.filter$;
    // form
    this.id = formBuilder.control<string>('id', { nonNullable: true });
    this.alias = formBuilder.control<boolean>(false, { nonNullable: true });
    this.language = formBuilder.control<string>('en', {
      nonNullable: true,
    });
    this.form = formBuilder.group({
      id: this.id,
      alias: this.alias,
      language: this.language,
    });
    // update form when filter changes
    this.filter$?.pipe(takeUntilDestroyed()).subscribe((f) => {
      this.updateForm(f);
    });
  }

  private updateForm(filter: ThesaurusFilter): void {
    this.id.setValue(filter.id || '');
    this.alias.setValue(filter.isAlias || false);
    this.language.setValue(filter.language || 'en');
    this.form.markAsPristine();
  }

  private getFilter(): ThesaurusFilter {
    return {
      id: this.id.value,
      isAlias: this.alias.value || false,
      language: this.language.value,
    };
  }

  public reset(): void {
    this.form.reset();
    this.apply();
  }

  public apply(): void {
    if (this.form.invalid) {
      return;
    }
    const filter = this.getFilter();
    this._repository.setFilter(filter);
  }
}
