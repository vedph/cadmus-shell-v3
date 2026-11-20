import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormValueControl } from '@angular/forms/signals';
import { map, Observable, of, startWith, switchMap } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { TaxoStoreNode } from '@myrmidon/taxo-store-api';
import { TaxoStorePicker } from '@myrmidon/taxo-store-picker';

import {
  getThesaurusEntryLabel,
  resolveThesaurusView,
  ThesaurusViewMode,
  ThesOrTaxoMode,
  ThesOrTaxoPick,
} from '../../models';
import { ThesOrTaxoSourceService } from '../../services/thes-or-taxo-source.service';
import { ThesaurusEntryPicker } from '../thesaurus-entry-picker/thesaurus-entry-picker';

/**
 * The state of the thesaurus entries got from the backend.
 */
interface RemoteEntries {
  loading: boolean;
  entries: readonly ThesaurusEntry[];
}

const NO_REMOTE_ENTRIES: RemoteEntries = { loading: false, entries: [] };

/**
 * A picker for a string value, which can be picked from a thesaurus
 * (flat or hierarchical), from a taxonomy (a TaxoStore tree), or just
 * typed (unbound). This is a wrapper which lets editors use the same
 * control for a value whatever its source, as configured for the editor.
 *
 * The component can be used with two-way binding on value, or as a signal
 * forms control (`[formField]`), as it implements `FormValueControl`.
 * It never emits value changes when its value is set from outside: it
 * emits only when the user picks, types, or clears a value.
 */
