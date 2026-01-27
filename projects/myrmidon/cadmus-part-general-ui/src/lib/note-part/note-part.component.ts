import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  Optional,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormControl,
  FormBuilder,
  Validators,
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
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';

import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';

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
  CadmusTextEdService,
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CadmusTextEdBindings,
} from '@myrmidon/cadmus-text-ed';

import { NotePart, NOTE_PART_TYPEID } from '../note-part';
import { MonacoEditorHelper } from '../monaco-editor-helper';

/**
 * Note part editor component.
 * Thesauri: optionally "note-tags", when you want to use a closed set of tags.
 */
@Component({
  selector: 'cadmus-note-part',
  templateUrl: './note-part.component.html',
  styleUrls: ['./note-part.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
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
    NgeMonacoModule,
    NgeMarkdownModule,
    MatCardActions,
    CloseSaveButtonsComponent,
  ],
  providers: [CadmusTextEdService],
})
export class NotePartComponent
  extends ModelEditorComponentBase<NotePart>
  implements OnInit, OnDestroy
{
  private _textHelper!: MonacoEditorHelper;

  public tag: FormControl<string | null>;
  public text: FormControl<string | null>;

  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

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
    this.tag = formBuilder.control(null, Validators.maxLength(100));
    this.text = formBuilder.control(null, Validators.required);
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
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    const key = 'note-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }
  }

  private updateForm(part?: NotePart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.tag.setValue(part.tag || null);
    this.text.setValue(part.text);
    this._textHelper.setValue(part.text || '');
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<NotePart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): NotePart {
    let part = this.getEditedPart(NOTE_PART_TYPEID) as NotePart;
    part.tag = this.tag.value || undefined;
    part.text = this.text.value?.trim() || '';
    return part;
  }
}
