import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// material
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NgToolsModule } from '@myrmidon/ng-tools';
import { NgMatToolsModule } from '@myrmidon/ng-mat-tools';
import { CadmusApiModule } from '@myrmidon/cadmus-api';
import { PagedDataBrowsersModule } from '@myrmidon/paged-data-browsers';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { GraphNodeFilterComponent } from './components/graph-node-filter/graph-node-filter.component';
import { GraphNodeListComponent } from './components/graph-node-list/graph-node-list.component';
import { GraphNodeEditorComponent } from './components/graph-node-editor/graph-node-editor.component';
import { GraphTripleFilterComponent } from './components/graph-triple-filter/graph-triple-filter.component';
import { GraphTripleListComponent } from './components/graph-triple-list/graph-triple-list.component';
import { GraphTripleEditorComponent } from './components/graph-triple-editor/graph-triple-editor.component';

@NgModule({
  declarations: [
    GraphNodeFilterComponent,
    GraphNodeListComponent,
    GraphNodeEditorComponent,
    GraphTripleFilterComponent,
    GraphTripleListComponent,
    GraphTripleEditorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    // material
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
    // Cadmus
    CadmusApiModule,
    RefLookupComponent,
    NgToolsModule,
    NgMatToolsModule,
    PagedDataBrowsersModule
  ],
  exports: [
    // GraphNodeFilterComponent,
    GraphNodeListComponent,
    GraphNodeEditorComponent,
    // GraphTripleFilterComponent,
    GraphTripleListComponent,
    GraphTripleEditorComponent,
  ],
})
export class CadmusGraphUiModule {}
