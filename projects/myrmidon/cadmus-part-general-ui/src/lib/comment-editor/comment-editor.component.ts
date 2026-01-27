import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  Optional,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormBuilder,
  Validators,
  FormArray,
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
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
} from '@angular/material/expansion';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  DocReference,
  DocReferencesComponent,
} from '@myrmidon/cadmus-refs-doc-references';
import {
  AssertedCompositeId,
  AssertedCompositeIdsComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';
import {
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CadmusTextEdBindings,
  CadmusTextEdService,
} from '@myrmidon/cadmus-text-ed';

import {
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import { Comment, CommentPart, COMMENT_PART_TYPEID } from '../comment-part';
import { MonacoEditorHelper } from '../monaco-editor-helper';
import {
  renderLabelFromLastColon,
  ThesaurusTreeComponent,
} from '@myrmidon/cadmus-thesaurus-store';

import { IndexKeyword } from '../index-keywords-part';
import { CommentFragment } from '../comment-fragment';

/**
 * Comment part/fragment editor component.
 * Thesauri: comment-tags, doc-reference-tags, doc-reference-types,
 * comment-categories, comment-keyword-languages, comment-keyword-indexes,
 * comment-keyword-tags, comment-id-scopes, comment-id-tags,
 * assertion-tags, asserted-id-features.
 */
@Component({
  selector: 'cadmus-comment-editor',
  templateUrl: './comment-editor.component.html',
  styleUrls: ['./comment-editor.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    MatTabGroup,
    MatTab,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatInput,
    MatError,
    NgeMonacoModule,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    NgeMarkdownModule,
    DocReferencesComponent,
    AssertedCompositeIdsComponent,
    MatIconButton,
    MatTooltip,
    MatButton,
    MatCardActions,
    ThesaurusTreeComponent,
    CloseSaveButtonsComponent,
  ],
  providers: [CadmusTextEdService],
})
export class CommentEditorComponent
  extends ModelEditorComponentBase<CommentPart | CommentFragment>
  implements OnInit, OnDestroy
{
  private _textHelper!: MonacoEditorHelper;

  // comment-tags
  public readonly comTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // doc-reference-tags
  public readonly refTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // doc-reference-types
  public readonly refTypeEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // comment-categories
  public readonly catEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // comment-keyword-languages
  public readonly langEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // comment-keyword-indexes
  public readonly idxEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // comment-keyword-tags
  public readonly keyTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // comment-id-scopes
  public readonly idScopeEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // comment-id-tags
  public readonly idTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // assertion-tags
  public readonly assTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  // asserted-id-features
  public readonly featureEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );

  public tag: FormControl<string | null>;
  public text: FormControl<string | null>;
  public references: FormControl<DocReference[]>;
  public links: FormControl<AssertedCompositeId[]>;
  public categories: FormControl<ThesaurusEntry[]>;
  public keywords: FormArray;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _editService: CadmusTextEdService,
    @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN)
    @Optional()
    private _editorBindings?: CadmusTextEdBindings,
  ) {
    super(authService, formBuilder);
    // form
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.text = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50000),
    ]);
    this.references = formBuilder.control([], { nonNullable: true });
    this.links = formBuilder.control([], { nonNullable: true });
    this.categories = formBuilder.control([], { nonNullable: true });
    this.keywords = formBuilder.array([]);
    // Monaco helper
    this._textHelper = new MonacoEditorHelper(this.text, 'markdown');
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  public override ngOnDestroy() {
    super.ngOnDestroy();
    this._textHelper.dispose();
  }

  private async applyEdit(selector: string) {
    const editor = this._textHelper.editor;
    if (!editor) {
      return;
    }
    const selection = editor.getSelection();
    const text = selection
      ? editor.getModel()!.getValueInRange(selection)
      : '';

    const result = await this._editService.edit({
      selector,
      text: text,
    });

    editor.executeEdits('my-source', [
      {
        range: selection!,
        text: result.text,
        forceMoveMarkers: true,
      },
    ]);
  }

  public onCreateEditor(editor: monaco.editor.IEditor) {
    this._textHelper.initEditor(editor);

    // plugins
    if (this._editorBindings) {
      this._textHelper.addBindings(this._editorBindings, (selector) => {
        this.applyEdit(selector);
      });
    }
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      tag: this.tag,
      text: this.text,
      references: this.references,
      ids: this.links,
      categories: this.categories,
      keywords: this.keywords,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'comment-tags';
    if (this.hasThesaurus(key)) {
      this.comTagEntries.set(thesauri[key].entries);
    } else {
      this.comTagEntries.set(undefined);
    }

    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries.set(thesauri[key].entries);
    } else {
      this.refTagEntries.set(undefined);
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries.set(thesauri[key].entries);
    } else {
      this.refTypeEntries.set(undefined);
    }

    key = 'comment-categories';
    if (this.hasThesaurus(key)) {
      this.catEntries.set(thesauri[key].entries);
    } else {
      this.catEntries.set(undefined);
    }

    key = 'comment-keyword-languages';
    if (this.hasThesaurus(key)) {
      this.langEntries.set(thesauri[key].entries);
    } else {
      this.langEntries.set(undefined);
    }

    key = 'comment-keyword-indexes';
    if (this.hasThesaurus(key)) {
      this.idxEntries.set(thesauri[key].entries);
    } else {
      this.idxEntries.set(undefined);
    }

    key = 'comment-keyword-tags';
    if (this.hasThesaurus(key)) {
      this.keyTagEntries.set(thesauri[key].entries);
    } else {
      this.keyTagEntries.set(undefined);
    }

    key = 'comment-id-scopes';
    if (this.hasThesaurus(key)) {
      this.idScopeEntries.set(thesauri[key].entries);
    } else {
      this.idScopeEntries.set(undefined);
    }

    key = 'comment-id-tags';
    if (this.hasThesaurus(key)) {
      this.idTagEntries.set(thesauri[key].entries);
    } else {
      this.idTagEntries.set(undefined);
    }
    key = 'assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assTagEntries.set(thesauri[key].entries);
    } else {
      this.assTagEntries.set(undefined);
    }
    key = 'asserted-id-features';
    if (this.hasThesaurus(key)) {
      this.featureEntries.set(thesauri[key].entries);
    } else {
      this.featureEntries.set(undefined);
    }
  }

  private updateForm(part?: CommentPart | CommentFragment | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.tag.setValue(part.tag || null);
    this.text.setValue(part.text);
    this._textHelper.setValue(part.text || '');
    this.references.setValue(part.references || []);
    this.links.setValue(part.links || []);
    // keywords
    this.keywords.clear();
    if (part.keywords?.length) {
      for (let keyword of part.keywords) {
        this.keywords.controls.push(this.getKeywordGroup(keyword));
      }
    }
    // categories
    if (part.categories?.length) {
      // map the category IDs to the corresponding thesaurus
      // entries, if any -- else just use the IDs
      const entries: ThesaurusEntry[] = part.categories.map((id) => {
        const entry = this.catEntries()?.find((e) => e.id === id);
        return entry
          ? entry
          : {
              id,
              value: id,
            };
      });
      // sort the entries by their display value
      entries.sort((a: ThesaurusEntry, b: ThesaurusEntry) => {
        return a.value.localeCompare(b.value);
      });
      // assign them to the control
      this.categories.setValue(entries || []);
    } else {
      this.categories.setValue([]);
    }

    this.form.markAsPristine();
  }

  protected override onDataSet(
    data?: EditedObject<CommentPart | CommentFragment>,
  ): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  private updateComment(comment: Comment): void {
    comment.tag = this.tag.value?.trim();
    comment.text = this.text.value?.trim() || '';
    comment.references = this.references.value?.length
      ? this.references.value
      : undefined;
    comment.links = this.links.value?.length ? this.links.value : undefined;
    comment.categories = this.categories.value?.length
      ? this.categories.value.map((entry: ThesaurusEntry) => {
          return entry.id;
        })
      : undefined;
    comment.keywords = this.getKeywords();
  }

  protected getValue(): CommentPart | CommentFragment {
    if ((this.data()!.value as CommentFragment)?.location) {
      let fr = this.getEditedFragment() as CommentFragment;
      this.updateComment(fr);
      return fr;
    } else {
      let part = this.getEditedPart(COMMENT_PART_TYPEID) as CommentPart;
      this.updateComment(part);
      return part;
    }
  }

  public onReferencesChange(references: DocReference[]): void {
    this.references.setValue(references || []);
    this.references.updateValueAndValidity();
    this.references.markAsDirty();
    this.form.markAsDirty();
  }

  public onIdsChange(ids: AssertedCompositeId[]): void {
    this.links.setValue(ids || []);
    this.links.updateValueAndValidity();
    this.links.markAsDirty();
    this.form.markAsDirty();
  }

  //#region Categories
  public onCategoryChange(entry: ThesaurusEntry): void {
    // add the new entry unless already present
    if (this.categories.value?.some((e: ThesaurusEntry) => e.id === entry.id)) {
      return;
    }
    const entries: ThesaurusEntry[] = Object.assign(
      [],
      this.categories.value || [],
    );
    entries.push(entry);

    // sort the entries by their display value
    entries.sort((a: ThesaurusEntry, b: ThesaurusEntry) => {
      return a.value.localeCompare(b.value);
    });

    // assign to the categories control
    this.categories.setValue(entries);
    this.categories.updateValueAndValidity();
    this.categories.markAsDirty();
  }

  public removeCategory(index: number): void {
    const entries = Object.assign([], this.categories.value);
    entries.splice(index, 1);
    this.categories.setValue(entries);
    this.categories.updateValueAndValidity();
    this.categories.markAsDirty();
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }
  //#endregion

  //#region Keywords
  private getKeywordGroup(keyword?: IndexKeyword): FormGroup {
    return this.formBuilder.group({
      indexId: this.formBuilder.control(
        keyword?.indexId,
        Validators.maxLength(50),
      ),
      tag: this.formBuilder.control(keyword?.tag, Validators.maxLength(50)),
      language: this.formBuilder.control(keyword?.language, [
        Validators.required,
        Validators.maxLength(50),
      ]),
      value: this.formBuilder.control(keyword?.value, [
        Validators.required,
        Validators.maxLength(50),
      ]),
      note: this.formBuilder.control(keyword?.note, Validators.maxLength(500)),
    });
  }

  public addKeyword(keyword?: IndexKeyword): void {
    this.keywords.push(this.getKeywordGroup(keyword));
    this.keywords.markAsDirty();
  }

  public removeKeyword(index: number): void {
    this.keywords.removeAt(index);
    this.keywords.markAsDirty();
  }

  public moveKeywordUp(index: number): void {
    if (index < 1) {
      return;
    }
    const keyword = this.keywords.controls[index];
    this.keywords.removeAt(index);
    this.keywords.insert(index - 1, keyword);
    this.keywords.markAsDirty();
  }

  public moveKeywordDown(index: number): void {
    if (index + 1 >= this.keywords.length) {
      return;
    }
    const keyword = this.keywords.controls[index];
    this.keywords.removeAt(index);
    this.keywords.insert(index + 1, keyword);
    this.keywords.markAsDirty();
  }

  private getKeywords(): IndexKeyword[] | undefined {
    const entries: IndexKeyword[] = [];
    for (let i = 0; i < this.keywords.length; i++) {
      const g = this.keywords.at(i) as FormGroup;
      entries.push({
        indexId: g.controls['indexId'].value?.trim(),
        tag: g.controls['tag'].value?.trim(),
        language: g.controls['language'].value?.trim(),
        value: g.controls['value'].value?.trim(),
        note: g.controls['note'].value?.trim(),
      });
    }
    return entries.length ? entries : undefined;
  }
  //#endregion
}
