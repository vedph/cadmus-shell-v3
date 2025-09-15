import { Routes } from '@angular/router';

import { pendingChangesGuard } from '@myrmidon/cadmus-core';
import {
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
export const CADMUS_PART_PHILOLOGY_PG_ROUTES: Routes = [
  {
    path: `fragment/:pid/${APPARATUS_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: ApparatusFragmentFeatureComponent,
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: `fragment/:pid/${ORTHOGRAPHY_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: OrthographyFragmentFeatureComponent,
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: `fragment/:pid/${QUOTATIONS_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: QuotationsFragmentFeatureComponent,
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: `fragment/:pid/${WITNESSES_FRAGMENT_TYPEID}/:loc`,
    pathMatch: 'full',
    component: WitnessesFragmentFeatureComponent,
    canDeactivate: [pendingChangesGuard],
  },
];
