import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CadmusUiModule } from '@myrmidon/cadmus-ui';

import { ThesaurusEditorComponent } from './components/thesaurus-editor/thesaurus-editor.component';
import { ThesaurusLookupComponent } from './components/thesaurus-lookup/thesaurus-lookup.component';
import { ThesaurusNodeComponent } from './components/thesaurus-node/thesaurus-node.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    // material
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTooltipModule,
    // cadmus
    CadmusUiModule,
  ],
  declarations: [
    ThesaurusEditorComponent,
    ThesaurusLookupComponent,
    ThesaurusNodeComponent,
  ],
  exports: [
    ThesaurusEditorComponent,
    ThesaurusLookupComponent,
    ThesaurusNodeComponent,
  ],
})
export class CadmusThesaurusUiModule {}
