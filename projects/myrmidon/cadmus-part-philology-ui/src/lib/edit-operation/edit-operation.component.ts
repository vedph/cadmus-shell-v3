import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  ParseException,
  EditOperation,
  OperationType,
  SwapEditOperation,
} from '../services/edit-operation';

/**
 * Editor for a single edit operation.
 */
@Component({
  selector: 'cadmus-edit-operation',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './edit-operation.component.html',
  styleUrl: './edit-operation.component.css',
})
export class EditOperationComponent {
  private _outputDirty = signal<number>(0);

  public readonly operation = model<EditOperation | undefined>();

  /**
   * The input text where the operation is applied.
   */
  public readonly inputText = input<string | undefined>(undefined);

  /**
   * The output text after applying the operation.
   */
  public readonly outputText = computed<string | undefined>(() => {
    const dirty = this._outputDirty(); // force recompute when dirty changes
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

  // orthography-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>(undefined);
  // orthography-op-tags
  public readonly opTagEntries = input<ThesaurusEntry[] | undefined>(undefined);

  public readonly cancelEdit = output();

  public dsl: FormControl<string | null>;
  public type: FormControl<OperationType>;
  public at: FormControl<number>;
  public run: FormControl<number>;
  public text: FormControl<string | null>;
  public to: FormControl<number>;
  public toRun: FormControl<number>;
  public tags: FormControl<string | null>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    // form
    this.dsl = new FormControl<string | null>(null, {
      validators: Validators.maxLength(1000),
    });
    this.type = new FormControl<OperationType>(OperationType.Replace, {
      nonNullable: true,
    });
    this.at = new FormControl<number>(1, {
      nonNullable: true,
    });
    this.run = new FormControl<number>(1, {
      nonNullable: true,
    });
    this.text = new FormControl<string | null>(null);
    this.to = new FormControl<number>(0, {
      nonNullable: true,
      validators: NgxToolsValidators.conditionalValidator(
        () =>
          this.type.value === 'MoveBefore' ||
          this.type.value === 'MoveAfter' ||
          this.type.value === 'Swap',
        Validators.min(1)
      ),
    });
    this.toRun = new FormControl<number>(0, { nonNullable: true });
    this.tags = new FormControl<string | null>(null, {
      validators: Validators.maxLength(1000),
    });
    this.note = new FormControl<string | null>(null, {
      validators: Validators.maxLength(5000),
    });
    this.form = formBuilder.group({
      dsl: this.dsl,
      type: this.type,
      at: this.at,
      run: this.run,
      text: this.text,
      to: this.to,
      toRun: this.toRun,
      tags: this.tags,
      note: this.note,
    });

    // when model changes, update form
    effect(() => {
      const operation = this.operation();
      this.updateForm(operation);
    });

    // whenever type, at, run, to, toRun, text change, set output dirty
    merge(
      this.type.valueChanges,
      this.at.valueChanges,
      this.run.valueChanges,
      this.to.valueChanges,
      this.toRun.valueChanges,
      this.text.valueChanges
    )
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        this._outputDirty.set(this._outputDirty() + 1);
      });
  }

  private updateForm(operation: EditOperation | undefined | null): void {
    if (!operation) {
      this.form.reset();
    } else {
      this.type.setValue(operation.type);
      this.at.setValue(operation.at);
      this.run.setValue(operation.run);
      this.text.setValue(operation.text || null);
      this.to.setValue(operation.to || 0);
      this.toRun.setValue(operation.toRun || 0);
      this.tags.setValue(operation.tags ? operation.tags.join(' ') : null);
      this.note.setValue(operation.note || null);
      this.form.markAsPristine();
    }
  }

  public parseOperation(): void {
    if (!this.dsl.value) {
      return;
    }
    this.parseError.set(undefined);
    try {
      const op = EditOperation.parseOperation(this.dsl.value);
      this.operation.set(op);
    } catch (error) {
      this.parseError.set(
        error instanceof ParseException
          ? (error as ParseException).toString()
          : 'Unknown error'
      );
      return;
    }
  }

  public updateDsl(): void {
    const op = this.getOperation();
    if (!op) return;

    this.dsl.setValue(op.toString());
  }

  private setInputTexts(op: EditOperation): void {
    const inputText = this.inputText();
    if (!inputText) return;

    // the op input text is equal to inputText substring defined by at-1 and run
    if (inputText && op.at && op.run && op.at <= inputText.length) {
      op.inputText = inputText.substring(op.at - 1, op.run);
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
        op.toRun
      );
    }
  }

  private getOperation(): EditOperation | undefined {
    // extract tags from space-separated string removing extra spaces and duplicates
    const tags: string[] | undefined = this.tags.value
      ?.split(' ')
      .map((t) => t.trim())
      .filter((t, i, a) => t && a.indexOf(t) === i);

    // create operation and set its properties
    const op = EditOperation.createOperation(this.type.value);
    op.at = this.at.value;
    op.run = this.run.value;

    if (
      this.type.value === OperationType.Replace ||
      this.type.value === OperationType.InsertBefore ||
      this.type.value === OperationType.InsertAfter
    ) {
      op.text = this.text.value?.trim() || undefined;
    } else {
      op.text = undefined;
    }

    if (
      this.type.value === OperationType.MoveBefore ||
      this.type.value === OperationType.MoveAfter ||
      this.type.value === OperationType.Swap
    ) {
      op.to = this.to.value ? this.to.value : undefined;
      op.toRun = this.toRun.value ? this.toRun.value : undefined;
    } else {
      op.to = undefined;
      op.toRun = undefined;
    }

    op.tags = tags && tags.length > 0 ? tags : [];
    op.note = this.note.value?.trim() || undefined;
    // calculate input texts
    this.setInputTexts(op);

    return op;
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Saves the current form data by updating the `data` model signal.
   * This method can be called manually (e.g., by a Save button) or
   * automatically (via auto-save).
   * @param pristine If true (default), the form is marked as pristine
   * after saving.
   * Set to false for auto-save if you want the form to remain dirty.
   */
  public save(pristine = true): void {
    if (this.form.invalid) {
      // show validation errors
      this.form.markAllAsTouched();
      return;
    }

    const operation = this.getOperation();
    this.operation.set(operation);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
