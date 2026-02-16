import { Routes } from '@angular/router';

import { FacetImportPageComponent } from './facet-import-page/facet-import-page.component';
import { SettingsImportPageComponent } from './settings-import-page/settings-import-page.component';

export const CADMUS_PROFILE_IMPORT_ROUTES: Routes = [
  {
    path: 'facets',
    pathMatch: 'full',
    component: FacetImportPageComponent,
  },
  {
    path: 'settings',
    pathMatch: 'full',
    component: SettingsImportPageComponent,
  },
];
