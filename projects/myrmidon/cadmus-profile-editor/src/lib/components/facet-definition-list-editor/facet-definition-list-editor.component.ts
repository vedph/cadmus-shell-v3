import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, concatMap, take, tap, toArray } from 'rxjs/operators';

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
import { ColorToContrastPipe, EllipsisPipe, StringToColorPipe } from '@myrmidon/ngx-tools';

import { FacetDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings, FacetService } from '@myrmidon/cadmus-api';

import {
  FacetDefinitionValidatorService,
  FacetValidationResult,
} from '../../services/facet-definition-validator.service';
import { FacetDefinitionEditorComponent } from '../facet-definition-editor/facet-definition-editor.component';

/**
 * Editor for a list of facet definitions. Cadmus facet definitions represent the data
 * types of items, and define all the parts which can be included in an item. Some of
 * them are required, others are optional. There can be multiple parts of the same type
 * in the same item, provided that their roleId is different.
 * This editor is used to edit the list of facet definitions from the current profile.
 * As the top level editor, it loads and saves the facet definitions list via API
 * services, and allows to add, edit, delete and reorder facet definitions.
 * The actual editing of a facet definition is delegated to descendant dumb components.
 * All edits happen in memory until the user clicks the Save button, which saves all
 * facet definitions to the server, and shows the result of the operation.
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
    StringToColorPipe,
    FacetDefinitionEditorComponent,
  ],
  templateUrl: './facet-definition-list-editor.component.html',
  styleUrl: './facet-definition-list-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacetDefinitionListEditorComponent implements OnInit {
  public readonly edited = signal<FacetDefinition | undefined>(undefined);
  public readonly editedIndex = signal<number>(-1);
  public readonly dirty = signal<boolean>(false);
  public readonly facets = signal<FacetDefinition[]>([]);
  public readonly busy = signal<boolean>(false);
  public readonly saveResult = signal<string | undefined>(undefined);
  /** True after at least one facet was successfully saved; prompts an app reload. */
  public readonly reloadNeeded = signal<boolean>(false);
  /** Last validation result, set by validate() and by save(). */
  public readonly validationResult = signal<FacetValidationResult | undefined>(
    undefined,
  );

  /**
   * The facet models settings, used to get the list of available part type IDs,
   * and whether they are base text parts; in this case, the same settings also
   * provide the list of their available role IDs from the fragments property.
   */
  public readonly facetModelSettings = signal<FacetModelSettings | undefined>(
    undefined,
  );

  public readonly editorClose = output<void>();

  constructor(
    private _dialogService: DialogService,
    private _facetService: FacetService,
    private _validator: FacetDefinitionValidatorService,
    private _snackbar: MatSnackBar,
  ) {}

  public ngOnInit(): void {
    // load facets once at start
    this.busy.set(true);
    this._facetService.getFacets().subscribe({
      next: (facets) => {
        this.facets.set(facets);
        this.busy.set(false);
      },
      error: (error) => {
        console.error(error);
        this.busy.set(false);
        this._snackbar.open('Error loading facets', 'Close');
      },
    });

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

  public addFacet(): void {
    const entry: FacetDefinition = {
      id: 'new',
      label: 'New facet',
      colorKey: 'default',
      description: '',
      partDefinitions: [],
    };
    this.editedIndex.set(-1);
    this.edited.set(entry);
  }

  public editFacet(facet: FacetDefinition, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(facet));
  }

  public closeFacet(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveFacet(facet: FacetDefinition): void {
    const entries = [...this.facets()];
    if (this.editedIndex() === -1) {
      entries.push(facet);
    } else {
      entries.splice(this.editedIndex(), 1, facet);
    }
    this.facets.set(entries);
    this.closeFacet();
    this.dirty.set(true);
  }

  public deleteFacet(index: number): void {
    this._dialogService
      .confirm('Confirmation', `Delete facet ${this.edited()?.label}?`)
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closeFacet();
          }
          const entries = [...this.facets()];
          entries.splice(index, 1);
          this.facets.set(entries);
          this.dirty.set(true);
        }
      });
  }

  public moveFacetUp(index: number): void {
    if (index < 1) {
      return;
    }
    const facet = this.facets()[index];
    const facets = [...this.facets()];
    facets.splice(index, 1);
    facets.splice(index - 1, 0, facet);
    this.facets.set(facets);
    this.dirty.set(true);
    // keep editedIndex in sync
    if (this.editedIndex() === index) {
      this.editedIndex.set(index - 1);
    } else if (this.editedIndex() === index - 1) {
      this.editedIndex.set(index);
    }
  }

  public moveFacetDown(index: number): void {
    if (index + 1 >= this.facets().length) {
      return;
    }
    const facet = this.facets()[index];
    const facets = [...this.facets()];
    facets.splice(index, 1);
    facets.splice(index + 1, 0, facet);
    this.facets.set(facets);
    this.dirty.set(true);
    // keep editedIndex in sync
    if (this.editedIndex() === index) {
      this.editedIndex.set(index + 1);
    } else if (this.editedIndex() === index + 1) {
      this.editedIndex.set(index);
    }
  }

  public reloadApp(): void {
    window.location.href = '/';
  }

  public close(): void {
    this.editorClose.emit();
  }

  /** Run validation and update validationResult; returns the observable. */
  private runValidation() {
    return this._validator
      .validate(this.facets(), this.facetModelSettings())
      .pipe(tap((result) => this.validationResult.set(result)));
  }

  /** Trigger validation from the template and update the displayed result. */
  public validate(): void {
    this.runValidation().pipe(take(1)).subscribe();
  }

  /** Persist all facets to the server; called only after all gates pass. */
  private doSave(): void {
    const facets = this.facets();
    this.busy.set(true);
    this.saveResult.set(undefined);

    from(facets)
      .pipe(
        concatMap((facet) =>
          this._facetService.addFacet(facet).pipe(catchError(() => of(null))),
        ),
        toArray(),
      )
      .subscribe((results) => {
        const saved: string[] = [];
        const failed: string[] = [];
        results.forEach((result, i) => {
          if (result) {
            saved.push(facets[i].id);
          } else {
            failed.push(facets[i].id);
          }
        });
        this.busy.set(false);
        this.dirty.set(failed.length > 0);
        if (saved.length > 0) {
          this.reloadNeeded.set(true);
        }
        const parts: string[] = [];
        if (saved.length) {
          parts.push(`Saved: ${saved.join(', ')}`);
        }
        if (failed.length) {
          parts.push(`Failed: ${failed.join(', ')}`);
        }
        this.saveResult.set(parts.join(' | '));
      });
  }

  /**
   * Final confirmation gate before the actual write.
   * Always shown, even when there are no warnings or errors.
   */
  private confirmAndSave(): void {
    this._dialogService
      .confirm(
        'Save facets',
        'Saving replaces ALL facet definitions on the server. ' +
          'This may affect every item in the database. Proceed?',
      )
      .subscribe((ok) => {
        if (ok) {
          this.doSave();
        }
      });
  }

  public downloadFacets(): void {
    const replacer = (_key: string, value: unknown) =>
      value === null || value === false ? undefined : value;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(this.facets(), replacer, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', 'facets.json');
    dlAnchorElem.click();
  }

  /**
   * Validate the current facets, then — if there are no blocking errors —
   * walk the user through confirmation gates before saving.
   *
   * Gates (in order):
   * 1. Validation errors → block save, show results.
   * 2. Validation warnings → ask user to confirm before continuing.
   * 3. Final critical-operation confirmation → always shown.
   */
  public save(): void {
    if (!this.facets().length) {
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
                'Review the validation results below. Proceed anyway?',
            )
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
