import { Component, model, effect, output, input } from '@angular/core';
import {
  FormGroup,
  FormControl,
  FormArray,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';

import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  renderLabelFromLastColon,
  ThesaurusTreeComponent,
} from '@myrmidon/cadmus-thesaurus-store';

import {
  ApparatusEntry,
  AnnotatedValue,
  LocAnnotatedValue,
} from '../apparatus-fragment';

/**
 * Single apparatus entry editor dumb component.
 */
@Component({
  selector: 'cadmus-apparatus-entry',
  templateUrl: './apparatus-entry.component.html',
  styleUrls: ['./apparatus-entry.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatError,
    MatInput,
    MatCheckbox,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatButton,
    ThesaurusTreeComponent,
  ],
})
export class ApparatusEntryComponent {
  /**
   * The apparatus entry being edited. When the user submits the edit,
   * the corresponding entryChange event is emitted.
   */
  public readonly entry = model<ApparatusEntry>();
  public readonly editorClose = output();

  // thesauri:
  // apparatus-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();
  // apparatus-witnesses
  public readonly witEntries = input<ThesaurusEntry[]>();
  // apparatus-authors
  public readonly authEntries = input<ThesaurusEntry[]>();
  // apparatus-author-tags
  public readonly authTagEntries = input<ThesaurusEntry[]>();
  /**
   * Author/work tags. This can be alternative or additional
   * to authEntries, and allows picking the work from a tree
   * of authors and works.
   * Thesaurus: author-works.
   */
  public readonly workEntries = input<ThesaurusEntry[]>();

  // form
  public type: FormControl<number>;
  public value: FormControl<string | null>;
  public normValue: FormControl<string | null>;
  public accepted: FormControl<boolean>;
  public subrange: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public groupId: FormControl<string | null>;
  public note: FormControl<string | null>;
  public witnesses: FormArray;
  public authors: FormArray;
  public form: FormGroup;

  constructor(
    private _formBuilder: FormBuilder,
    private _clipboard: Clipboard,
  ) {
    this.type = _formBuilder.control(0, {
      validators: Validators.required,
      nonNullable: true,
    });
    // TODO: add conditional validation according to type
    this.value = _formBuilder.control(null, Validators.maxLength(1000));
    this.normValue = _formBuilder.control(null, Validators.maxLength(1000));
    this.accepted = _formBuilder.control(false, { nonNullable: true });
    this.subrange = _formBuilder.control(
      null,
      Validators.pattern('^[0-9]+(?:-[0-9]+)?$'),
    );
    this.tag = _formBuilder.control(null, Validators.maxLength(50));
    this.groupId = _formBuilder.control(null, Validators.maxLength(50));
    this.note = _formBuilder.control(null, Validators.maxLength(5000));
    this.witnesses = _formBuilder.array([]);
    this.authors = _formBuilder.array([]);
    this.form = _formBuilder.group({
      type: this.type,
      value: this.value,
      normValue: this.normValue,
      accepted: this.accepted,
      subrange: this.subrange,
      tag: this.tag,
      groupId: this.groupId,
      note: this.note,
      witnesses: this.witnesses,
      authors: this.authors,
    });

    effect(() => {
      this.updateForm(this.entry());
    });
  }

  private updateForm(entry?: ApparatusEntry): void {
    if (!entry) {
      this.form.reset();
      return;
    }
    this.type.setValue(entry.type);
    this.value.setValue(entry.value || null);
    this.normValue.setValue(entry.normValue || null);
    this.accepted.setValue(entry.isAccepted === true);
    this.subrange.setValue(entry.subrange || null);
    this.tag.setValue(entry.tag || null);
    this.groupId.setValue(entry.groupId || null);
    this.note.setValue(entry.note || null);

    this.witnesses.clear();
    if (entry.witnesses) {
      for (const wit of entry.witnesses) {
        this.addWitness(wit);
      }
    }

    this.authors.clear();
    if (entry.authors) {
      for (const auth of entry.authors) {
        this.addAuthor(auth);
      }
    }
    this.form.markAsPristine();
  }

  private getEntry(): ApparatusEntry {
    const entry: ApparatusEntry = {
      type: this.type.value,
      value: this.value.value?.trim(),
      normValue: this.normValue.value?.trim(),
      isAccepted: this.accepted.value === true,
      subrange: this.subrange.value?.trim(),
      tag: this.tag.value?.trim(),
      groupId: this.groupId.value?.trim(),
      note: this.note.value?.trim(),
    };

    // witnesses
    for (let i = 0; i < this.witnesses.length; i++) {
      if (!entry.witnesses) {
        entry.witnesses = [];
      }
      entry.witnesses.push({
        value: this.witnesses.value[i].value?.trim(),
        note: this.witnesses.value[i].note?.trim(),
      });
    }

    // authors
    for (let i = 0; i < this.authors.length; i++) {
      if (!entry.authors) {
        entry.authors = [];
      }
      entry.authors.push({
        tag: this.authors.value[i].tag?.trim(),
        value: this.authors.value[i].value?.trim(),
        location: this.authors.value[i].location?.trim(),
        note: this.authors.value[i].note?.trim(),
      });
    }

    return entry;
  }

  public addWitness(witness?: AnnotatedValue): void {
    this.witnesses.push(
      this._formBuilder.group({
        value: this._formBuilder.control(witness?.value, [
          Validators.required,
          Validators.maxLength(50),
        ]),
        note: this._formBuilder.control(
          witness?.note,
          Validators.maxLength(1000),
        ),
      }),
    );
    this.form.markAsDirty();
  }

  public addAuthor(author?: LocAnnotatedValue): void {
    this.authors.push(
      this._formBuilder.group({
        tag: this._formBuilder.control(author?.tag, [Validators.maxLength(50)]),
        value: this._formBuilder.control(author?.value, [
          Validators.required,
          Validators.maxLength(50),
        ]),
        location: this._formBuilder.control(author?.location, [
          Validators.maxLength(50),
        ]),
        note: this._formBuilder.control(
          author?.note,
          Validators.maxLength(1000),
        ),
      }),
    );
    this.form.markAsDirty();
  }

  public removeWitness(index: number): void {
    this.witnesses.removeAt(index);
    this.form.markAsDirty();
  }

  public removeAuthor(index: number): void {
    this.authors.removeAt(index);
    this.form.markAsDirty();
  }

  public moveWitnessUp(index: number): void {
    if (index < 1) {
      return;
    }
    const grp = this.witnesses.controls[index];
    this.witnesses.removeAt(index);
    this.witnesses.insert(index - 1, grp);
    this.form.markAsDirty();
  }

  public moveAuthorUp(index: number): void {
    if (index < 1) {
      return;
    }
    const grp = this.authors.controls[index];
    this.authors.removeAt(index);
    this.authors.insert(index - 1, grp);
    this.form.markAsDirty();
  }

  public moveWitnessDown(index: number): void {
    if (index + 1 >= this.witnesses.length) {
      return;
    }
    const item = this.witnesses.controls[index];
    this.witnesses.removeAt(index);
    this.witnesses.insert(index + 1, item);
    this.form.markAsDirty();
  }

  public moveAuthorDown(index: number): void {
    if (index + 1 >= this.authors.length) {
      return;
    }
    const item = this.authors.controls[index];
    this.authors.removeAt(index);
    this.authors.insert(index + 1, item);
    this.form.markAsDirty();
  }

  public onEntryChange(entry: ThesaurusEntry): void {
    if (entry) {
      this._clipboard.copy(entry.id);
    }
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.entry.set(this.getEntry());
  }
}
