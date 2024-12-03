import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CadmusApiModule } from '@myrmidon/cadmus-api';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';

import { ThesaurusFilterComponent } from './thesaurus-filter/thesaurus-filter.component';
import { ThesaurusListComponent } from './thesaurus-list/thesaurus-list.component';
import { ThesaurusImportComponent } from './thesaurus-import/thesaurus-import.component';

// https://github.com/ng-packagr/ng-packagr/issues/778
export const RouterModuleForChild = RouterModule.forChild([
  { path: '', pathMatch: 'full', component: ThesaurusListComponent },
]);

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModuleForChild,
    // material
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    // cadmus
    CadmusApiModule,
    CadmusUiModule,
  ],
  declarations: [
    ThesaurusListComponent,
    ThesaurusFilterComponent,
    ThesaurusImportComponent,
  ],
  exports: [
    ThesaurusListComponent,
    ThesaurusFilterComponent,
    ThesaurusImportComponent,
  ],
})
export class CadmusThesaurusListModule {}
