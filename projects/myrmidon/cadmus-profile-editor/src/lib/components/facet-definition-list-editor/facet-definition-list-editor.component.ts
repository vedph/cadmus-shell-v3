import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  OnInit,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, concatMap, map, take, tap, toArray } from 'rxjs/operators';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';
import { MatProgressBar } from '@angular/material/progress-bar';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { ColorToContrastPipe, EllipsisPipe } from '@myrmidon/ngx-tools';

import { FacetDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings, FacetService } from '@myrmidon/cadmus-api';
import { DataTableComponent } from '@myrmidon/cadmus-ui';

import {
  FacetDefinitionValidatorService,
  FacetValidationResult,
} from '../../services/facet-definition-validator.service';
import { FacetDefinitionEditorComponent } from '../facet-definition-editor/facet-definition-editor.component';

/**
 * The state of a facet in the list, compared with the server.
 */
export type FacetEntryStatus = 'new' | 'renamed' | 'modified' | 'saved';

/**
 * A facet in the list editor, with the copy of it which is stored on the
 * server, if any.
 */
export interface FacetListEntry {
  /** A stable client-side key, used to track the entry. */
  key: number;
  /** The facet as currently edited. */
  facet: FacetDefinition;
  /**
   * The facet as stored on the server, or undefined for a facet which was
   * never saved.
   */
  original?: FacetDefinition;
}

/**
 * The outcome of a save operation.
 */
export interface FacetSaveResult {
  saved: string[];
  deleted: string[];
  failed: string[];
  /** IDs not deleted because some facets failed to save. */
  skipped: string[];
}

/**
 * The changes to be sent to the server.
 */
export interface FacetChanges {
  /** The facets to add or update. */
  upserts: FacetDefinition[];
  /**
   * The IDs of the facets on the server which no longer exist in the list,
   * either because they were deleted or because their ID was changed.
   */
  deletions: string[];
  /** The renamed facets. */
  renames: { from: string; to: string }[];
}

function sameFacet(a: FacetDefinition, b: FacetDefinition): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Editor for a list of facet definitions. Cadmus facet definitions represent the data
 * types of items, and define all the parts which can be included in an item. Some of
 * them are required, others are optional. There can be multiple parts of the same type
 * in the same item, provided that their roleId is different.
 * This editor is used to edit the list of facet definitions from the current profile.
 * As the top level editor, it loads and saves the facet definitions list via API
 * services, and allows to add, edit and delete facet definitions.
 * The actual editing of a facet definition is delegated to descendant dumb components.
 * All edits happen in memory until the user clicks the Save button. Saving then
 * sends to the server only the changes: new and changed facets are added or updated,
 * and the facets no longer in the list (because they were deleted, or their ID was
 * changed) are deleted, only when all the other changes were saved.
 * Facets are listed in the order of their label, like the server returns them:
 * their order is not stored.
 */
