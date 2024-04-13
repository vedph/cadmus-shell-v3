import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Route } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';

import { NgToolsModule } from '@myrmidon/ng-tools';
import { NgMatToolsModule } from '@myrmidon/ng-mat-tools';

import { CadmusCoreModule, PendingChangesGuard } from '@myrmidon/cadmus-core';
import { CadmusStateModule } from '@myrmidon/cadmus-state';
import { CadmusUiPgModule } from '@myrmidon/cadmus-ui-pg';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';
import {
  CadmusPartPhilologyUiModule,
  APPARATUS_FRAGMENT_TYPEID,
  ORTHOGRAPHY_FRAGMENT_TYPEID,
  WITNESSES_FRAGMENT_TYPEID,
  QUOTATIONS_FRAGMENT_TYPEID,
} from '@myrmidon/cadmus-part-philology-ui';

import { ApparatusFragmentFeatureComponent } from './apparatus-fragment-feature/apparatus-fragment-feature.component';
import { OrthographyFragmentFeatureComponent } from './orthography-fragment-feature/orthography-fragment-feature.component';
import { WitnessesFragmentFeatureComponent } from './witnesses-fragment-feature/witnesses-fragment-feature.component';
import { QuotationsFragmentFeatureComponent } from './quotations-fragment-feature/quotations-fragment-feature.component';

// https://github.com/ng-packagr/ng-packagr/issues/778
export const RouterModuleForChild = RouterModule.forChild([
  {
    path: `fragment/:pid/${APPARATUS_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: ApparatusFragmentFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `fragment/:pid/${ORTHOGRAPHY_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: OrthographyFragmentFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `fragment/:pid/${QUOTATIONS_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: QuotationsFragmentFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: `fragment/:pid/${WITNESSES_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: WitnessesFragmentFeatureComponent,
    canDeactivate: [PendingChangesGuard],
  },
]);

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModuleForChild,
    // material
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    MatToolbarModule,
    // cadmus
    CadmusCoreModule,
    CadmusUiModule,
    CadmusPartPhilologyUiModule,
    CadmusStateModule,
    CadmusUiPgModule,
    NgToolsModule,
    NgMatToolsModule,
  ],
  declarations: [
    ApparatusFragmentFeatureComponent,
    OrthographyFragmentFeatureComponent,
    QuotationsFragmentFeatureComponent,
    WitnessesFragmentFeatureComponent,
  ],
  exports: [
    ApparatusFragmentFeatureComponent,
    OrthographyFragmentFeatureComponent,
    QuotationsFragmentFeatureComponent,
    WitnessesFragmentFeatureComponent,
  ],
})
export class CadmusPartPhilologyPgModule {}
