import {
  ChangeDetectionStrategy,
  Component,
  model,
  effect,
  output,
  input,
  linkedSignal,
  untracked,
} from '@angular/core';
import {
  FormField,
  applyEach,
  form,
  maxLength,
  pattern,
  required,
} from '@angular/forms/signals';
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
import { isImplicitSubmission } from '@myrmidon/cadmus-ui';

interface WitnessRow {
  value: string;
  note: string;
}

interface AuthorRow {
  tag: string;
  value: string;
  location: string;
  note: string;
}

interface ApparatusEntryControls {
  type: number;
  value: string;
  normValue: string;
  accepted: boolean;
  subrange: string;
  tag: string;
  groupId: string;
  note: string;
  witnesses: WitnessRow[];
  authors: AuthorRow[];
}

function toWitnessRow(witness?: AnnotatedValue): WitnessRow {
  return { value: witness?.value || '', note: witness?.note || '' };
}

function toAuthorRow(author?: LocAnnotatedValue): AuthorRow {
  return {
    tag: author?.tag || '',
    value: author?.value || '',
    location: author?.location || '',
    note: author?.note || '',
  };
}

function toDraft(entry?: ApparatusEntry): ApparatusEntryControls {
  return {
    type: entry?.type ?? 0,
    value: entry?.value || '',
    normValue: entry?.normValue || '',
    accepted: entry?.isAccepted === true,
    subrange: entry?.subrange || '',
    tag: entry?.tag || '',
    groupId: entry?.groupId || '',
    note: entry?.note || '',
    witnesses: (entry?.witnesses || []).map((w) => toWitnessRow(w)),
    authors: (entry?.authors || []).map((a) => toAuthorRow(a)),
  };
}

/**
 * Single apparatus entry editor dumb component.
 */
@Component({
  selector: 'cadmus-apparatus-entry',
  templateUrl: './apparatus-entry.component.html',
  styleUrls: ['./apparatus-entry.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
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
  private readonly _draft = linkedSignal(() => toDraft(this.entry()));
  public readonly form = form(this._draft, (p) => {
    required(p.type);
    // TODO: add conditional validation according to type
    maxLength(p.value, 1000);
    maxLength(p.normValue, 1000);
    pattern(p.subrange, /^[0-9]+(?:-[0-9]+)?$/);
    maxLength(p.tag, 50);
    maxLength(p.groupId, 50);
    maxLength(p.note, 5000);
    applyEach(p.witnesses, (w) => {
      required(w.value);
      maxLength(w.value, 50);
      maxLength(w.note, 1000);
    });
    applyEach(p.authors, (a) => {
      maxLength(a.tag, 50);
      required(a.value);
      maxLength(a.value, 50);
      maxLength(a.location, 50);
      maxLength(a.note, 1000);
    });
  });

  constructor(private _clipboard: Clipboard) {
    // a new entry was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.entry();
      untracked(() => this.form().reset());
    });
  }

  private getEntry(): ApparatusEntry {
    const draft = this._draft();
    const entry: ApparatusEntry = {
      type: draft.type,
      value: draft.value.trim() || undefined,
      normValue: draft.normValue.trim() || undefined,
      isAccepted: draft.accepted === true,
      subrange: draft.subrange.trim() || undefined,
      tag: draft.tag.trim() || undefined,
      groupId: draft.groupId.trim() || undefined,
      note: draft.note.trim() || undefined,
    };

    // witnesses
    if (draft.witnesses.length) {
      entry.witnesses = draft.witnesses.map((w) => ({
        value: w.value.trim(),
        note: w.note.trim() || undefined,
      }));
    }

    // authors
    if (draft.authors.length) {
      entry.authors = draft.authors.map((a) => ({
        tag: a.tag.trim() || undefined,
        value: a.value.trim(),
        location: a.location.trim() || undefined,
        note: a.note.trim() || undefined,
      }));
    }

    return entry;
  }

  private setWitnesses(rows: WitnessRow[]): void {
    this.form.witnesses().value.set(rows);
    this.form.witnesses().markAsDirty();
  }

  private setAuthors(rows: AuthorRow[]): void {
    this.form.authors().value.set(rows);
    this.form.authors().markAsDirty();
  }

  private static move<T>(items: T[], index: number, delta: number): T[] {
    const moved = [...items];
    const item = moved[index];
    moved.splice(index, 1);
    moved.splice(index + delta, 0, item);
    return moved;
  }

  public addWitness(witness?: AnnotatedValue): void {
    this.setWitnesses([
      ...this.form.witnesses().value(),
      toWitnessRow(witness),
    ]);
  }

  public addAuthor(author?: LocAnnotatedValue): void {
    this.setAuthors([...this.form.authors().value(), toAuthorRow(author)]);
  }

  public removeWitness(index: number): void {
    this.setWitnesses(
      this.form
        .witnesses()
        .value()
        .filter((_, i) => i !== index),
    );
  }

  public removeAuthor(index: number): void {
    this.setAuthors(
      this.form
        .authors()
        .value()
        .filter((_, i) => i !== index),
    );
  }

  public moveWitnessUp(index: number): void {
    if (index < 1) {
      return;
    }
    this.setWitnesses(
      ApparatusEntryComponent.move(this.form.witnesses().value(), index, -1),
    );
  }

  public moveAuthorUp(index: number): void {
    if (index < 1) {
      return;
    }
    this.setAuthors(
      ApparatusEntryComponent.move(this.form.authors().value(), index, -1),
    );
  }

  public moveWitnessDown(index: number): void {
    if (index + 1 >= this.form.witnesses().value().length) {
      return;
    }
    this.setWitnesses(
      ApparatusEntryComponent.move(this.form.witnesses().value(), index, 1),
    );
  }

  public moveAuthorDown(index: number): void {
    if (index + 1 >= this.form.authors().value().length) {
      return;
    }
    this.setAuthors(
      ApparatusEntryComponent.move(this.form.authors().value(), index, 1),
    );
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

  /**
   * Handle Enter in this editor: in a text input, save as the save button
   * would, when enabled. This replaces the implicit submission of the form
   * this editor used to render.
   * @param event The keydown event.
   */
  public onEnterKey(event: Event): void {
    if (
      !isImplicitSubmission(event) ||
      this.form().invalid() ||
      !this.form().dirty()
    ) {
      return;
    }
    event.preventDefault();
    this.submit();
  }

  public submit(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.entry.set(this.getEntry());
  }
}