@Component({
  selector: 'cadmus-facet-definition-list-editor',
  imports: [
    MatButtonModule,
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatIcon,
    MatTooltip,
    MatProgressBar,
    ColorToContrastPipe,
    EllipsisPipe,
    DataTableComponent,
    FacetDefinitionEditorComponent,
  ],
  templateUrl: './facet-definition-list-editor.component.html',
  styleUrl: './facet-definition-list-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacetDefinitionListEditorComponent implements OnInit {
  private _nextKey = 1;
  private readonly _table = viewChild(DataTableComponent);
  private readonly _editor = viewChild(FacetDefinitionEditorComponent);

  /**
   * The facets entries.
   */
  public readonly entries = signal<FacetListEntry[]>([]);

  /**
   * The IDs of the facets stored on the server, as far as this editor knows.
   */
  private readonly _serverIds = signal<ReadonlySet<string>>(new Set());

  /**
   * The facets as currently edited.
   */
  public readonly facets = computed<FacetDefinition[]>(() =>
    this.entries().map((e) => e.facet),
  );

  /**
   * The key of the edited entry, or 0 for a new facet, or undefined when
   * not editing.
   */
  public readonly editedKey = signal<number | undefined>(undefined);
  /**
   * The facet being edited.
   */
  public readonly edited = signal<FacetDefinition | undefined>(undefined);

  /**
   * The edited entry, if any.
   */
  public readonly editedEntry = computed<FacetListEntry | undefined>(() => {
    const key = this.editedKey();
    return key ? this.entries().find((e) => e.key === key) : undefined;
  });

  public readonly busy = signal<boolean>(false);

  /**
   * True if loading the facets failed. In this case saving is disabled,
   * as the editor does not know what is on the server.
   */
  public readonly loadFailed = signal<boolean>(false);

  /**
   * The result of the last save operation.
   */
  public readonly saveResult = signal<FacetSaveResult | undefined>(undefined);

  /** True after at least one change was saved; prompts an app reload. */
  public readonly reloadNeeded = signal<boolean>(false);

  /** Last validation result, set by validate() and by save(). */
  public readonly validationResult = signal<FacetValidationResult | undefined>(
    undefined,
  );
  public readonly validationResultHasIssues = computed(() => {
    const vr = this.validationResult();
    return vr ? vr.hasErrors || vr.hasWarnings : false;
  });
  public readonly validationCounts = computed(() => {
    const issues = this.validationResult()?.issues || [];
    return {
      error: issues.filter((i) => i.severity === 'error').length,
      warning: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    };
  });

  /**
   * The facet models settings, used to get the list of available part type IDs,
   * and whether they are base text parts; in this case, the same settings also
   * provide the list of their available role IDs from the fragments property.
   */
  public readonly facetModelSettings = signal<FacetModelSettings | undefined>(
    undefined,
  );

  /**
   * The changes to be saved.
   */
  public readonly changes = computed<FacetChanges>(() => {
    const entries = this.entries();
    const ids = new Set(entries.map((e) => e.facet.id));
    const upserts: FacetDefinition[] = [];
    const renames: { from: string; to: string }[] = [];
    for (const e of entries) {
      if (!e.original || !sameFacet(e.facet, e.original)) {
        upserts.push(e.facet);
      }
      if (e.original && e.original.id !== e.facet.id) {
        renames.push({ from: e.original.id, to: e.facet.id });
      }
    }
    const deletions = [...this._serverIds()].filter((id) => !ids.has(id));
    return { upserts, deletions, renames };
  });

  /**
   * The count of the changes to be saved.
   */
  public readonly changeCount = computed<number>(() => {
    const c = this.changes();
    return c.upserts.length + c.deletions.length;
  });

  /**
   * True if there are unsaved changes in the list.
   */
  public readonly dirty = computed<boolean>(() => this.changeCount() > 0);

  /**
   * True if the facet editor is open with changes not yet accepted.
   */
  public readonly editorDirty = computed<boolean>(
    () => !!this.edited() && !!this._editor()?.form().dirty(),
  );

  /**
   * The max length of the description in the list, according to the
   * table width.
   */
  public readonly descLimit = computed<number>(
    () =>
      this._table()?.pick({ xs: 40, sm: 60, md: 80, lg: 120, xl: 200 }) ?? 200,
  );

  /**
   * Emitted when the dirty state changes. This includes unsaved changes in
   * the list and unaccepted changes in the facet editor.
   */
  public readonly dirtyChange = output<boolean>();
  public readonly editorClose = output<void>();

  constructor(
    private _dialogService: DialogService,
    private _facetService: FacetService,
    private _validator: FacetDefinitionValidatorService,
    private _snackbar: MatSnackBar,
  ) {
    let lastDirty = false;
    effect(() => {
      const dirty = this.dirty() || this.editorDirty();
      untracked(() => {
        if (dirty !== lastDirty) {
          lastDirty = dirty;
          this.dirtyChange.emit(dirty);
        }
      });
    });
  }

  public ngOnInit(): void {
    this.load();

    // load facet model settings once at start
    this._facetService.getFacetModelSettings().subscribe({
      next: (settings) => {
        this.facetModelSettings.set(settings);
      },
      error: (error) => {
        console.error(error);
        this._snackbar.open('Error loading facet model settings', 'Close');
      },
    });
  }

  private load(): void {
    this.busy.set(true);
    this._facetService.getFacets().subscribe({
      next: (facets) => {
        this.entries.set(
          (facets || []).map((f) => ({
            key: this._nextKey++,
            facet: f,
            original: structuredClone(f),
          })),
        );
        this._serverIds.set(new Set((facets || []).map((f) => f.id)));
        this.loadFailed.set(false);
        this.busy.set(false);
      },
      error: (error) => {
        console.error(error);
        this.loadFailed.set(true);
        this.busy.set(false);
        this._snackbar.open('Error loading facets', 'Close');
      },
    });
  }

  /**
   * Get the status of the specified entry.
   */
  public getStatus(entry: FacetListEntry): FacetEntryStatus {
    if (!entry.original) {
      return 'new';
    }
    if (entry.original.id !== entry.facet.id) {
      return 'renamed';
    }
    return sameFacet(entry.facet, entry.original) ? 'saved' : 'modified';
  }

  /**
   * Run the specified action, first asking the user to discard the
   * unaccepted changes in the facet editor, if any.
   */
  private guardEditor(action: () => void): void {
    if (!this.editorDirty()) {
      action();
      return;
    }
    this._dialogService
      .confirm(
        'Unaccepted changes',
        `Discard the changes to facet "${this.edited()?.label}"?`,
      )
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          action();
        }
      });
  }

  public addFacet(): void {
    this.guardEditor(() => {
      const entry: FacetDefinition = {
        id: 'new',
        label: 'New facet',
        colorKey: 'C0C0C0',
        description: '',
        partDefinitions: [],
      };
      this.editedKey.set(0);
      this.edited.set(entry);
    });
  }

  public editFacet(entry: FacetListEntry): void {
    if (entry.key === this.editedKey()) {
      return;
    }
    this.guardEditor(() => {
      this.editedKey.set(entry.key);
      this.edited.set(structuredClone(entry.facet));
    });
  }

  public closeFacet(): void {
    this.editedKey.set(undefined);
    this.edited.set(undefined);
  }

  public saveFacet(facet: FacetDefinition): void {
    const key = this.editedKey();
    if (key === undefined) {
      return;
    }
    if (key === 0) {
      this.entries.update((entries) => [
        ...entries,
        { key: this._nextKey++, facet },
      ]);
    } else {
      this.entries.update((entries) =>
        entries.map((e) => (e.key === key ? { ...e, facet } : e)),
      );
    }
    this.closeFacet();
  }

  public deleteFacet(entry: FacetListEntry): void {
    const onServer = !!entry.original;
    this._dialogService
      .confirm(
        'Confirmation',
        `Delete facet "${entry.facet.label}"?` +
          (onServer
            ? ' It will be deleted from the server when you save.'
            : ''),
      )
      .pipe(take(1))
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedKey() === entry.key) {
            this.closeFacet();
          }
          this.entries.update((entries) =>
            entries.filter((e) => e.key !== entry.key),
          );
        }
      });
  }

  /**
   * Discard all the unsaved changes, reloading the facets from the server.
   */
  public discardChanges(): void {
    this._dialogService
      .confirm('Confirmation', 'Discard all the unsaved changes?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          this.closeFacet();
          this.validationResult.set(undefined);
          this.saveResult.set(undefined);
          this.load();
        }
      });
  }

  public reloadApp(): void {
    // the base URI honors the app's base href
    window.location.href = document.baseURI || '/';
  }

  public close(): void {
    this.editorClose.emit();
  }

  /** Run validation and update validationResult; returns the observable. */
  private runValidation(): Observable<FacetValidationResult> {
    return this._validator
      .validate(this.facets(), this.facetModelSettings())
      .pipe(tap((result) => this.validationResult.set(result)));
  }

  /** Trigger validation from the template and update the displayed result. */
  public validate(): void {
    this.runValidation().pipe(take(1)).subscribe();
  }

  /**
   * Persist the changes to the server; called only after all gates pass.
   * New and changed facets are added or updated first; then, only if all
   * of them were saved, the facets no longer present are deleted. This
   * ensures that a renamed facet is never deleted before its new copy
   * is saved.
   */
  private doSave(changes: FacetChanges): void {
    this.busy.set(true);
    this.saveResult.set(undefined);

    from(changes.upserts)
      .pipe(
        concatMap((facet) =>
          this._facetService.addFacet(facet).pipe(
            map(() => ({ facet, ok: true })),
            catchError((error) => {
              console.error(error);
              return of({ facet, ok: false });
            }),
          ),
        ),
        toArray(),
      )
      .subscribe((upserts) => {
        const saved = upserts.filter((r) => r.ok).map((r) => r.facet);
        const failed = upserts.filter((r) => !r.ok).map((r) => r.facet.id);
        this.markSaved(saved);

        if (failed.length) {
          this.endSave({
            saved: saved.map((f) => f.id),
            deleted: [],
            failed,
            skipped: changes.deletions,
          });
          return;
        }

        from(changes.deletions)
          .pipe(
            concatMap((id) =>
              this._facetService.deleteFacet(id).pipe(
                map(() => ({ id, ok: true })),
                catchError((error) => {
                  console.error(error);
                  return of({ id, ok: false });
                }),
              ),
            ),
            toArray(),
          )
          .subscribe((deletions) => {
            const deleted = deletions.filter((r) => r.ok).map((r) => r.id);
            this._serverIds.update((ids) => {
              const set = new Set(ids);
              deleted.forEach((id) => set.delete(id));
              return set;
            });
            this.endSave({
              saved: saved.map((f) => f.id),
              deleted,
              failed: deletions.filter((r) => !r.ok).map((r) => r.id),
              skipped: [],
            });
          });
      });
  }

  /**
   * Update the server copy of the specified facets, after saving them.
   */
  private markSaved(facets: FacetDefinition[]): void {
    if (!facets.length) {
      return;
    }
    const saved = new Set(facets);
    this.entries.update((entries) =>
      entries.map((e) =>
        saved.has(e.facet) ? { ...e, original: structuredClone(e.facet) } : e,
      ),
    );
    this._serverIds.update((ids) => {
      const set = new Set(ids);
      facets.forEach((f) => set.add(f.id));
      return set;
    });
  }

  private endSave(result: FacetSaveResult): void {
    this.busy.set(false);
    this.saveResult.set(result);
    if (result.saved.length || result.deleted.length) {
      this.reloadNeeded.set(true);
    }
    if (result.failed.length) {
      this._snackbar.open('Some changes could not be saved', 'Close');
    } else {
      this._snackbar.open('Facets saved', 'OK', { duration: 1500 });
    }
  }

  public downloadFacets(): void {
    const replacer = (_key: string, value: unknown) =>
      value === null || value === false ? undefined : value;
    const blob = new Blob([JSON.stringify(this.facets(), replacer, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'facets.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url));
  }

  /**
   * Build the message of the final confirmation, summarizing the changes.
   */
  private buildConfirmMessage(changes: FacetChanges): string {
    const lines: string[] = [];
    if (changes.upserts.length) {
      lines.push(
        `Add or update: ${changes.upserts.map((f) => f.id).join(', ')}.`,
      );
    }
    if (changes.renames.length) {
      lines.push(
        'Rename: ' +
          changes.renames.map((r) => `${r.from} → ${r.to}`).join(', ') +
          '. Items using the old ID will no longer find their facet.',
      );
    }
    const deleted = changes.deletions.filter(
      (id) => !changes.renames.some((r) => r.from === id),
    );
    if (deleted.length) {
      lines.push(
        `Delete: ${deleted.join(', ')}. ` +
          'Items using these facets will no longer find them.',
      );
    }
    lines.push(
      'Facet definitions affect every item in the database. Proceed?',
    );
    // the confirm dialog shows plain text, where newlines collapse
    return lines.join(' ');
  }

  /**
   * Final confirmation gate before the actual write.
   * Always shown, even when there are no warnings or errors.
   */
  private confirmAndSave(): void {
    const changes = this.changes();
    if (!changes.upserts.length && !changes.deletions.length) {
      return;
    }
    this._dialogService
      .confirm('Save facets', this.buildConfirmMessage(changes))
      .pipe(take(1))
      .subscribe((ok) => {
        if (ok) {
          this.doSave(changes);
        }
      });
  }

  /**
   * Validate the current facets, then — if there are no blocking errors —
   * walk the user through confirmation gates before saving.
   *
   * Gates (in order):
   * 0. Nothing to save, loading failed, busy, or facet editor open → no-op.
   * 1. Validation errors → block save, show results.
   * 2. Validation warnings → ask user to confirm before continuing.
   * 3. Final critical-operation confirmation → always shown.
   */
  public save(): void {
    if (
      !this.dirty() ||
      this.loadFailed() ||
      this.busy() ||
      this.edited()
    ) {
      return;
    }

    this.runValidation()
      .pipe(take(1))
      .subscribe((result) => {
        if (result.hasErrors) {
          // validation result is already displayed; nothing more to do
          return;
        }

        if (result.hasWarnings) {
          const warnCount = result.issues.filter(
            (i) => i.severity === 'warning',
          ).length;
          this._dialogService
            .confirm(
              'Warnings',
              `There ${warnCount === 1 ? 'is 1 warning' : `are ${warnCount} warnings`}. ` +
                'Review the validation results. Proceed anyway?',
            )
            .pipe(take(1))
            .subscribe((ok) => {
              if (ok) {
                this.confirmAndSave();
              }
            });
        } else {
          this.confirmAndSave();
        }
      });
  }
}
