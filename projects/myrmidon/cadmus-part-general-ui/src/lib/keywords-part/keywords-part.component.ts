import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  Validators,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import { KeywordsPart, Keyword, KEYWORDS_PART_TYPEID } from '../keywords-part';
import { NgToolsValidators } from '@myrmidon/ng-tools';

/**
 * Keywords editor component.
 * Thesauri: languages.
 */
@Component({
  selector: 'cadmus-keywords-part',
  templateUrl: './keywords-part.component.html',
  styleUrls: ['./keywords-part.component.css'],
})
export class KeywordsPartComponent
  extends ModelEditorComponentBase<KeywordsPart>
  implements OnInit
{
  public keywords: FormControl<Keyword[]>;
  // new keyword form
  public newLanguage: FormControl<string | null>;
  public newValue: FormControl<string | null>;
  public newForm: FormGroup;
  // thesaurus
  public langEntries?: ThesaurusEntry[];

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.keywords = formBuilder.control([], {
      validators: NgToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
    // new keyword form
    this.newLanguage = formBuilder.control('eng', Validators.required);
    this.newValue = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(100),
    ]);
    this.newForm = formBuilder.group({
      newLanguage: this.newLanguage,
      newValue: this.newValue,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      keywords: this.keywords,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    const key = 'languages';
    if (this.hasThesaurus(key)) {
      this.langEntries = thesauri[key].entries;
    } else {
      this.langEntries = undefined;
    }
  }

  private compareKeywords(a: Keyword, b: Keyword): number {
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

  private updateForm(part?: KeywordsPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }

    const keywords = [...part.keywords];
    keywords.sort(this.compareKeywords);
    this.keywords.setValue(keywords);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<KeywordsPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): KeywordsPart {
    let part = this.getEditedPart(KEYWORDS_PART_TYPEID) as KeywordsPart;
    part.keywords = [...this.keywords.value];
    return part;
  }

  public addKeyword(): void {
    if (this.newForm.invalid) {
      return;
    }
    const keyword: Keyword = {
      language: this.newLanguage.value!,
      value: this.newValue.value!,
    };
    let i = 0;
    while (i < this.keywords.value?.length || 0) {
      const n = this.compareKeywords(keyword, this.keywords.value[i]);
      if (n === 0) {
        return;
      }
      if (n <= 0) {
        const keywords = [...this.keywords.value];
        keywords.splice(i, 0, keyword);
        this.keywords.setValue(keywords);
        this.keywords.updateValueAndValidity();
        this.keywords.markAsDirty();
        break;
      }
      i++;
    }
    if (i === this.keywords.value.length) {
      const keywords = [...this.keywords.value];
      keywords.push(keyword);
      this.keywords.setValue(keywords);
      this.keywords.updateValueAndValidity();
      this.keywords.markAsDirty();
    }
  }

  public deleteKeyword(keyword: Keyword): void {
    const keywords = [...this.keywords.value];
    keywords.splice(this.keywords.value.indexOf(keyword), 1);
    this.keywords.setValue(keywords);
    this.keywords.updateValueAndValidity();
    this.keywords.markAsDirty();
  }
}
