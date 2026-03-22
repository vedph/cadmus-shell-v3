import { Routes } from '@angular/router';

import { pendingChangesGuard } from '@myrmidon/cadmus-core';

import { FacetEditPageComponent } from './components/facet-edit-page/facet-edit-page.component';

export const CADMUS_PROFILE_EDIT_ROUTES: Routes = [
  {
    path: 'facets',
    pathMatch: 'full',
    component: FacetEditPageComponent,
    canDeactivate: [pendingChangesGuard],
  },
];
