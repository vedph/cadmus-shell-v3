import {
  Component,
  OnInit,
  OnDestroy,
  model,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  FormGroup,
  FormBuilder,
  FormControl,
  Validators,
  FormArray,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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

import { Keyword } from '../keywords-part';
import { BibEntry, BibAuthor } from '../bibliography-part';
import { BibAuthorsEditorComponent } from '../bib-authors-editor/bib-authors-editor.component';

/**
 * Bibliography entry editor used by BibliographyPartComponent to edit a single
 * entry in the bibliography part.
 */
@Component({
  selector: 'cadmus-bibliography-entry',
  templateUrl: './bibliography-entry.component.html',
  styleUrls: ['./bibliography-entry.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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
  ],
})
export class BibliographyEntryComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  public readonly entry = model<BibEntry>();

  // bibliography-languages
  public readonly langEntries = input<ThesaurusEntry[]>();
  // bibliography-types
  public readonly typeEntries = input<ThesaurusEntry[]>();
  // bibliography-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();
  // bibliography-author-roles
  public readonly roleEntries = input<ThesaurusEntry[]>();

  public readonly editorClose = output();

  // form - general
  public key: FormControl<string | null>;
  public type: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public language: FormControl<string | null>;
  public authors: FormArray;
  public title: FormControl<string | null>;
  public note: FormControl<string | null>;
  // form - container
  public contributors: FormArray;
  public container: FormControl<string | null>;
  public edition: FormControl<number | null>;
  public number: FormControl<string | null>;
  public publisher: FormControl<string | null>;
  public placePub: FormControl<string | null>;
  public yearPub: FormControl<number | null>;
  public location: FormControl<string | null>;
  public accessDate: FormControl<Date | null>;
  public firstPage: FormControl<number | null>;
  public lastPage: FormControl<number | null>;
  // form - keywords
  public readonly keywords = signal<Keyword[]>([]);
  public keyLanguage: FormControl<string | null>;
  public keyValue: FormControl<string | null>;
  public keyForm: FormGroup;

  public form: FormGroup;

  constructor(private _formBuilder: FormBuilder) {
    // form - general
    this.key = _formBuilder.control(null, Validators.maxLength(300));
    this.type = _formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
    ]);
    this.tag = _formBuilder.control(null, Validators.maxLength(50));
    this.language = _formBuilder.control(null, [
      Validators.required,
      Validators.pattern(/^[a-z]{3}$/),
    ]);
    this.authors = _formBuilder.array([], Validators.required);
    this.title = _formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(300),
    ]);
    this.note = _formBuilder.control(null, Validators.maxLength(1000));
    // form - container
    this.contributors = _formBuilder.array([]);
    this.container = _formBuilder.control(null, Validators.maxLength(300));
    this.edition = _formBuilder.control(null, [
      Validators.min(0),
      Validators.max(100),
    ]);
    this.number = _formBuilder.control(null, Validators.maxLength(50));
    this.publisher = _formBuilder.control(null, Validators.maxLength(100));
    this.placePub = _formBuilder.control(null, Validators.maxLength(100));
    this.yearPub = _formBuilder.control(null, [
      Validators.min(0),
      Validators.max(new Date().getFullYear()),
    ]);
    this.location = _formBuilder.control(null, Validators.maxLength(500));
    this.accessDate = _formBuilder.control(new Date());
    this.firstPage = _formBuilder.control(null, [
      Validators.min(0),
      Validators.max(10000),
    ]);
    this.lastPage = _formBuilder.control(null, [
      Validators.min(0),
      Validators.max(10000),
    ]);
    // form - keywords
    this.keyLanguage = _formBuilder.control(null, [
      Validators.required,
      Validators.pattern(/^[a-z]{3}$/),
    ]);
    this.keyValue = _formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(100),
    ]);
    this.keyForm = _formBuilder.group({
      keyLanguage: this.keyLanguage,
      keyValue: this.keyValue,
    });

    this.form = _formBuilder.group({
      key: this.key,
      type: this.type,
      tag: this.tag,
      language: this.language,
      authors: this.authors,
      title: this.title,
      note: this.note,
      contributors: this.contributors,
      container: this.container,
      edition: this.edition,
      number: this.number,
      publisher: this.publisher,
      placePub: this.placePub,
      yearPub: this.yearPub,
      location: this.location,
      accessDate: this.accessDate,
      firstPage: this.firstPage,
      lastPage: this.lastPage,
    });

    effect(() => {
      this.updateForm(this.entry());
    });
  }

  public ngOnInit(): void {
    // automatically set last page when first is set to something > 0
    // and last is not set
    this._sub = this.firstPage.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((_) => {
        if (
          this.firstPage.value &&
          this.lastPage.value &&
          this.lastPage.value < this.firstPage.value
        ) {
          this.lastPage.setValue(this.firstPage.value);
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private getAuthorGroup(author?: BibAuthor): FormGroup {
    return this._formBuilder.group({
      lastName: this._formBuilder.control(author?.lastName, [
        Validators.required,
        Validators.maxLength(50),
      ]),
      firstName: this._formBuilder.control(
        author?.firstName,
        Validators.maxLength(50)
      ),
      roleId: this._formBuilder.control(
        author?.roleId || null,
        Validators.maxLength(50)
      ),
    });
  }

  private setAuthors(authors: BibAuthor[], ctl: FormArray): void {
    if (!authors) {
      this.authors.reset();
      return;
    }
    for (let i = 0; i < authors.length; i++) {
      ctl.push(this.getAuthorGroup(authors[i]));
    }
    this.authors.markAsPristine();
  }

  private updateForm(entry?: BibEntry): void {
    if (!entry) {
      this.form.reset();
      return;
    }

    this.key.setValue(entry.key || null);
    this.type.setValue(entry.typeId);
    this.tag.setValue(entry.tag || null);
    this.language.setValue(entry.language);
    this.setAuthors(entry.authors || [], this.authors);
    this.title.setValue(entry.title);
    this.note.setValue(entry.note || null);
    this.setAuthors(entry.contributors || [], this.contributors);
    this.container.setValue(entry.container || null);
    this.edition.setValue(entry.edition || null);
    this.number.setValue(entry.number || null);
    this.publisher.setValue(entry.publisher || null);
    this.placePub.setValue(entry.placePub || null);
    this.yearPub.setValue(entry.yearPub || null);
    this.location.setValue(entry.location || null);
    this.accessDate.setValue(entry.accessDate || null);
    this.firstPage.setValue(entry.firstPage || null);
    this.lastPage.setValue(entry.lastPage || null);
    this.keywords.set(entry?.keywords || []);

    this.form.markAsPristine();
  }

  private getAuthors(ctl: FormArray): BibAuthor[] {
    const authors: BibAuthor[] = [];

    for (let i = 0; i < ctl.length; i++) {
      const g = ctl.at(i) as FormGroup;
      authors.push({
        lastName: g.controls['lastName'].value?.trim(),
        firstName: g.controls['firstName'].value?.trim(),
        roleId: g.controls['roleId'].value?.trim(),
      });
    }
    return authors.length ? authors : [];
  }

  private getEntry(): BibEntry {
    return {
      key: this.key.value?.trim(),
      typeId: this.type.value?.trim() || '',
      tag: this.tag.value?.trim(),
      language: this.language.value || '',
      authors: this.getAuthors(this.authors),
      title: this.title.value?.trim() || '',
      note: this.note.value?.trim(),
      contributors: this.getAuthors(this.contributors),
      container: this.container.value?.trim(),
      edition: this.edition.value || undefined,
      number: this.number.value?.trim(),
      publisher: this.publisher.value?.trim(),
      placePub: this.placePub.value?.trim(),
      yearPub: this.yearPub.value || undefined,
      location: this.location.value?.trim(),
      accessDate: this.accessDate.value || undefined,
      firstPage: this.firstPage.value || undefined,
      lastPage: this.lastPage.value || undefined,
      keywords: this.keywords.length ? this.keywords() : undefined,
    };
  }

  public addKeyword(): void {
    if (this.keyForm.invalid) {
      return;
    }
    if (
      !this.keywords().some(
        (k) =>
          k.language === this.keyLanguage.value &&
          k.value === this.keyValue.value
      )
    ) {
      const keywords = [...this.keywords()];
      keywords.push({
        language: this.keyLanguage.value!,
        value: this.keyValue.value!,
      });
      this.keywords.set(keywords);
      this.keyValue.reset();
      this.form.markAsDirty();
    }
  }

  public deleteKeyword(index: number): void {
    const keywords = [...this.keywords()];
    keywords.splice(index, 1);
    this.keywords.set(keywords);
    this.form.markAsDirty();
  }

  public moveKeywordUp(index: number): void {
    if (index < 1) {
      return;
    }
    const keywords = [...this.keywords()];
    const k = keywords[index];
    keywords.splice(index, 1);
    keywords.splice(index - 1, 0, k);
    this.keywords.set(keywords);
  }

  public moveKeywordDown(index: number): void {
    if (index + 1 >= this.keywords().length) {
      return;
    }
    const k = this.keywords()[index];
    const keywords = [...this.keywords()];
    keywords.splice(index, 1);
    keywords.splice(index + 1, 0, k);
    this.keywords.set(keywords);
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.entry.set(this.getEntry());
  }
}
