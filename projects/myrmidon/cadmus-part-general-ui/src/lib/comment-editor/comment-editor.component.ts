import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Optional,
  inject,
  signal,
  computed,
  linkedSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  FormField,
  applyEach,
  maxLength,
  required,
} from '@angular/forms/signals';
import { debounceTime } from 'rxjs/operators';
import { marked } from 'marked';

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

import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';

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

import { ThesaurusEntry, EditedObject } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';

import { Comment, CommentPart, COMMENT_PART_TYPEID } from '../comment-part';
import { MonacoEditorHelper } from '../monaco-editor-helper';
import {
  renderLabelFromLastColon,
  ThesaurusTreeComponent,
} from '@myrmidon/cadmus-thesaurus-store';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

import { IndexKeyword } from '../index-keywords-part';
import { CommentFragment } from '../comment-fragment';
import { copyFormValue } from '../signal-form-utils';

interface CommentPartSettings {
  lookupProviderOptions?: LookupProviderOptions;
}

interface KeywordRow {
  indexId: string;
  tag: string;
  language: string;
  value: string;
  note: string;
}

interface CommentEditorControls {
  tag: string;
  text: string;
  references: DocReference[];
  links: AssertedCompositeId[];
  categories: ThesaurusEntry[];
  keywords: KeywordRow[];
}

function toKeywordRow(keyword?: IndexKeyword): KeywordRow {
  return {
    indexId: keyword?.indexId || '',
    tag: keyword?.tag || '',
    language: keyword?.language || '',
    value: keyword?.value || '',
    note: keyword?.note || '',
  };
}

