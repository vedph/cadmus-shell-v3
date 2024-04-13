import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  Validators,
  FormArray,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import {
  EditedObject,
  ModelEditorComponentBase,
  renderLabelFromLastColon,
} from '@myrmidon/cadmus-ui';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';

import { Comment, CommentPart, COMMENT_PART_TYPEID } from '../comment-part';
import { IndexKeyword } from '../index-keywords-part';
import { CommentFragment } from '../comment-fragment';

/**
 * Comment part/fragment editor component.
 * Thesauri: comment-tags, doc-reference-tags, doc-reference-types, comment-categories,
 * languages, keyword-indexes, keyword-tags, comment-id-scopes, comment-id-tags,
 * assertion-tags, pin-link-settings.
 */
@Component({
  selector: 'cadmus-comment-editor',
  templateUrl: './comment-editor.component.html',
  styleUrls: ['./comment-editor.component.css'],
})
export class CommentEditorComponent
  extends ModelEditorComponentBase<CommentPart | CommentFragment>
  implements OnInit, OnDestroy
{
  // Monaco
  private readonly _disposables: monaco.IDisposable[] = [];
  private _editorModel?: monaco.editor.ITextModel;
  private _editor?: monaco.editor.IStandaloneCodeEditor;

  public tag: FormControl<string | null>;
  public text: FormControl<string | null>;
  public references: FormControl<DocReference[]>;
  public links: FormControl<AssertedCompositeId[]>;
  public categories: FormControl<ThesaurusEntry[]>;
  public keywords: FormArray;

  // comment-tags
  public comTagEntries: ThesaurusEntry[] | undefined;
  // doc-reference-tags
  public refTagEntries: ThesaurusEntry[] | undefined;
  // doc-reference-types
  public refTypeEntries: ThesaurusEntry[] | undefined;
  // comment-categories
  public catEntries: ThesaurusEntry[] | undefined;
  // languages
  public langEntries: ThesaurusEntry[] | undefined;
  // keyword-indexes
  public idxEntries: ThesaurusEntry[] | undefined;
  // keyword-tags
  public keyTagEntries: ThesaurusEntry[] | undefined;
  // comment-id-scopes
  public idScopeEntries: ThesaurusEntry[] | undefined;
  // comment-id-tags
  public idTagEntries: ThesaurusEntry[] | undefined;
  // assertion-tags
  public assTagEntries: ThesaurusEntry[] | undefined;
  // pin-link-settings; these include:
  // - by-type: true/false
  // - switch-mode: true/false
  // - edit-target: true/false
  public setTagEntries?: ThesaurusEntry[];

  // settings
  // by-type: true/false
  public pinByTypeMode?: boolean;
  // switch-mode: true/false
  public canSwitchMode?: boolean;
  // edit-target: true/false
  public canEditTarget?: boolean;

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
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
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  public override ngOnDestroy() {
    super.ngOnDestroy();
    this._disposables.forEach((d) => d.dispose());
  }

  public onCreateEditor(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._editorModel =
      this._editorModel ||
      monaco.editor.createModel(this.text?.value || '', 'markdown');
    editor.setModel(this._editorModel);
    this._editor = editor as monaco.editor.IStandaloneCodeEditor;

    this._disposables.push(
      this._editorModel.onDidChangeContent((e) => {
        this.text.setValue(this._editorModel!.getValue());
        this.text.markAsDirty();
        this.text.updateValueAndValidity();
      })
    );
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

  /**
   * Load settings from thesaurus entries.
   *
   * @param entries The thesaurus entries if any.
   */
  private loadSettings(entries?: ThesaurusEntry[]): void {
    if (!entries?.length) {
      this.pinByTypeMode = undefined;
      this.canSwitchMode = undefined;
      this.canEditTarget = undefined;
    }
    this.pinByTypeMode =
      entries?.find((e) => e.id === 'by-type')?.value === 'true';
    this.canSwitchMode =
      entries?.find((e) => e.id === 'switch-mode')?.value === 'true';
    this.canEditTarget =
      entries?.find((e) => e.id === 'edit-target')?.value === 'true';
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'comment-tags';
    if (this.hasThesaurus(key)) {
      this.comTagEntries = thesauri[key].entries;
    } else {
      this.comTagEntries = undefined;
    }

    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries = thesauri[key].entries;
    } else {
      this.refTagEntries = undefined;
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries = thesauri[key].entries;
    } else {
      this.refTypeEntries = undefined;
    }

    key = 'comment-categories';
    if (this.hasThesaurus(key)) {
      this.catEntries = thesauri[key].entries;
    } else {
      this.catEntries = undefined;
    }

    key = 'languages';
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
      this.keyTagEntries = thesauri[key].entries;
    } else {
      this.keyTagEntries = undefined;
    }

    key = 'comment-id-scopes';
    if (this.hasThesaurus(key)) {
      this.idScopeEntries = thesauri[key].entries;
    } else {
      this.idScopeEntries = undefined;
    }

    key = 'comment-id-tags';
    if (this.hasThesaurus(key)) {
      this.idTagEntries = thesauri[key].entries;
    } else {
      this.idTagEntries = undefined;
    }
    key = 'assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assTagEntries = thesauri[key].entries;
    } else {
      this.assTagEntries = undefined;
    }
    // load settings from thesaurus
    this.loadSettings(thesauri['pin-link-settings']?.entries);
  }

  private updateForm(part?: CommentPart | CommentFragment | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.tag.setValue(part.tag || null);
    this.text.setValue(part.text);
    this._editorModel?.setValue(part.text || '');
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
        const entry = this.catEntries?.find((e) => e.id === id);
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
    data?: EditedObject<CommentPart | CommentFragment>
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
    if ((this.data!.value as CommentFragment)?.location) {
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
      this.categories.value || []
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
        Validators.maxLength(50)
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
