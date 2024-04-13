import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  Validators,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';

import { NotePart, NOTE_PART_TYPEID } from '../note-part';

/**
 * Note part editor component.
 * Thesauri: optionally "note-tags", when you want to use a closed set of tags.
 */
@Component({
  selector: 'cadmus-note-part',
  templateUrl: './note-part.component.html',
  styleUrls: ['./note-part.component.css'],
})
export class NotePartComponent
  extends ModelEditorComponentBase<NotePart>
  implements OnInit, OnDestroy
{
  // Monaco
  private readonly _disposables: monaco.IDisposable[] = [];
  private _editorModel?: monaco.editor.ITextModel;
  private _editor?: monaco.editor.IStandaloneCodeEditor;

  public tag: FormControl<string | null>;
  public text: FormControl<string | null>;

  public tagEntries?: ThesaurusEntry[];

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.tag = formBuilder.control(null, Validators.maxLength(100));
    this.text = formBuilder.control(null, Validators.required);
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
      automaticLayout: true
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

  // @HostListener('window:resize', ['$event'])
  // public onResize(event: any) {
  //   this._editor?.layout();
  // }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      tag: this.tag,
      text: this.text,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    const key = 'note-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }
  }

  private updateForm(part?: NotePart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.tag.setValue(part.tag || null);
    this.text.setValue(part.text);
    this._editorModel?.setValue(part.text || '');
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
