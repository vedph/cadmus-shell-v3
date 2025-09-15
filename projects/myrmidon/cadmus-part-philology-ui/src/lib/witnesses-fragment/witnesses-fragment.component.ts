import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormBuilder,
  FormControl,
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
  MatCardSubtitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

import {
  TextLayerService,
  TokenLocation,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import { WitnessesFragment, Witness } from '../witnesses-fragment';

@Component({
  selector: 'cadmus-witnesses-fragment',
  templateUrl: './witnesses-fragment.component.html',
  styleUrls: ['./witnesses-fragment.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatButton,
    MatTooltip,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    NgeMonacoModule,
    NgeMarkdownModule,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class WitnessesFragmentComponent
  extends ModelEditorComponentBase<WitnessesFragment>
  implements OnInit, OnDestroy
{
  // Monaco
  private readonly _disposables: monaco.IDisposable[] = [];
  private _txtEditorModel?: monaco.editor.ITextModel;
  private _noteEditorModel?: monaco.editor.ITextModel;

  public readonly editorOptions = {
    theme: 'vs-light',
    language: 'markdown',
    wordWrap: 'on',
    // https://github.com/atularen/ngx-monaco-editor/issues/19
    automaticLayout: true,
  };

  public readonly currentWitnessOpen = signal<boolean>(false);
  public readonly currentWitnessId = signal<string | undefined>(undefined);
  public readonly frText = signal<string | undefined>(undefined);

  public witnesses: FormControl;
  // single witness form
  public id: FormControl<string | null>;
  public citation: FormControl<string | null>;
  public text: FormControl<string | null>;
  public note: FormControl<string | null>;
  public witness: FormGroup;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _layerService: TextLayerService
  ) {
    super(authService, formBuilder);
    // form
    this.witnesses = formBuilder.control(null, Validators.required);

    // single witness form
    this.id = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
    ]);
    this.citation = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
    ]);
    this.text = formBuilder.control(null, Validators.required);
    this.note = formBuilder.control(null);
    this.witness = formBuilder.group({
      id: this.id,
      citation: this.citation,
      text: this.text,
      note: this.note,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  public override ngOnDestroy() {
    super.ngOnDestroy();
    this._disposables.forEach((d) => d.dispose());
  }

  public onCreateTextEditor(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._txtEditorModel =
      this._txtEditorModel ||
      monaco.editor.createModel(this.text?.value || '', 'markdown');
    editor.setModel(this._txtEditorModel);

    this._disposables.push(
      this._txtEditorModel.onDidChangeContent((e) => {
        this.text.setValue(this._txtEditorModel!.getValue());
        this.text.markAsDirty();
        this.text.updateValueAndValidity();
      })
    );
  }

  public onCreateNoteEditor(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._noteEditorModel =
      this._noteEditorModel ||
      monaco.editor.createModel(this.note?.value || '', 'markdown');
    editor.setModel(this._noteEditorModel);

    this._disposables.push(
      this._noteEditorModel.onDidChangeContent((e) => {
        this.note.setValue(this._noteEditorModel!.getValue());
        this.note.markAsDirty();
        this.note.updateValueAndValidity();
      })
    );
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      witnesses: this.witnesses,
    });
  }

  public deleteWitness(index: number): void {
    const witnesses = [...(this.witnesses.value || [])];
    witnesses.splice(index, 1);
    this.witnesses.setValue(witnesses);
    this.witnesses.updateValueAndValidity();
    this.witnesses.markAsDirty();
  }

  public moveWitnessUp(index: number): void {
    const witnesses = [...(this.witnesses.value || [])];
    const w = witnesses[index];
    witnesses.splice(index, 1);
    witnesses.splice(index - 1, 0, w);
    this.witnesses.setValue(witnesses);
    this.witnesses.updateValueAndValidity();
    this.witnesses.markAsDirty();
  }

  public moveWitnessDown(index: number): void {
    const witnesses = [...(this.witnesses.value || [])];
    const w = witnesses[index];
    witnesses.splice(index, 1);
    witnesses.splice(index + 1, 0, w);
    this.witnesses.setValue(witnesses);
    this.witnesses.updateValueAndValidity();
    this.witnesses.markAsDirty();
  }

  public openCurrentWitness(witness?: Witness): void {
    if (!witness) {
      this.currentWitnessId.set(undefined);
      this.witness.reset();
    } else {
      this.currentWitnessId.set(witness.id);
      this.id.setValue(witness.id);
      this.citation.setValue(witness.citation);
      this.text.setValue(witness.text);
      this._txtEditorModel?.setValue(witness.text || '');
      this.note.setValue(witness.note || null);
      this._noteEditorModel?.setValue(witness.note || '');
      this.witness.markAsPristine();
    }
    this.currentWitnessOpen.set(true);
    this.witness.enable();
  }

  public closeCurrentWitness(): void {
    this.currentWitnessOpen.set(false);
    this.currentWitnessId.set(undefined);
    this.witness.disable();
  }

  public saveCurrentWitness(): void {
    if (!this.currentWitnessOpen || this.witness.invalid) {
      return;
    }
    const newWitness: Witness = {
      id: this.id.value?.trim() || '',
      citation: this.citation.value?.trim() || '',
      text: this.text.value?.trim() || '',
      note: this.note.value?.trim(),
    };
    const witnesses: Witness[] = [...(this.witnesses.value || [])];
    const i = witnesses.findIndex((w) => {
      return w.id === newWitness.id && w.citation === newWitness.citation;
    });
    if (i === -1) {
      witnesses.push(newWitness);
    } else {
      witnesses.splice(i, 1, newWitness);
    }
    this.witnesses.setValue(witnesses);
    this.witnesses.updateValueAndValidity();
    this.witnesses.markAsDirty();

    this.closeCurrentWitness();
  }

  private updateForm(fragment?: WitnessesFragment | null): void {
    if (!fragment) {
      this.form.reset();
      return;
    }
    this.witnesses.setValue(fragment.witnesses || []);
    this.witnesses.updateValueAndValidity();
    this.witnesses.markAsDirty();
    this.witness.reset();
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<WitnessesFragment>): void {
    // fragment's text
    if (data?.baseText && data.value) {
      this.frText.set(
        this._layerService.getTextFragment(
          data.baseText,
          TokenLocation.parse(data.value.location)!
        )
      );
    }
    this.updateForm(data?.value);
  }

  protected getValue(): WitnessesFragment {
    const fr = this.getEditedFragment() as WitnessesFragment;
    fr.witnesses = this.witnesses.value;
    return fr;
  }
}
