import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// material
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatNestedTreeNode, MatTreeModule } from '@angular/material/tree';

import { SafeHtmlPipe } from '@myrmidon/ngx-tools';

// cadmus
import { CadmusCoreModule } from '@myrmidon/cadmus-core';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { CloseSaveButtonsComponent } from './components/close-save-buttons/close-save-buttons.component';
import { ErrorListComponent } from './components/error-list/error-list.component';
import { FacetBadgeComponent } from './components/facet-badge/facet-badge.component';
import { FlagsBadgeComponent } from './components/flags-badge/flags-badge.component';
import { DecoratedTokenTextComponent } from './components/decorated-token-text/decorated-token-text.component';
import { LayerHintsComponent } from './components/layer-hints/layer-hints.component';
import { LookupPinComponent } from './components/lookup-pin/lookup-pin.component';
import { PartBadgeComponent } from './components/part-badge/part-badge.component';
import { ThesaurusTreeComponent } from './components/thesaurus-tree/thesaurus-tree.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    // material
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNestedTreeNode,
    MatSelectModule,
    MatTreeModule,
    MatTooltipModule,
    // Cadmus
    CadmusCoreModule,
    RefLookupComponent,
    SafeHtmlPipe,
  ],
  declarations: [
    CloseSaveButtonsComponent,
    DecoratedTokenTextComponent,
    ErrorListComponent,
    FacetBadgeComponent,
    FlagsBadgeComponent,
    LayerHintsComponent,
    LookupPinComponent,
    PartBadgeComponent,
    ThesaurusTreeComponent,
  ],
  exports: [
    CloseSaveButtonsComponent,
    DecoratedTokenTextComponent,
    ErrorListComponent,
    FacetBadgeComponent,
    FlagsBadgeComponent,
    LayerHintsComponent,
    LookupPinComponent,
    PartBadgeComponent,
    ThesaurusTreeComponent,
  ],
})
export class CadmusUiModule {}
