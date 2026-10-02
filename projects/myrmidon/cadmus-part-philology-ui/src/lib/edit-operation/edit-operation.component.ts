import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, min } from '@angular/forms/signals';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  renderLabelFromLastColon,
  ThesaurusEntriesPickerComponent,
} from '@myrmidon/cadmus-thesaurus-store';

import {
  ParseException,
  EditOperation,
  OperationType,
  SwapEditOperation,
} from '../services/edit-operation';
import {
  CharTextViewComponent,
  NumberedChar,
} from '../char-text-view/char-text-view.component';
import { isImplicitSubmission, setFieldFromChild } from '@myrmidon/cadmus-ui';

interface EditOperationControls {
  dsl: string;
  type: OperationType;
  at: number;
  run: number;
  text: string;
  to: number;
  toRun: number;
  tags: ThesaurusEntry[];
  note: string;
}

// the operation types having a target position (to/toRun)
const MOVE_TYPES: string[] = [
  OperationType.MoveBefore,
  OperationType.MoveAfter,
  OperationType.Swap,
];

function mapIdsToEntries(
  ids: string[],
  entries: ThesaurusEntry[] | undefined,
): ThesaurusEntry[] {
  return ids.map((id) => {
    const entry = entries?.find((e) => e.id === id);
    return entry ? { id: entry.id, value: entry.value } : { id, value: id };
  });
}

/**
 * Editor for a single edit operation. This component can either parse an
 * operation from its DSL representation, or build it using a visual form.
 * It calculates the output text after applying the operation to the input text.
 */
