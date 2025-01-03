import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
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
} from '@myrmidon/cadmus-ui';

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
export class ApparatusEntryComponent implements OnInit {
  private _entry?: ApparatusEntry;

  @Input()
  public get entry(): ApparatusEntry | undefined {
    return this._entry;
  }
  public set entry(value: ApparatusEntry | undefined) {
    if (this._entry === value) {
      return;
    }
    this._entry = value;
    this.updateForm();
  }

  /**
   * Tags for apparatus entries.
   */
  @Input()
  public tagEntries?: ThesaurusEntry[];
  /**
   * Witnesses.
   */
  @Input()
  public witEntries?: ThesaurusEntry[];
  /**
   * Authors.
   */
  @Input()
  public authEntries?: ThesaurusEntry[];
  /**
   * Author's tags.
   */
  @Input()
  public authTagEntries?: ThesaurusEntry[];
  /**
   * Author/work tags. This can be alternative or additional
   * to authEntries, and allows picking the work from a tree
   * of authors and works.
   */
  @Input()
  public workEntries?: ThesaurusEntry[];

  @Output()
  public editorClose: EventEmitter<any>;
  @Output()
  public save: EventEmitter<ApparatusEntry>;

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
    private _clipboard: Clipboard
  ) {
    // events
    this.editorClose = new EventEmitter<any>();
    this.save = new EventEmitter<ApparatusEntry>();
    // form
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
      Validators.pattern('^[0-9]+(?:-[0-9]+)?$')
    );
    this.tag = _formBuilder.control(null, Validators.maxLength(50));
    this.groupId = _formBuilder.control(null, Validators.maxLength(50));
    this.note = _formBuilder.control(null, Validators.maxLength(1000));
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
  }

  ngOnInit(): void {}

  private updateForm(): void {
    if (!this._entry) {
      this.form.reset();
      return;
    }
    this.type.setValue(this._entry.type);
    this.value.setValue(this._entry.value || null);
    this.normValue.setValue(this._entry.normValue || null);
    this.accepted.setValue(this._entry.isAccepted === true);
    this.subrange.setValue(this._entry.subrange || null);
    this.tag.setValue(this._entry.tag || null);
    this.groupId.setValue(this._entry.groupId || null);
    this.note.setValue(this._entry.note || null);

    this.witnesses.clear();
    if (this._entry.witnesses) {
      for (const wit of this._entry.witnesses) {
        this.addWitness(wit);
      }
    }

    this.authors.clear();
    if (this._entry.authors) {
      for (const auth of this._entry.authors) {
        this.addAuthor(auth);
      }
    }
    this.form.markAsPristine();
  }

  private updateEntry(): void {
    if (!this._entry) {
      return;
    }
    this._entry.type = this.type.value;
    this._entry.value = this.value.value?.trim();
    this._entry.normValue = this.normValue.value?.trim();
    this._entry.isAccepted = this.accepted.value === true;
    this._entry.subrange = this.subrange.value?.trim();
    this._entry.tag = this.tag.value?.trim();
    this._entry.groupId = this.groupId.value?.trim();
    this._entry.note = this.note.value?.trim();

    this._entry.witnesses = [];
    for (let i = 0; i < this.witnesses.length; i++) {
      this._entry.witnesses.push({
        value: this.witnesses.value[i].value?.trim(),
        note: this.witnesses.value[i].note?.trim(),
      });
    }

    this._entry.authors = [];
    for (let i = 0; i < this.authors.length; i++) {
      this._entry.authors.push({
        tag: this.authors.value[i].tag?.trim(),
        value: this.authors.value[i].value?.trim(),
        location: this.authors.value[i].location?.trim(),
        note: this.authors.value[i].note?.trim(),
      });
    }
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
          Validators.maxLength(1000)
        ),
      })
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
          Validators.maxLength(1000)
        ),
      })
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
    this.updateEntry();
    this.save.emit(this._entry);
  }
}
