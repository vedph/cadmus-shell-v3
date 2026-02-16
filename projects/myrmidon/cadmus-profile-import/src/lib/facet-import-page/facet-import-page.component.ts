import { ChangeDetectionStrategy, Component } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { FacetImportComponent } from '../facet-import/facet-import.component';

@Component({
  selector: 'cadmus-facet-import-page',
  templateUrl: './facet-import-page.component.html',
  styleUrls: ['./facet-import-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule, FacetImportComponent],
})
export class FacetImportPageComponent {}
