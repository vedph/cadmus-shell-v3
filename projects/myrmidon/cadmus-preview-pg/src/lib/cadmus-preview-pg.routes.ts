import { Routes } from '@angular/router';

import { PartPreviewFeatureComponent } from './components/part-preview-feature/part-preview-feature.component';
import { TextPreviewFeatureComponent } from './components/text-preview-feature/text-preview-feature.component';

// https://github.com/ng-packagr/ng-packagr/issues/778
export const CADMUS_PART_PREVIEW_PG_ROUTES: Routes = [
  {
    path: ':iid/:pid/text',
    pathMatch: 'full',
    component: TextPreviewFeatureComponent,
  },
  {
    path: ':iid/:pid',
    pathMatch: 'full',
    component: PartPreviewFeatureComponent,
  },
];
