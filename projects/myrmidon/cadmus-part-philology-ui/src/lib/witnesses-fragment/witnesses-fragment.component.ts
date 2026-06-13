import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  FormBuilder,
  FormControl,
  Validators,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { marked } from 'marked';

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

import {
  NgxMonacoEditorComponent,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    NgxMonacoEditorComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class WitnessesFragmentComponent
  extends ModelEditorComponentBase<WitnessesFragment>
  implements OnInit, OnDestroy
{
  private readonly _sanitizer = inject(DomSanitizer);
  private _textSub?: Subscription;
  private _noteSub?: Subscription;

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };

  public readonly currentWitnessOpen = signal<boolean>(false);
  public readonly currentWitnessId = signal<string | undefined>(undefined);
  public readonly frText = signal<string | undefined>(undefined);
  public readonly textPreviewHtml = signal<SafeHtml>('');
  public readonly notePreviewHtml = signal<SafeHtml>('');

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
    private _layerService: TextLayerService,
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
    this._textSub = this.text.valueChanges
      .pipe(debounceTime(50))
      .subscribe(() => this.updateTextPreview());
    this._noteSub = this.note.valueChanges
      .pipe(debounceTime(50))
      .subscribe(() => this.updateNotePreview());
  }

  public override ngOnDestroy() {
    super.ngOnDestroy();
    this._textSub?.unsubscribe();
    this._noteSub?.unsubscribe();
  }

  private updateTextPreview(): void {
    const html = marked.parse(this.text.value || '', { async: false }) as string;
    this.textPreviewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
  }

  private updateNotePreview(): void {
    const html = marked.parse(this.note.value || '', { async: false }) as string;
    this.notePreviewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
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
      this.note.setValue(witness.note || null);
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
          TokenLocation.parse(data.value.location)!,
        ),
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
