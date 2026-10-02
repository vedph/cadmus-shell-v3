import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  output,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { AssertedHistoricalDate } from '@myrmidon/cadmus-refs-asserted-chronotope';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';
import {
  HistoricalDateComponent,
  HistoricalDateModel,
} from '@myrmidon/cadmus-refs-historical-date';
import { isImplicitSubmission, setFieldFromChild } from '@myrmidon/cadmus-ui';

interface AssertedHistoricalDateControls {
  tag: string;
  hd: HistoricalDateModel | null;
  assertion: Assertion | null;
}

function toDraft(
  date?: AssertedHistoricalDate | null,
): AssertedHistoricalDateControls {
  return !date
    ? { tag: '', hd: null, assertion: null }
    : {
        tag: date.tag || '',
        hd: { a: date.a, b: date.b },
        assertion: date.assertion || null,
      };
}

/**
 * Dumb editor component for a single asserted historical date.
 * Thesauri: asserted-historical-dates-tags, assertion-tags,
 * doc-reference-types, doc-reference-tags.
 */
@Component({
  selector: 'cadmus-asserted-historical-date',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    // bricks
    HistoricalDateComponent,
    AssertionComponent,
  ],
  templateUrl: './asserted-historical-date.component.html',
  styleUrl: './asserted-historical-date.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedHistoricalDateComponent {
  /**
   * The date model to edit. The corresponding dateChange event
   * is fired when the user saves the editing.
   */
  public readonly date = model<AssertedHistoricalDate>();

  /**
   * The cancel event fired when the user cancels editing.
   */
  public readonly dateCancel = output();

  // asserted-historical-dates-tags
  public tagEntries = input<ThesaurusEntry[]>();
  // assertion-tags
  public assertionTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public docReferenceTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public docReferenceTagEntries = input<ThesaurusEntry[]>();

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.date()));
  public readonly form = form(this._draft, (p) => {
    required(p.hd);
  });

  constructor() {
    // a new date was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.date();
      untracked(() => this.form().reset());
    });
  }

  private getDate(): AssertedHistoricalDate {
    const draft = this._draft();
    return {
      tag: draft.tag || undefined,
      a: draft.hd!.a || undefined,
      b: draft.hd?.b || undefined,
      assertion: draft.assertion || undefined,
    };
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    setFieldFromChild(this.form.assertion, assertion || null);
  }

  public onDateChange(date?: HistoricalDateModel): void {
    setFieldFromChild(this.form.hd, date || null);
  }

  public cancel(): void {
    this.dateCancel.emit();
  }

  /**
   * Handle Enter in this editor: in a text input, save as the save button
   * would, when enabled. This replaces the implicit submission of the form
   * this editor used to render.
   * @param event The keydown event.
   */
  public onEnterKey(event: Event): void {
    if (!isImplicitSubmission(event) || this.form().invalid()) {
      return;
    }
    event.preventDefault();
    this.save();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    const date = this.getDate();
    this.date.set(date);
  }
}
