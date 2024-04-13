import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';

import { AuthJwtAdminGuardService } from '@myrmidon/auth-jwt-login';
import { CadmusFlagsUiModule } from '@myrmidon/cadmus-flags-ui';

import { FlagsEditorFeatureComponent } from './components/flags-editor-feature/flags-editor-feature.component';

// https://github.com/ng-packagr/ng-packagr/issues/778
export const RouterModuleForChild = RouterModule.forChild([
  {
    path: '',
    pathMatch: 'full',
    component: FlagsEditorFeatureComponent,
    canActivate: [AuthJwtAdminGuardService],
  },
]);

@NgModule({
  declarations: [FlagsEditorFeatureComponent],
  imports: [MatCardModule, CadmusFlagsUiModule, RouterModuleForChild],
  exports: [FlagsEditorFeatureComponent],
})
export class CadmusFlagsPgModule {}
