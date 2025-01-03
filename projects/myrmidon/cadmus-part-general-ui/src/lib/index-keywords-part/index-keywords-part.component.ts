import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

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
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { NgxToolsValidators } from '@myrmidon/ngx-tools';

import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  EditedObject,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import {
  IndexKeywordsPart,
  IndexKeyword,
  INDEX_KEYWORDS_PART_TYPEID,
} from '../index-keywords-part';
import { IndexKeywordComponent } from '../index-keyword/index-keyword.component';

/**
 * Index keywords part editor.
 * Thesauri: languages, keyword-indexes, keyword-tags.
 */
@Component({
  selector: 'cadmus-index-keywords-part',
  templateUrl: './index-keywords-part.component.html',
  styleUrls: ['./index-keywords-part.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatBadge,
    MatCardContent,
    MatButton,
    MatIconButton,
    MatTooltip,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    IndexKeywordComponent,
    MatCardActions,
    CloseSaveButtonsComponent,
  ],
})
export class IndexKeywordsPartComponent
  extends ModelEditorComponentBase<IndexKeywordsPart>
  implements OnInit
{
  public editedKeyword?: IndexKeyword;
  // thesaurus
  public idxEntries: ThesaurusEntry[] | undefined;
  public langEntries: ThesaurusEntry[] | undefined;
  public tagEntries: ThesaurusEntry[] | undefined;

  public keywords: FormControl<IndexKeyword[]>;

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.keywords = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
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
    let key = 'languages';
    if (this.hasThesaurus(key)) {
      this.langEntries = thesauri[key].entries;
    } else {
      this.langEntries = undefined;
    }
    key = 'keyword-indexes';
    if (this.hasThesaurus(key)) {
      this.idxEntries = thesauri[key].entries;
    } else {
      this.idxEntries = undefined;
    }
    key = 'keyword-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }
  }

  private compareKeywords(a: IndexKeyword, b: IndexKeyword): number {
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
    // indexId
    if (!a.indexId && b.indexId) {
      return -1;
    }
    if (a.indexId && !b.indexId) {
      return 1;
    }
    let n: number;
    if (a.indexId && b.indexId) {
      n = a.indexId.localeCompare(b.indexId);
      if (n !== 0) {
        return n;
      }
    }
    n = a.language.localeCompare(b.language);
    if (n !== 0) {
      return n;
    }
    return a.value.localeCompare(b.value);
  }

  private updateForm(part?: IndexKeywordsPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }

    const keywords: IndexKeyword[] = Object.assign([], part.keywords);
    keywords.sort(this.compareKeywords);
    this.keywords.setValue(keywords);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<IndexKeywordsPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): IndexKeywordsPart {
    let part = this.getEditedPart(
      INDEX_KEYWORDS_PART_TYPEID
    ) as IndexKeywordsPart;
    part.keywords = [...this.keywords.value];
    return part;
  }

  private addKeyword(keyword: IndexKeyword): boolean {
    let i = 0;
    while (i < this.keywords.value.length) {
      const n = this.compareKeywords(keyword, this.keywords.value[i]);
      if (n === 0) {
        return false;
      }
      if (n <= 0) {
        const keywords: IndexKeyword[] = Object.assign([], this.keywords.value);
        keywords.splice(i, 0, keyword);
        this.keywords.setValue(keywords);
        break;
      }
      i++;
    }
    if (i === this.keywords.value.length) {
      const keywords: IndexKeyword[] = Object.assign([], this.keywords.value);
      keywords.push(keyword);
      this.keywords.setValue(keywords);
    }

    this.keywords.markAsDirty();
    this.keywords.updateValueAndValidity();

    return true;
  }

  public addNewKeyword(): void {
    const keyword: IndexKeyword = {
      indexId: this.idxEntries?.length ? this.idxEntries[0].id : undefined,
      language: this.langEntries?.length ? this.langEntries[0].id : 'eng',
      value: '',
    };
    this.editKeyword(keyword);
  }

  public deleteKeyword(keyword: IndexKeyword): void {
    const keywords: IndexKeyword[] = [...this.keywords.value];
    keywords.splice(keywords.indexOf(keyword), 1);
    this.keywords.setValue(keywords);
    this.keywords.updateValueAndValidity();
    this.keywords.markAsDirty();
  }

  public editKeyword(keyword: IndexKeyword): void {
    this.editedKeyword = keyword;
  }

  public onKeywordClose(): void {
    this.editedKeyword = undefined;
  }

  public onKeywordSave(keyword: IndexKeyword): void {
    this.addKeyword(keyword);
    this.editedKeyword = undefined;
  }
}
