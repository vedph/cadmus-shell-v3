import {
  ChangeDetectionStrategy,
  Component,
  effect,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  max,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';

import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { FlagDefinition } from '@myrmidon/cadmus-core';

/**
 * The editable shape behind the form. Text fields use '' as their empty
 * value, as they are bound to native inputs.
 */
interface FlagDefinitionControls {
  /** The 1-based index of the flag's bit (1-32). */
  id: number;
  label: string;
  /** The color in the form #rrggbb, or ''. */
  colorKey: string;
  description: string;
  isAdmin: boolean;
}

/**
 * Get the 0-based index of the lowest bit set in value, or -1.
 */
function getBit(value: number): number {
  let test = 1;
  for (let i = 0; i < 32; i++) {
    if ((value & test) !== 0) {
      return i;
    }
    test <<= 1;
  }
  return -1;
}

function toDraft(flag: FlagDefinition | undefined): FlagDefinitionControls {
  return !flag
    ? { id: 1, label: '', colorKey: '', description: '', isAdmin: false }
    : {
        id: getBit(flag.id) + 1,
        label: flag.label || '',
        colorKey: flag.colorKey ? '#' + flag.colorKey : '',
        description: flag.description || '',
        isAdmin: flag.isAdmin === true,
      };
}

function toFlag(v: FlagDefinitionControls): FlagDefinition {
  return {
    id: 1 << (v.id - 1),
    label: v.label.trim(),
    colorKey: v.colorKey.substring(1),
    description: v.description.trim(),
    isAdmin: v.isAdmin,
  };
}

/**
 * Flag definition editor.
 */
@Component({
  selector: 'cadmus-flag-definition-editor',
  templateUrl: './flag-definition-editor.component.html',
  styleUrls: ['./flag-definition-editor.component.scss'],
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatError,
    MatInput,
    MatCheckbox,
    MatIconButton,
    MatTooltip,
    MatIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlagDefinitionEditorComponent {
  public readonly flag = model<FlagDefinition>();

  public readonly editorClose = output();

  public readonly flagNumbers = Array.from({ length: 32 }, (_, i) => i + 1);

  /**
   * The editable draft, derived from flag. On the echo of our own save the
   * live draft is kept, as toFlag() normalizes (trims) its values.
   */
  private readonly _draft = linkedSignal<
    FlagDefinition | undefined,
    FlagDefinitionControls
  >({
    source: () => this.flag(),
    computation: (flag, previous) =>
      previous &&
      JSON.stringify(flag) === JSON.stringify(toFlag(previous.value))
        ? previous.value
        : toDraft(flag),
  });

  public readonly form = form(this._draft, (path) => {
    required(path.id);
    min(path.id, 1);
    max(path.id, 32);
    required(path.label);
    maxLength(path.label, 50);
    required(path.colorKey);
    required(path.description);
    maxLength(path.description, 100);
  });

  constructor() {
    // once the draft mirrors the bound flag again, clear interaction state
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (this.isDraftInSync(draft)) {
          this.form().reset();
        }
      });
    });
  }

  /** True when the draft still mirrors the bound flag. */
  private isDraftInSync(draft: FlagDefinitionControls): boolean {
    return JSON.stringify(draft) === JSON.stringify(toDraft(this.flag()));
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.flag.set(toFlag(this._draft()));
    this.form().reset();
  }
}