@Component({
  selector: 'cadmus-edit-operation',
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
    CharTextViewComponent,
    ThesaurusEntriesPickerComponent,
  ],
  templateUrl: './edit-operation.component.html',
  styleUrl: './edit-operation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditOperationComponent {
  /**
   * The edit operation being edited (model).
   */
  public readonly operation = model<EditOperation | undefined>();

  /**
   * The input text where the operation is applied.
   */
  public readonly inputText = input.required<string>();

  /**
   * The output text after applying the operation.
   */
  public readonly outputText = computed<string | undefined>(() => {
    const operation = this.getOperation();
    const input = this.inputText();
    if (!operation || !input) return undefined;

    try {
      return operation.execute(input);
    } catch (error) {
      return undefined;
    }
  });

  /**
   * The last parse error, if any.
   */
  public readonly parseError = signal<string | undefined>(undefined);

  /**
   * True if the editor is expanded (showing the visual editor
   * for the operation).
   */
  public readonly expanded = signal<boolean>(false);

  /**
   * The last coordinates picked using the char picker.
   */
  public readonly pickedCoords = signal<string | undefined>(undefined);

  // orthography-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>(undefined);
  // orthography-op-tags
  public readonly opTagEntries = input<ThesaurusEntry[] | undefined>(undefined);

  /**
   * Cancel the edit operation.
   */
  public readonly cancelEdit = output();

  // form
  private readonly _draft = linkedSignal<
    EditOperation | undefined,
    EditOperationControls
  >({
    source: () => this.operation(),
    computation: (operation, previous) => ({
      // the DSL is not derived from the operation: keep what was typed,
      // unless there is no operation
      dsl: operation ? previous?.value.dsl || '' : '',
      type: operation?.type || OperationType.Replace,
      at: operation?.at ?? 1,
      run: operation?.run ?? 1,
      text: operation?.text || '',
      to: operation?.to || 0,
      toRun: operation?.toRun || 0,
      tags: operation?.tags
        ? mapIdsToEntries(operation.tags, untracked(this.opTagEntries))
        : [],
      note: operation?.note || '',
    }),
  });
  public readonly form = form(this._draft, (p) => {
    maxLength(p.dsl, 1000);
    min(p.at, 1);
    min(p.run, 1);
    maxLength(p.text, 500);
    min(p.to, 1, {
      when: ({ valueOf }) => MOVE_TYPES.includes(valueOf(p.type)),
    });
    min(p.toRun, 0, {
      when: ({ valueOf }) => MOVE_TYPES.includes(valueOf(p.type)),
    });
    maxLength(p.note, 5000);
  });

  constructor(
    private _clipboard: Clipboard,
    private _snackbar: MatSnackBar,
  ) {
    // a new operation was bound: no unsaved edits (keyed on the bound
    // model: the draft also changes with each user edit)
    effect(() => {
      this.operation();
      untracked(() => this.form().reset());
    });
  }

  /**
   * True if the current operation type has a target position (to/toRun).
   */
  public isMoveType(): boolean {
    return MOVE_TYPES.includes(this.form.type().value());
  }

  public parseOperation(): void {
    const dsl = this.form.dsl().value();
    if (!dsl) {
      return;
    }
    this.parseError.set(undefined);
    try {
      const op = EditOperation.parseOperation(dsl);
      // override input text
      op.inputText = this.inputText();
      this.operation.set(op);
    } catch (error) {
      this.parseError.set(
        error instanceof ParseException
          ? (error as ParseException).toString()
          : 'Unknown error',
      );
      return;
    }
  }

  public updateDsl(): void {
    const op = this.getOperation();
    if (!op) return;

    this.form.dsl().value.set(op.toString());
  }

  public onOpTagEntriesChange(entries: ThesaurusEntry[]) {
    setFieldFromChild(
      this.form.tags,
      entries.map((e) => ({ id: e.id, value: e.value })),
    );
  }

  private setInputTexts(op: EditOperation): void {
    const inputText = this.inputText();
    if (!inputText) return;

    // the op input text is equal to inputText substring defined by at-1 and run
    if (inputText && op.at && op.run && op.at <= inputText.length) {
      op.inputText = inputText.substring(op.at - 1, op.at - 1 + op.run);
    }

    // the op input text 2 is equal to inputText substring defined by to-1 and toRun
    // only for operations of type swap
    if (
      op.type === OperationType.Swap &&
      inputText &&
      op.to &&
      op.toRun &&
      op.to <= inputText.length
    ) {
      (op as SwapEditOperation).inputText2 = inputText.substring(
        op.to - 1,
        op.to - 1 + op.toRun,
      );
    }
  }

  private getOperation(): EditOperation | undefined {
    const draft = this._draft();
    // create operation and set its properties
    const op = EditOperation.createOperation(draft.type);
    op.at = draft.at;
    op.run = draft.run;

    if (
      draft.type === OperationType.Replace ||
      draft.type === OperationType.InsertBefore ||
      draft.type === OperationType.InsertAfter
    ) {
      op.text = draft.text.trim() || undefined;
    } else {
      op.text = undefined;
    }

    if (
      draft.type === OperationType.MoveBefore ||
      draft.type === OperationType.MoveAfter ||
      draft.type === OperationType.Swap
    ) {
      op.to = draft.to ? draft.to : undefined;
      op.toRun = draft.toRun ? draft.toRun : undefined;
    } else {
      op.to = undefined;
      op.toRun = undefined;
    }

    op.tags = draft.tags.length ? draft.tags.map((t) => t.id) : undefined;
    op.note = draft.note.trim() || undefined;
    // calculate input texts
    this.setInputTexts(op);

    return op;
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }

  public onTagChange(tag: ThesaurusEntry): void {
    this._clipboard.copy(tag.id);
    this._snackbar.open('Tag copied: ' + tag.id, 'OK', {
      duration: 2000,
    });
  }

  public onCharPick(char: NumberedChar): void {
    this.pickedCoords.set(`${char.n}`);
  }

  public onRangePick(chars: NumberedChar[]): void {
    if (!chars || chars.length === 0) return;
    this.pickedCoords.set(
      `${chars[0].n}x${chars[chars.length - 1].n + 1 - chars[0].n}`,
    );
  }

  private parsePickedCoords(): { at: number; run: number } | null {
    const coords = this.pickedCoords();
    if (!coords) return null;

    const parts = coords.split('x');
    if (parts.length === 0) return null;

    const at = parseInt(parts[0], 10);
    if (isNaN(at) || at < 1) return null;

    let run = 1;
    if (parts.length > 1) {
      const len = parseInt(parts[1], 10);
      if (isNaN(len) || len < 1) return null;
      run = len;
    }
    return { at, run };
  }

  public setAtRunFromPickedCoords(): void {
    const coords = this.pickedCoords();
    if (!coords) return;
    const parsed = this.parsePickedCoords();
    if (!parsed) return;
    this.form.at().value.set(parsed.at);
    this.form.run().value.set(parsed.run);
    this.form.at().markAsDirty();
    this.expanded.set(true);
  }

  public setToFromPickedCoords(): void {
    const coords = this.pickedCoords();
    if (!coords) return;
    const parsed = this.parsePickedCoords();
    if (!parsed) return;
    this.form.to().value.set(parsed.at);
    this.form.to().markAsDirty();
    this.expanded.set(true);
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
    this.save();
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Saves the current form data by updating the `data` model signal.
   * This method can be called manually (e.g., by a Save button) or
   * automatically (via auto-save).
   * @param pristine If true (default), the form's interaction state is
   * reset after saving.
   * Set to false for auto-save if you want the form to remain dirty.
   */
  public save(pristine = true): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    const operation = this.getOperation();
    this.operation.set(operation);

    if (pristine) {
      this.form().reset();
    }
  }
}
