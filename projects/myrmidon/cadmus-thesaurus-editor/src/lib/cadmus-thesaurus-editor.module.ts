import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Route } from '@angular/router';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { NgToolsModule } from '@myrmidon/ng-tools';
import { NgMatToolsModule } from '@myrmidon/ng-mat-tools';

import { CadmusApiModule } from '@myrmidon/cadmus-api';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';
import { CadmusStateModule } from '@myrmidon/cadmus-state';
import { CadmusThesaurusUiModule } from '@myrmidon/cadmus-thesaurus-ui';

import { ThesaurusEditorFeatureComponent } from './thesaurus-editor-feature/thesaurus-editor-feature.component';

// https://github.com/ng-packagr/ng-packagr/issues/778
export const RouterModuleForChild = RouterModule.forChild([
  { path: '', pathMatch: 'full', component: ThesaurusEditorFeatureComponent },
]);

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModuleForChild,
    // material
    MatAutocompleteModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    // cadmus
    CadmusApiModule,
    CadmusStateModule,
    CadmusThesaurusUiModule,
    CadmusUiModule,
    NgToolsModule,
    NgMatToolsModule,
  ],
  declarations: [ThesaurusEditorFeatureComponent],
  exports: [ThesaurusEditorFeatureComponent],
})
export class CadmusThesaurusEditorModule {}
