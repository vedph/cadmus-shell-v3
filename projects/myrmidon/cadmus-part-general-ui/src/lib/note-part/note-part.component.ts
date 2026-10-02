import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Optional,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormField, maxLength, required } from '@angular/forms/signals';
import { debounceTime } from 'rxjs/operators';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';

import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  setFieldFromEditor,
} from '@myrmidon/cadmus-ui';
import {
  CadmusTextEdService,
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CadmusTextEdBindings,
} from '@myrmidon/cadmus-text-ed';

import { NotePart, NOTE_PART_TYPEID } from '../note-part';
import { MonacoEditorHelper } from '../monaco-editor-helper';
import { marked } from 'marked';

interface NotePartControls {
  tag: string;
  text: string;
}

function toDraft(part?: NotePart | null): NotePartControls {
  return {
    tag: part?.tag || '',
    text: part?.text || '',
  };
}

/**
 * Note part editor component.
 * Thesauri: optionally "note-tags", when you want to use a closed set of tags.
 */
@Component({
  selector: 'cadmus-note-part',
  templateUrl: './note-part.component.html',
  styleUrls: ['./note-part.component.css'],
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
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    TitleCasePipe,
    NgxMonacoEditorComponent,
    MatCardActions,
    CloseSaveButtonsComponent,
  ],
  providers: [CadmusTextEdService],
})
export class NotePartComponent extends ModelEditorComponentBase<NotePart> {
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _textHelper = new MonacoEditorHelper();

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };
  public readonly previewHtml = signal<SafeHtml>('');

  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    maxLength(p.tag, 100);
    required(p.text);
  });

  /**
   * Set a text field from its editor. See setFieldFromEditor.
   */
  public setFieldFromEditor = setFieldFromEditor;

  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['note-tags']?.entries,
  );

  constructor(
    private _editService: CadmusTextEdService,
    @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN)
    @Optional()
    private _editorBindings?: CadmusTextEdBindings,
  ) {
    super();
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

  protected getValue(): NotePart {
    let part = this.getEditedPart(NOTE_PART_TYPEID) as NotePart;
    const draft = this._draft();
    part.tag = draft.tag || undefined;
    part.text = draft.text?.trim() || '';
    return part;
  }
}