@Component({
  selector: 'cadmus-thes-or-taxo-picker',
  templateUrl: './thes-or-taxo-picker.html',
  styleUrl: './thes-or-taxo-picker.css',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
    TaxoStorePicker,
    ThesaurusEntryPicker,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThesOrTaxoPicker implements FormValueControl<string> {
  private readonly _source = inject(ThesOrTaxoSourceService);

  // #region Inputs
  /**
   * The mode: `thesaurus`, `taxonomy`, or `unbound` (default).
   */
  public readonly mode = input<ThesOrTaxoMode | null | undefined>('unbound');

  /**
   * The source for the value, according to mode:
   * - thesaurus: the thesaurus ID (e.g. `event-types@en`). This is not
   * required when entries are set.
   * - taxonomy: the taxonomy store tree ID.
   * - unbound: not used.
   */
  public readonly source = input<string | null | undefined>();

  /**
   * The thesaurus entries, for thesaurus mode. When set (even if empty),
   * they are used instead of loading the thesaurus specified by source.
   * This is the typical case of Cadmus editors, whose thesauri are loaded
   * by their wrapper feature.
   */
  public readonly entries = input<readonly ThesaurusEntry[] | null | undefined>();

  /**
   * How to display a thesaurus: `auto` (default: as a tree when any entry
   * ID includes a dot, else as a list), `flat`, or `tree`.
   */
  public readonly thesaurusView = input<ThesaurusViewMode>('auto');

  /**
   * The function used to render the labels of thesaurus tree nodes.
   * By default, the label portion after the last colon is rendered.
   */
  public readonly renderLabel = input<
    ((label: string) => string) | null | undefined
  >();

  /**
   * The label of the control.
   */
  public readonly label = input<string>('value');

  /**
   * True to fall back to unbound mode when the source for thesaurus or
   * taxonomy mode is not available (no thesaurus ID nor entries, an empty
   * or missing thesaurus, or no tree ID). Default is true. When false,
   * a message is displayed instead.
   */
  public readonly fallbackToUnbound = input<boolean>(true);

  /**
   * True to show a button for clearing the value. Default is true.
   */
  public readonly canClear = input<boolean>(true);

  /**
   * True to show the top-level nodes filter in the taxonomy picker.
   * Default is true.
   */
  public readonly hasTopNodeFilter = input<boolean>(true);

  /**
   * Whether users can edit taxonomy nodes. Default is false.
   */
  public readonly canEditNode = input<boolean>(false);

  /**
   * Whether users can add taxonomy nodes. Default is false.
   */
  public readonly canAddNode = input<boolean>(false);

  /**
   * Whether users can delete taxonomy nodes. Default is false.
   */
  public readonly canDeleteNode = input<boolean>(false);
  // #endregion

  // #region FormValueControl
  /**
   * The picked value: a thesaurus entry ID, a taxonomy node key, or the
   * typed text. Empty when no value is set.
   */
  public readonly value = model<string>('');

  /**
   * True to disable the control.
   */
  public readonly disabled = input<boolean>(false);

  /**
   * True to make the control read-only: the value is shown, but it
   * cannot be changed.
   */
  public readonly readonly = input<boolean>(false);

  /**
   * True when the bound value is invalid. This just affects styling.
   */
  public readonly invalid = input<boolean>(false);

  /**
   * True when a value is required. This just affects styling.
   */
  public readonly required = input<boolean>(false);

  /**
   * The maximum length of a typed value.
   */
  public readonly maxLength = input<number | undefined>();

  /**
   * Emitted when the user has interacted with the control.
   */
  public readonly touch = output<void>();
  // #endregion

  /**
   * Emitted when the user picks, types or clears a value, together with
   * valueChange. This also provides the label of the value and its source.
   */
  public readonly pick = output<ThesOrTaxoPick>();

  // #region State
  /**
   * The ID of the thesaurus to load, if any.
   */
  private readonly _thesaurusId = computed<string | null>(() =>
    this.mode() === 'thesaurus' && this.entries() === undefined
      ? this.source() || null
      : null,
  );

  private readonly _remoteEntries = toSignal(
    toObservable(this._thesaurusId).pipe(
      switchMap((id): Observable<RemoteEntries> =>
        id
          ? this._source.getThesaurusEntries(id).pipe(
              map((entries) => ({ loading: false, entries })),
              startWith({ loading: true, entries: [] } as RemoteEntries),
            )
          : of(NO_REMOTE_ENTRIES),
      ),
    ),
    { initialValue: NO_REMOTE_ENTRIES },
  );

  /**
   * True while loading the thesaurus.
   */
  public readonly loading = computed<boolean>(
    () => !!this._thesaurusId() && this._remoteEntries().loading,
  );

  /**
   * The entries of the thesaurus, either from the entries input or from
   * the backend.
   */
  public readonly thesEntries = computed<readonly ThesaurusEntry[]>(() => {
    const entries = this.entries();
    if (entries !== undefined) {
      return entries ?? [];
    }
    return this._thesaurusId() ? this._remoteEntries().entries : [];
  });

  /**
   * True if the source for the requested mode is available.
   */
  public readonly hasSource = computed<boolean>(() => {
    switch (this.mode()) {
      case 'thesaurus':
        return this.loading() || this.thesEntries().length > 0;
      case 'taxonomy':
        return !!this.source();
      default:
        return true;
    }
  });

  /**
   * The effective mode, which may fall back to unbound when the source
   * is not available. This is null when the source is not available and
   * fallback is disabled.
   */
  public readonly effectiveMode = computed<ThesOrTaxoMode | null>(() => {
    const mode = this.mode() || 'unbound';
    if (mode === 'unbound' || this.hasSource()) {
      return mode;
    }
    return this.fallbackToUnbound() ? 'unbound' : null;
  });

  /**
   * The effective view for a thesaurus.
   */
  public readonly thesView = computed<'flat' | 'tree'>(() =>
    resolveThesaurusView(this.thesEntries(), this.thesaurusView()),
  );

  /**
   * True if the value cannot be changed.
   */
  public readonly locked = computed<boolean>(
    () => this.disabled() || this.readonly(),
  );

  private readonly _taxoKey = computed<{ tree: string; key: string } | null>(
    () => {
      const tree = this.source();
      const key = this.value();
      return this.effectiveMode() === 'taxonomy' && tree && key
        ? { tree, key }
        : null;
    },
  );

  private readonly _taxoLabel = toSignal(
    toObservable(this._taxoKey).pipe(
      switchMap((k) =>
        k
          ? this._source
              .getTaxoNodeLabel(k.tree, k.key)
              .pipe(map((label) => ({ key: k.key, label })))
          : of(null),
      ),
    ),
    { initialValue: null },
  );

  /**
   * The human-friendly label of the current value, if any.
   */
  public readonly valueLabel = computed<string | undefined>(() => {
    const value = this.value();
    if (!value) {
      return undefined;
    }
    switch (this.effectiveMode()) {
      case 'thesaurus':
        return getThesaurusEntryLabel(this.thesEntries(), value);
      case 'taxonomy': {
        const t = this._taxoLabel();
        return t?.key === value ? t.label ?? undefined : undefined;
      }
      default:
        return undefined;
    }
  });
  // #endregion

  /**
   * Set the value as picked by the user. Nothing is emitted when the
   * value is equal to the current one.
   */
  private setValue(pick: ThesOrTaxoPick): void {
    if (this.locked()) {
      return;
    }
    this.touch.emit();
    if (pick.value === (this.value() ?? '')) {
      return;
    }
    this.value.set(pick.value);
    this.pick.emit(pick);
  }

  public onEntryChange(entry: ThesaurusEntry): void {
    this.setValue({
      value: entry.id,
      label: entry.value,
      mode: 'thesaurus',
      source: this._thesaurusId() ?? undefined,
    });
  }

  public onNodePick(node: TaxoStoreNode | null): void {
    // the picker emits null when its lookup is cleared: this is not
    // a request to clear the value, which is done via the clear button
    const tree = this.source();
    if (!node || !tree) {
      return;
    }
    this._source.setTaxoNodeLabel(tree, node.key, node.label);
    this.setValue({
      value: node.key,
      label: node.label,
      mode: 'taxonomy',
      source: tree,
    });
  }

  public onTextInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    if (this.locked() || text === this.value()) {
      return;
    }
    this.value.set(text);
    this.pick.emit({ value: text, label: text, mode: 'unbound' });
  }

  public onTouch(): void {
    this.touch.emit();
  }

  /**
   * Clear the value.
   */
  public clear(): void {
    const mode = this.effectiveMode() ?? 'unbound';
    this.setValue({
      value: '',
      mode,
      source:
        mode === 'taxonomy'
          ? this.source() || undefined
          : mode === 'thesaurus'
            ? (this._thesaurusId() ?? undefined)
            : undefined,
    });
  }
}
