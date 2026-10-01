import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormField,
  applyEach,
  form,
  maxLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';

import {
  MatFormField,
  MatLabel,
  MatSuffix,
  MatError,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { DialogService } from '@myrmidon/ngx-mat-tools';

interface Data {
  [key: string]: any;
}
interface DataKey {
  value: string;
  visible: boolean;
}

/**
 * The maximum allowed length for a datum value. This is just a reasonable
 * limit, having no other specifical reason.
 */
const VALUE_MAX_LEN = 100;

interface DatumRow {
  key: string;
  value: string;
}

interface TiledDataControls {
  rows: DatumRow[];
}

/**
 * Bound data -> editable draft: one row per visible key, sorted by key.
 * Values are edited as text.
 */
function toDraft(data: Data | undefined, hiddenKeys: string[]): TiledDataControls {
  if (!data) {
    return { rows: [] };
  }
  return {
    rows: Object.getOwnPropertyNames(data)
      .filter((key) => !hiddenKeys.includes(key))
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({
        key,
        value: data[key] === undefined || data[key] === null ? '' : `${data[key]}`,
      })),
  };
}

@Component({
  selector: 'cadmus-tiled-data',
  templateUrl: './tiled-data.component.html',
  styleUrls: ['./tiled-data.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatIconButton,
    MatSuffix,
    MatIcon,
    MatTooltip,
    MatError,
  ],
})
export class TiledDataComponent {
  public readonly title = input<string>();

  public readonly data = model<Data>({});

  public readonly hiddenKeys = input<string[]>([]);

  public readonly cancel = output();

  // filter form
  private readonly _filterDraft = signal<{ keyFilter: string }>({
    keyFilter: '',
  });
  public readonly filterForm = form(this._filterDraft);

  // new datum form
  private readonly _newDraft = signal<{ newKey: string; newValue: string }>({
    newKey: '',
    newValue: '',
  });
  public readonly newForm = form(this._newDraft, (p) => {
    required(p.newKey);
    pattern(p.newKey, /^[a-zA-Z_$][[a-zA-Z_$0-9]{0,49}$/);
    // hidden keys are not edited here
    validate(p.newKey, ({ value }) =>
      this.hiddenKeys().includes(value()) ? { kind: 'hidden' } : null,
    );
    maxLength(p.newValue, VALUE_MAX_LEN);
  });

  // editing form: one row per visible datum
  private readonly _draft = linkedSignal(() =>
    toDraft(this.data(), this.hiddenKeys()),
  );
  public readonly form = form(this._draft, (p) => {
    applyEach(p.rows, (row) => {
      maxLength(row.value, VALUE_MAX_LEN);
    });
  });

  /**
   * The keys of the visible (not hidden) data, each with its visibility
   * according to the key filter.
   */
  public readonly keys = computed<DataKey[]>(() => {
    const filter = this.filterForm.keyFilter().value().toLowerCase();
    return this.form
      .rows()
      .value()
      .map((row) => ({
        value: row.key,
        visible: !filter || row.key.toLowerCase().indexOf(filter) > -1,
      }));
  });

  constructor(private _dialogService: DialogService) {
    // new data were bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.data();
      this.hiddenKeys();
      untracked(() => this.form().reset());
    });
  }

  public isVisibleKey(key: string): boolean {
    const dataKey = this.keys().find((k) => k.value === key);
    return dataKey ? dataKey.visible : false;
  }

  public clearFilter(): void {
    this.filterForm.keyFilter().value.set('');
  }

  private getData(): Data {
    const original = this.data() || {};
    const hiddenKeys = this.hiddenKeys();
    const data: Data = {};
    for (const key of Object.getOwnPropertyNames(original)) {
      if (hiddenKeys.includes(key)) {
        data[key] = original[key];
      }
    }
    for (const row of this._draft().rows) {
      // keep the original value (and type) unless it was changed
      const old = original[row.key];
      const oldText = old === undefined || old === null ? '' : `${old}`;
      data[row.key] = oldText === row.value && row.key in original ? old : row.value;
    }
    return data;
  }

  private setRows(rows: DatumRow[]): void {
    this.form.rows().value.set(rows);
    this.form.rows().markAsDirty();
  }

  public deleteDatum(key: DataKey): void {
    this._dialogService
      .confirm('Confirm Deletion', `Delete datum #"${key.value}"?`)
      .subscribe((ok: boolean) => {
        if (!ok) {
          return;
        }
        this.setRows(
          this.form
            .rows()
            .value()
            .filter((r) => r.key !== key.value),
        );
      });
  }

  public addDatum(): void {
    if (this.newForm().invalid()) {
      this.newForm().markAsTouched();
      return;
    }
    const key = this.newForm.newKey().value();
    const value = this.newForm.newValue().value();
    const rows = this.form.rows().value();
    // an existing key gets the new value
    this.setRows(
      rows.some((r) => r.key === key)
        ? rows.map((r) => (r.key === key ? { key, value } : r))
        : [...rows, { key, value }].sort((a, b) => a.key.localeCompare(b.key)),
    );
    this._newDraft.set({ newKey: '', newValue: '' });
    this.newForm().reset();
  }

  public close(): void {
    this.cancel.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.data.set(this.getData());
  }
}
