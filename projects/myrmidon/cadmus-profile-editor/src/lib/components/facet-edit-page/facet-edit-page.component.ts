import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

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
export class FacetEditPageComponent {}
