import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

import { ComponentCanDeactivate } from '@myrmidon/cadmus-core';

import { FacetDefinitionListEditorComponent } from '../facet-definition-list-editor/facet-definition-list-editor.component';

@Component({
  selector: 'cadmus-facet-edit-page',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatIcon,
    FacetDefinitionListEditorComponent,
  ],
  templateUrl: './facet-edit-page.component.html',
  styleUrl: './facet-edit-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacetEditPageComponent implements ComponentCanDeactivate {
  private readonly _dirty = signal<boolean>(false);

  public canDeactivate(): boolean {
    return !this._dirty();
  }

  public onDirtyChange(dirty: boolean): void {
    this._dirty.set(dirty);
  }
}
