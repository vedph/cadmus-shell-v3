import { AsyncPipe } from '@angular/common';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

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

@Component({
  selector: 'cadmus-quotation-entry',
  templateUrl: './quotation-entry.component.html',
  styleUrls: ['./quotation-entry.component.css'],
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
    AsyncPipe,
  ],
})
export class QuotationEntryComponent implements OnInit {
  private _entry?: QuotationEntry;
  private _workDct: Record<string, ThesaurusEntry[]> | undefined;

  // list of authors, collected from _workDct
  public authors$: BehaviorSubject<ThesaurusEntry[]>;
  // list of selected author's works
  public authorWorks$: BehaviorSubject<ThesaurusEntry[]>;

  @Input()
  public get entry(): QuotationEntry | undefined {
    return this._entry;
  }
  public set entry(value: QuotationEntry | undefined) {
    if (this._entry === value) {
      return;
    }
    this._entry = value;
    this.updateForm(value);
  }

  @Input()
  public get workDictionary(): Record<string, ThesaurusEntry[]> | undefined {
    return this._workDct;
  }
  public set workDictionary(
    value: Record<string, ThesaurusEntry[]> | undefined
  ) {
    this._workDct = value;
    this.authors$.next(this._worksService.collectAuthors(value) || []);
    setTimeout(() => {
      this.loadAuthorWorks(this.author.value!);
    }, 700);
  }

  @Input()
  public tagEntries?: ThesaurusEntry[];

  @Output()
  public editorClose: EventEmitter<any>;
  @Output()
  public entryChange: EventEmitter<QuotationEntry>;

  public author: FormControl<string | null>;
  public work: FormControl<string | null>;
  public citation: FormControl<string | null>;
  public citationUri: FormControl<string | null>;
  public variant: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
    private _worksService: QuotationWorksService
  ) {
    // events
    this.editorClose = new EventEmitter<any>();
    this.entryChange = new EventEmitter<QuotationEntry>();

    this.authors$ = new BehaviorSubject<ThesaurusEntry[]>([]);
    this.authorWorks$ = new BehaviorSubject<ThesaurusEntry[]>([]);

    // form
    this.author = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
    ]);
    this.work = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(100),
    ]);
    this.citation = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
    ]);
    this.citationUri = formBuilder.control(null, Validators.maxLength(200));
    this.variant = formBuilder.control(null, Validators.maxLength(1000));
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.note = formBuilder.control(null, Validators.maxLength(1000));
    this.form = formBuilder.group({
      author: this.author,
      work: this.work,
      citation: this.citation,
      citationUri: this.citationUri,
      variant: this.variant,
      tag: this.tag,
      note: this.note,
    });
    // when author changes and we're using thesauri, get its works
    this.author.valueChanges.subscribe((id) => {
      if (this._workDct && id) {
        this.loadAuthorWorks(id);
      }
    });
  }

  ngOnInit(): void {}

  private loadAuthorWorks(authorId: string): void {
    if (!this._workDct) {
      return;
    }
    // const oldWorkId = this.work.value;
    const works: ThesaurusEntry[] = [];
    // in each dictionary the key is the author ID and the value is
    // an array where the 1st entry is the author, and all the others
    // his works. So here we skip the 1st entry.
    if (this._workDct[authorId]?.length > 1) {
      for (let i = 1; i < this._workDct[authorId].length; i++) {
        works.push(this._workDct[authorId][i]);
      }
    }
    this.authorWorks$.next(works);
  }

  private updateForm(entry?: QuotationEntry): void {
    if (!entry) {
      this.form.reset();
      return;
    }

    this.work.setValue(entry.work);
    this.author.setValue(entry.author);
    this.citation.setValue(entry.citation);
    this.citationUri.setValue(entry.citationUri || null);
    this.variant.setValue(entry.variant || null);
    this.tag.setValue(entry.tag || null);
    this.note.setValue(entry.note || null);

    this.form.markAsPristine();
  }

  private getEntry(): QuotationEntry {
    return {
      author: this.author.value?.trim() || '',
      work: this.work.value?.trim() || '',
      citation: this.citation.value?.trim() || '',
      citationUri: this.citationUri.value?.trim(),
      variant: this.variant.value?.trim(),
      tag: this.tag.value?.trim(),
      note: this.note.value?.trim(),
    };
  }

  public cancel(): void {
    if (this.form.pristine) {
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

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this._entry = this.getEntry();
    this.entryChange.emit(this._entry);
  }
}