function sortEntries(entries: ThesaurusEntry[]): ThesaurusEntry[] {
  return entries.sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * Bound data -> editable draft. The category IDs are mapped to the
 * corresponding entries of the comment-categories thesaurus, if any (else
 * to entries whose value is their ID), sorted by their display value.
 */
function toDraft(
  data?: EditedObject<CommentPart | CommentFragment>,
): CommentEditorControls {
  const comment = data?.value;
  const catEntries = data?.thesauri?.['comment-categories']?.entries;
  return {
    tag: comment?.tag || '',
    text: comment?.text || '',
    references: copyFormValue(comment?.references || []),
    links: copyFormValue(comment?.links || []),
    categories: sortEntries(
      (comment?.categories || []).map((id) => {
        const entry = catEntries?.find((e) => e.id === id);
        return entry ? { id: entry.id, value: entry.value } : { id, value: id };
      }),
    ),
    keywords: (comment?.keywords || []).map((k) => toKeywordRow(k)),
  };
}

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
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
    NgxMonacoEditorComponent,
    MatExpansionPanel,
    MatExpansionPanelHeader,
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
export class CommentEditorComponent extends ModelEditorComponentBase<
  CommentPart | CommentFragment
> {
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _textHelper = new MonacoEditorHelper();

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };
  public readonly previewHtml = signal<SafeHtml>('');

  // thesauri:
  // comment-tags
  public readonly comTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['comment-tags']?.entries,
  );
  // doc-reference-tags
  public readonly refTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-tags']?.entries,
  );
  // doc-reference-types
  public readonly refTypeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-types']?.entries,
  );
  // comment-categories
  public readonly catEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['comment-categories']?.entries,
  );
  // comment-keyword-languages
  public readonly langEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['comment-keyword-languages']?.entries,
  );
  // comment-keyword-indexes
  public readonly idxEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['comment-keyword-indexes']?.entries,
  );
  // comment-keyword-tags
  public readonly keyTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['comment-keyword-tags']?.entries,
  );
  // comment-id-scopes
  public readonly idScopeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['comment-id-scopes']?.entries,
  );
  // comment-id-tags
  public readonly idTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['comment-id-tags']?.entries,
  );
  // assertion-tags
  public readonly assTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['assertion-tags']?.entries,
  );
  // asserted-id-features
  public readonly featureEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['asserted-id-features']?.entries,
  );
  // lookup options depending on role
  public readonly lookupProviderOptions = signal<
    LookupProviderOptions | undefined
  >(undefined);

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()));
  public readonly form = this.createForm(this._draft, (p) => {
    maxLength(p.tag, 50);
    required(p.text);
    maxLength(p.text, 50000);
    applyEach(p.keywords, (k) => {
      maxLength(k.indexId, 50);
      maxLength(k.tag, 50);
      required(k.language);
      maxLength(k.language, 50);
      required(k.value);
      maxLength(k.value, 50);
      maxLength(k.note, 500);
    });
  });

  constructor(
    private _editService: CadmusTextEdService,
    @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN)
    @Optional()
    private _editorBindings?: CadmusTextEdBindings,
  ) {
    super();
    // settings
    this.initSettings<CommentPartSettings>(COMMENT_PART_TYPEID, (settings) => {
      this.lookupProviderOptions.set(
        settings?.lookupProviderOptions || undefined,
      );
    });
    // preview
    toObservable(this.form.text().value)
      .pipe(debounceTime(50), takeUntilDestroyed())
      .subscribe((text) => this.updatePreview(text));
  }

  private updatePreview(text: string): void {
    const html = marked.parse(text || '', { async: false }) as string;
    this.previewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
  }

  private async applyEdit(selector: string) {
    const editor = this._textHelper.editor;
    if (!editor) {
      return;
    }
    const selection = editor.getSelection();
    const text = selection ? editor.getModel()!.getValueInRange(selection) : '';

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

  public onEditorInit(event: EditorInitializedEvent): void {
    this._textHelper.initEditor(event);

    // plugins
    if (this._editorBindings) {
      this._textHelper.addBindings(this._editorBindings, (selector) => {
        this.applyEdit(selector);
      });
    }
  }

  private updateComment(comment: Comment): void {
    const draft = this._draft();
    comment.tag = draft.tag.trim() || undefined;
    comment.text = draft.text.trim();
    comment.references = draft.references.length
      ? copyFormValue(draft.references)
      : undefined;
    comment.links = draft.links.length ? copyFormValue(draft.links) : undefined;
    comment.categories = draft.categories.length
      ? draft.categories.map((entry) => entry.id)
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
    this.form.references().value.set(copyFormValue(references || []));
    this.form.references().markAsDirty();
  }

  public onIdsChange(ids: AssertedCompositeId[]): void {
    this.form.links().value.set(copyFormValue(ids || []));
    this.form.links().markAsDirty();
  }

  //#region Categories
  private setCategories(entries: ThesaurusEntry[]): void {
    this.form.categories().value.set(entries);
    this.form.categories().markAsDirty();
  }

  public onCategoryChange(entry: ThesaurusEntry): void {
    const categories = this.form.categories().value();
    // add the new entry unless already present
    if (categories.some((e) => e.id === entry.id)) {
      return;
    }
    // sort the entries by their display value
    this.setCategories(
      sortEntries([...categories, { id: entry.id, value: entry.value }]),
    );
  }

  public removeCategory(index: number): void {
    const entries = [...this.form.categories().value()];
    entries.splice(index, 1);
    this.setCategories(entries);
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }
  //#endregion

  //#region Keywords
  private setKeywords(rows: KeywordRow[]): void {
    this.form.keywords().value.set(rows);
    this.form.keywords().markAsDirty();
  }

  public addKeyword(keyword?: IndexKeyword): void {
    this.setKeywords([...this.form.keywords().value(), toKeywordRow(keyword)]);
  }

  public removeKeyword(index: number): void {
    const rows = [...this.form.keywords().value()];
    rows.splice(index, 1);
    this.setKeywords(rows);
  }

  public moveKeywordUp(index: number): void {
    if (index < 1) {
      return;
    }
    const rows = [...this.form.keywords().value()];
    const row = rows[index];
    rows.splice(index, 1);
    rows.splice(index - 1, 0, row);
    this.setKeywords(rows);
  }

  public moveKeywordDown(index: number): void {
    const rows = [...this.form.keywords().value()];
    if (index + 1 >= rows.length) {
      return;
    }
    const row = rows[index];
    rows.splice(index, 1);
    rows.splice(index + 1, 0, row);
    this.setKeywords(rows);
  }

  private getKeywords(): IndexKeyword[] | undefined {
    const entries: IndexKeyword[] = this._draft().keywords.map((k) => ({
      indexId: k.indexId.trim() || undefined,
      tag: k.tag.trim() || undefined,
      language: k.language.trim(),
      value: k.value.trim(),
      note: k.note.trim() || undefined,
    }));
    return entries.length ? entries : undefined;
  }
  //#endregion
}
