import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CadmusCoreModule } from '@myrmidon/cadmus-core';
import { CadmusApiModule } from '@myrmidon/cadmus-api';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import { CadmusStateModule } from '@myrmidon/cadmus-state';

import { ItemListComponent } from './item-list/item-list.component';
import { ItemFilterComponent } from './item-filter/item-filter.component';

// https://github.com/ng-packagr/ng-packagr/issues/778
export const RouterModuleForChild = RouterModule.forChild([
  { path: '', pathMatch: 'full', component: ItemListComponent },
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
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
    // cadmus
    CadmusCoreModule,
    CadmusApiModule,
    RefLookupComponent,
    CadmusUiModule,
    CadmusStateModule,
  ],
  declarations: [ItemListComponent, ItemFilterComponent],
  exports: [ItemListComponent, ItemFilterComponent],
})
export class CadmusItemListModule {}
