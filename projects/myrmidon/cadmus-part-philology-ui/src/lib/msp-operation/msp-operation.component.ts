import {
  ChangeDetectionStrategy,
  Component,
  output,
  model,
  effect,
  signal,
  linkedSignal,
  untracked,
} from '@angular/core';
import {
  FormField,
  disabled,
  form,
  maxLength,
  pattern,
  required,
} from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MspOperation, MspOperator } from '../msp-operation';
import {
  MatCard,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import {
  MatFormField,
  MatLabel,
  MatHint,
  MatSuffix,
  MatError,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';

import { TextRange } from '@myrmidon/cadmus-core';

import { MspValidators } from '../msp-validators';
import { isImplicitSubmission } from '@myrmidon/cadmus-ui';

interface MspVisualControls {
  operator: MspOperator;
  rangeA: string;
  valueA: string;
  rangeB: string;
  valueB: string;
  tag: string;
  note: string;
}

interface MspOperationControls {
  text: string;
  visual: MspVisualControls;
}

const RANGE_REGEXP = /^\@?\d+(?:[x×]\d+)?$/;

function toVisual(operation?: MspOperation | null): MspVisualControls {
  return {
    operator: operation?.operator ?? MspOperator.delete,
    rangeA: operation?.rangeA ? operation.rangeA.toString() : '',
    valueA: operation?.valueA || '',
    rangeB: operation?.rangeB ? operation.rangeB.toString() : '',
    valueB: operation?.valueB || '',
    tag: operation?.tag || '',
    note: operation?.note || '',
  };
}

function toDraft(operation?: MspOperation): MspOperationControls {
  return {
    text: operation ? operation.toString() : '',
    visual: toVisual(operation),
  };
}

function sameVisual(a: MspVisualControls, b: MspVisualControls): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Single misspelling operation editor.
 * OBSOLETE: use edit-operation component instead.
 */
@Component({
  selector: 'cadmus-msp-operation',
  templateUrl: './msp-operation.component.html',
  styleUrls: ['./msp-operation.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatCard,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatHint,
    MatIconButton,
    MatSuffix,
    MatIcon,
    MatError,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatSelect,
    MatOption,
    MatCardActions,
    MatTooltip,
  ],
})
export class MspOperationComponent {
  /**
   * The operation being edited.
   */
  public readonly operation = model<MspOperation>();

  public readonly operationClose = output();

  public readonly visualExpanded = signal<boolean>(false);

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.operation()));
  public readonly form = form(this._draft, (p) => {
    required(p.text);
    MspValidators.msp(p.text);

    const v = p.visual;
    required(v.operator);
    required(v.rangeA);
    pattern(v.rangeA, RANGE_REGEXP);
    maxLength(v.valueA, 100);
    pattern(v.rangeB, RANGE_REGEXP);
    maxLength(v.valueB, 100);
    maxLength(v.tag, 50);
    pattern(v.tag, /^[0-9a-zA-Z_\.\-]+$/);
    maxLength(v.note, 100);
    pattern(v.note, /^[^{}]+$/);

    // the fields used by each operator
    const op = ({
      valueOf,
    }: {
      valueOf: (path: typeof v.operator) => MspOperator;
    }) => valueOf(v.operator);
    const noOperator = (ctx: any) => op(ctx) === undefined || op(ctx) === null;
    disabled(v.rangeA, noOperator);
    disabled(v.valueA, noOperator);
    disabled(v.tag, noOperator);
    disabled(v.note, noOperator);
    disabled(
      v.rangeB,
      (ctx) => op(ctx) !== MspOperator.move && op(ctx) !== MspOperator.swap,
    );
    disabled(
      v.valueB,
      (ctx) =>
        op(ctx) !== MspOperator.replace &&
        op(ctx) !== MspOperator.insert &&
        op(ctx) !== MspOperator.swap,
    );
  });

  constructor() {
    // a new operation was bound: no unsaved edits (keyed on the bound
    // model: the draft also changes with each user edit)
    effect(() => {
      this.operation();
      untracked(() => this.form().reset());
    });

    // text -> visual: when the text parses to an operation different from
    // the visual one, update the visual editor
    toObservable(this.form.text().value)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((text) => this.updateVisual(text));

    // visual -> text: when the valid visual operation differs from the
    // text, update the text
    toObservable(this.form.visual().value)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.updateText());
  }

  /**
   * Update the visual editor from the text editor, if valid.
   */
  private updateVisual(text: string): void {
    const operation = MspOperation.parse(text);
    if (!operation) {
      return;
    }
    const visual = toVisual(operation);
    if (!sameVisual(visual, this.form.visual().value())) {
      this.form.visual().value.set(visual);
    }
  }

  /**
   * Update the text editor from the visual editor, if valid.
   */
  private updateText(): void {
    if (this.form.visual().invalid()) {
      return;
    }
    const text = this.getOperation().toString();
    // skip when the text already represents the same operation
    const current = MspOperation.parse(this.form.text().value());
    if (current?.toString() === text) {
      return;
    }
    this.form.text().value.set(text);
    this.form.text().markAsDirty();
  }

  /**
   * Get a new MspOperation object from the visual editor.
   */
  private getOperation(): MspOperation {
    const v = this.form.visual().value();
    const op = new MspOperation();
    op.operator = v.operator;
    op.rangeA = TextRange.parse(v.rangeA || '')!;
    op.valueA = v.valueA || undefined;
    op.rangeB = TextRange.parse(v.rangeB || '')!;
    op.valueB = v.valueB || undefined;
    op.tag = v.tag || undefined;
    op.note = v.note || undefined;
    return op;
  }

  public resetText(): void {
    this._draft.set(toDraft());
    this.form().reset();
  }

  /**
   * Close the editor.
   */
  public cancel(): void {
    this.operationClose.emit();
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

  /**
   * Save the current operation.
   */
  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.operation.set(this.getOperation());
  }
}
