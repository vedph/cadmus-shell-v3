import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  linkedSignal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
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

import {
  NgxMonacoEditorComponent,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
  isImplicitSubmission,
  setFieldFromEditor,
} from '@myrmidon/cadmus-ui';

import { WitnessesFragment, Witness } from '../witnesses-fragment';
import { TextLayerService, TokenLocation } from '@myrmidon/cadmus-core';
import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';

interface WitnessesFragmentControls {
  witnesses: Witness[];
}

interface WitnessControls {
  id: string;
  citation: string;
  text: string;
  note: string;
}

function toDraft(fr?: WitnessesFragment | null): WitnessesFragmentControls {
  return { witnesses: copyFormValue(fr?.witnesses || []) };
}

function toWitnessDraft(witness?: Witness): WitnessControls {
  return {
    id: witness?.id || '',
    citation: witness?.citation || '',
    text: witness?.text || '',
    note: witness?.note || '',
  };
}

@Component({
  selector: 'cadmus-witnesses-fragment',
  templateUrl: './witnesses-fragment.component.html',
  styleUrls: ['./witnesses-fragment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
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
export class WitnessesFragmentComponent extends ModelEditorComponentBase<WitnessesFragment> {
  private readonly _sanitizer = inject(DomSanitizer);

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };

  public readonly currentWitnessOpen = signal<boolean>(false);
  public readonly currentWitnessId = signal<string | undefined>(undefined);
  public readonly textPreviewHtml = signal<SafeHtml>('');
  public readonly notePreviewHtml = signal<SafeHtml>('');

  // the fragment's base text
  public readonly frText = computed<string | undefined>(() => {
    const data = this.data();
    return data?.baseText && data.value
      ? this._layerService.getTextFragment(
          data.baseText,
          TokenLocation.parse(data.value.location)!,
        )
      : undefined;
  });

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.witnesses, 1);
  });

  // single witness form
  private readonly _witnessDraft = signal<WitnessControls>(toWitnessDraft());
  public readonly witness = form(this._witnessDraft, (p) => {
    required(p.id);
    maxLength(p.id, 50);
    required(p.citation);
    maxLength(p.citation, 50);
    required(p.text);
  });

  /**
   * Set a text field from its editor. See setFieldFromEditor.
   */
  public setFieldFromEditor = setFieldFromEditor;

  constructor(private _layerService: TextLayerService) {
    super();
    toObservable(this.witness.text().value)
      .pipe(debounceTime(50), takeUntilDestroyed())
      .subscribe((text) => this.updateTextPreview(text));
    toObservable(this.witness.note().value)
      .pipe(debounceTime(50), takeUntilDestroyed())
      .subscribe((note) => this.updateNotePreview(note));
  }

  private updateTextPreview(text: string): void {
    const html = marked.parse(text || '', { async: false }) as string;
    this.textPreviewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
  }

  private updateNotePreview(note: string): void {
    const html = marked.parse(note || '', { async: false }) as string;
    this.notePreviewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
  }

  protected override onDataSet(): void {
    // new data: close the witness being edited, if any
    this.closeCurrentWitness();
  }

  private setWitnesses(witnesses: Witness[]): void {
    this.form.witnesses().value.set(witnesses);
    this.form.witnesses().markAsDirty();
  }

  public deleteWitness(index: number): void {
    const witnesses = [...this.form.witnesses().value()];
    witnesses.splice(index, 1);
    this.setWitnesses(witnesses);
  }

  public moveWitnessUp(index: number): void {
    // guard against index 0: without this, witnesses.splice(index - 1, ...)
    // receives -1, which Array.splice interprets as "insert before the last
    // element" rather than a no-op, silently corrupting the order.
    if (index < 1) {
      return;
    }
    const witnesses = [...this.form.witnesses().value()];
    const w = witnesses[index];
    witnesses.splice(index, 1);
    witnesses.splice(index - 1, 0, w);
    this.setWitnesses(witnesses);
  }

  public moveWitnessDown(index: number): void {
    const witnesses = [...this.form.witnesses().value()];
    if (index + 1 >= witnesses.length) {
      return;
    }
    const w = witnesses[index];
    witnesses.splice(index, 1);
    witnesses.splice(index + 1, 0, w);
    this.setWitnesses(witnesses);
  }

  public openCurrentWitness(witness?: Witness): void {
    this.currentWitnessId.set(witness?.id);
    this._witnessDraft.set(toWitnessDraft(witness));
    this.witness().reset();
    this.currentWitnessOpen.set(true);
  }

  public closeCurrentWitness(): void {
    this.currentWitnessOpen.set(false);
    this.currentWitnessId.set(undefined);
  }

  /**
   * Handle Enter in the witness editor: in a text input, save the witness
   * as its save button would. This replaces the implicit submission of the
   * form the witness editor used to render.
   * @param event The keydown event.
   */
  public onWitnessEnterKey(event: Event): void {
    if (!isImplicitSubmission(event)) {
      return;
    }
    event.preventDefault();
    this.saveCurrentWitness();
  }

  public saveCurrentWitness(): void {
    if (!this.currentWitnessOpen()) {
      return;
    }
    if (this.witness().invalid()) {
      this.witness().markAsTouched();
      return;
    }
    const draft = this._witnessDraft();
    const newWitness: Witness = {
      id: draft.id.trim(),
      citation: draft.citation.trim(),
      text: draft.text.trim(),
      note: draft.note.trim() || undefined,
    };
    const witnesses: Witness[] = [...this.form.witnesses().value()];
    const i = witnesses.findIndex((w) => {
      return w.id === newWitness.id && w.citation === newWitness.citation;
    });
    if (i === -1) {
      witnesses.push(newWitness);
    } else {
      witnesses.splice(i, 1, newWitness);
    }
    this.setWitnesses(witnesses);

    this.closeCurrentWitness();
  }

  protected getValue(): WitnessesFragment {
    const fr = this.getEditedFragment() as WitnessesFragment;
    fr.witnesses = copyFormValue(this._draft().witnesses);
    return fr;
  }
}
