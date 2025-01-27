import { Component, OnInit, Input, EventEmitter, Output, model, effect, output, input } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { IndexKeyword } from '../index-keywords-part';

@Component({
  selector: 'cadmus-index-keyword',
  templateUrl: './index-keyword.component.html',
  styleUrls: ['./index-keyword.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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

  public readonly idxEntries = input<ThesaurusEntry[]>();
  public readonly tagEntries = input<ThesaurusEntry[]>();
  public readonly langEntries = input<ThesaurusEntry[]>();

  public readonly editorClose = output();

  public indexId: FormControl<string | null>;
  public language: FormControl<string | null>;
  public value: FormControl<string | null>;
  public note: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.indexId = formBuilder.control(null, [
      Validators.maxLength(50),
      Validators.pattern(/^[-.a-zA-Z0-9_]{0,50}$/),
    ]);
    this.language = formBuilder.control(null, [
      Validators.pattern(/^[a-z]{3}$/),
    ]);
    this.value = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(100),
    ]);
    this.note = formBuilder.control(null, Validators.maxLength(200));
    this.tag = formBuilder.control(null, Validators.maxLength(100));
    this.form = formBuilder.group({
      indexId: this.indexId,
      language: this.language,
      value: this.value,
      note: this.note,
      tag: this.tag,
    });

    effect(() => {
      this.updateForm(this.keyword());
    });
  }

  private updateForm(keyword?: IndexKeyword): void {
    if (!keyword) {
      this.form.reset();
      return;
    }
    this.indexId.setValue(keyword.indexId || null);
    this.language.setValue(keyword.language);
    this.value.setValue(keyword.value);
    this.note.setValue(keyword.note || null);
    this.tag.setValue(keyword.tag || null);
    this.form.markAsPristine();
  }

  private getKeyword(): IndexKeyword {
    return {
      indexId: this.indexId.value?.trim(),
      language: this.language.value?.trim() || '',
      value: this.value.value?.trim() || '',
      note: this.note.value?.trim(),
      tag: this.tag.value?.trim(),
    };
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.keyword.set(this.getKeyword());
  }
}
