import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
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
import { FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';

import {
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    TitleCasePipe,
    FlatLookupPipe,
    IndexKeywordComponent,
    MatCardActions,
    CloseSaveButtonsComponent,
  ],
})
export class IndexKeywordsPartComponent
  extends ModelEditorComponentBase<IndexKeywordsPart>
  implements OnInit
{
  public readonly editedKeyword = signal<IndexKeyword | undefined>(undefined);
  public readonly editedKeywordIndex = signal<number | undefined>(-1);

  // thesaurus
  public readonly idxEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  public readonly langEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

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
      this.langEntries.set(thesauri[key].entries);
    } else {
      this.langEntries.set(undefined);
    }
    key = 'keyword-indexes';
    if (this.hasThesaurus(key)) {
      this.idxEntries.set(thesauri[key].entries);
    } else {
      this.idxEntries.set(undefined);
    }
    key = 'keyword-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }
  }

  private updateForm(part?: IndexKeywordsPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }

    this.keywords.setValue(part.keywords || []);
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
      INDEX_KEYWORDS_PART_TYPEID,
    ) as IndexKeywordsPart;
    part.keywords = [...this.keywords.value];
    return part;
  }

  public addKeyword(): void {
    const entry: IndexKeyword = {
      language: this.langEntries()?.[0]?.id || '',
      value: '',
    };
    this.editedKeywordIndex.set(-1);
    this.editedKeyword.set(entry);
  }

  public editKeyword(entry: IndexKeyword, index: number): void {
    this.editedKeywordIndex.set(index);
    this.editedKeyword.set(structuredClone(entry));
  }

  public closeKeyword(): void {
    this.editedKeywordIndex.set(-1);
    this.editedKeyword.set(undefined);
  }

  public saveKeyword(entry: IndexKeyword): void {
    const entries = [...this.keywords.value];
    if (this.editedKeywordIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedKeywordIndex()!, 1, entry);
    }
    this.keywords.setValue(entries);
    this.keywords.markAsDirty();
    this.keywords.updateValueAndValidity();
    this.closeKeyword();
  }

  public deleteKeyword(index: number): void {
    if (this.editedKeywordIndex() === index) {
      this.closeKeyword();
    }
    const entries = [...this.keywords.value];
    entries.splice(index, 1);
    this.keywords.setValue(entries);
    this.keywords.markAsDirty();
    this.keywords.updateValueAndValidity();
  }

  public moveKeywordUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.keywords.value[index];
    const entries = [...this.keywords.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.keywords.setValue(entries);
    this.keywords.markAsDirty();
    this.keywords.updateValueAndValidity();
    // keep editedKeywordIndex in sync
    if (this.editedKeywordIndex() === index) {
      this.editedKeywordIndex.set(index - 1);
    } else if (this.editedKeywordIndex() === index - 1) {
      this.editedKeywordIndex.set(index);
    }
  }

  public moveKeywordDown(index: number): void {
    if (index + 1 >= this.keywords.value.length) {
      return;
    }
    const entry = this.keywords.value[index];
    const entries = [...this.keywords.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.keywords.setValue(entries);
    this.keywords.markAsDirty();
    this.keywords.updateValueAndValidity();
    // keep editedKeywordIndex in sync
    if (this.editedKeywordIndex() === index) {
      this.editedKeywordIndex.set(index + 1);
    } else if (this.editedKeywordIndex() === index + 1) {
      this.editedKeywordIndex.set(index);
    }
  }
}
