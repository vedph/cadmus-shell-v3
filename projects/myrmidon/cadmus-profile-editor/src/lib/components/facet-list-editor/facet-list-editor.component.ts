import { Component, output, signal } from '@angular/core';

// material
import { MatSnackBar } from '@angular/material/snack-bar';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { FacetDefinition } from '@myrmidon/cadmus-core';
import { FacetService } from '@myrmidon/cadmus-api';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { ColorToContrastPipe, StringToColorPipe } from '@myrmidon/ngx-tools';

import { FacetDefinitionEditorComponent } from '../facet-definition-editor/facet-definition-editor.component';

/**
 * Editor for a list of facets. Cadmus facets represent the data types
 * of items, and define all the parts which can be included in an item.
 * This editor is used to edit the list of facets from the current profile.
 * As the top level editor, it loads and saves the facets list, and allows
 * to add, edit, delete and reorder facets. The actual editing of a facet
 * is delegated to the FacetDefinitionEditorComponent.
 */
@Component({
  selector: 'cadmus-facet-list-editor',
  imports: [
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatIcon,
    MatTooltip,
    ColorToContrastPipe,
    StringToColorPipe,
    FacetDefinitionEditorComponent,
  ],
  templateUrl: './facet-list-editor.component.html',
  styleUrl: './facet-list-editor.component.css',
})
export class FacetListEditorComponent {
  public readonly edited = signal<FacetDefinition | undefined>(undefined);
  public readonly editedIndex = signal<number>(-1);
  public readonly dirty = signal<boolean>(false);
  public readonly facets = signal<FacetDefinition[]>([]);
  public readonly busy = signal<boolean>(false);

  public readonly editorClose = output<void>();

  constructor(
    private _dialogService: DialogService,
    private _facetService: FacetService,
    private _snackbar: MatSnackBar,
  ) {}

  public ngOnInit(): void {
    // load facets once at start
    this.busy.set(true);
    this._facetService.getFacets().subscribe(
      (facets) => {
        this.facets.set(facets);
        this.busy.set(false);
      },
      (error) => {
        console.error(error);
        this.busy.set(false);
        this._snackbar.open('Error loading facets', 'Close');
      },
    );
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
      .confirm('Confirmation', 'Delete Facet?')
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

  public close(): void {
    this.editorClose.emit();
  }
}
