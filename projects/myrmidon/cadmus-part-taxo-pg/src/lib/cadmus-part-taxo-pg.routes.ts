import { Routes } from '@angular/router';

import {
  TAXO_STORE_NODES_PART_TYPEID,
  TaxoStoreNodesPartFeatureComponent,
} from '@myrmidon/cadmus-part-taxo-ui';

// cadmus
import { pendingChangesGuard } from '@myrmidon/cadmus-core';

export const CADMUS_PART_TAXO_PG_ROUTES: Routes = [
  {
    path: `${TAXO_STORE_NODES_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: TaxoStoreNodesPartFeatureComponent,
    canDeactivate: [pendingChangesGuard],
  },
];
