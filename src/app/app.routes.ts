import { Routes } from '@angular/router';

// myrmidon
import {
  AuthJwtAdminGuardService,
  AuthJwtGuardService,
} from '@myrmidon/auth-jwt-login';

// libraries in this workspace
import { EditorGuardService } from '../../projects/myrmidon/cadmus-api/src/public-api';
import { PendingChangesGuard } from '../../projects/myrmidon/cadmus-core/src/public-api';

// locals
import { HomeComponent } from './home/home.component';
import { ManageUsersPageComponent } from './manage-users-page/manage-users-page.component';
import { RegisterUserPageComponent } from './register-user-page/register-user-page.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { LoginPageComponent } from './login-page/login-page.component';
import { EditFrameStatsPageComponent } from './edit-frame-stats-page/edit-frame-stats-page.component';
import { GraphDemoPageComponent } from './graph-demo-page/graph-demo-page.component';

export const routes: Routes = [
  // auth
  { path: 'login', component: LoginPageComponent },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    canActivate: [AuthJwtGuardService],
  },
  {
    path: 'register-user',
    component: RegisterUserPageComponent,
    canActivate: [AuthJwtAdminGuardService],
  },
  {
    path: 'manage-users',
    component: ManageUsersPageComponent,
    canActivate: [AuthJwtAdminGuardService],
  },
  {
    path: 'stats',
    component: EditFrameStatsPageComponent,
    canActivate: [AuthJwtGuardService],
  },
  // cadmus
  {
    path: 'demo/layers',
    loadComponent: () =>
      import('@myrmidon/cadmus-layer-demo').then(
        (module) => module.LayerDemoComponent
      ),
  },
  {
    path: 'demo/graph',
    component: GraphDemoPageComponent,
    canActivate: [AuthJwtGuardService],
  },
  // cadmus - items
  {
    path: 'items/:id',
    loadComponent: () =>
      import('@myrmidon/cadmus-item-editor').then(
        (module) => module.ItemEditorComponent
      ),
    canActivate: [AuthJwtGuardService],
    canDeactivate: [PendingChangesGuard],
  },
  {
    path: 'items',
    loadComponent: () =>
      import('@myrmidon/cadmus-item-list').then(
        (module) => module.ItemListComponent
      ),
    canActivate: [AuthJwtGuardService],
  },
  {
    path: 'search',
    loadComponent: () =>
      import('@myrmidon/cadmus-item-search').then(
        (module) => module.ItemSearchComponent
      ),
    canActivate: [AuthJwtGuardService],
  },
  // cadmus - thesauri
  {
    path: 'thesauri/:id',
    loadComponent: () =>
      import('@myrmidon/cadmus-thesaurus-editor').then(
        (module) => module.ThesaurusEditorFeatureComponent
      ),
    canActivate: [EditorGuardService],
  },
  {
    path: 'thesauri',
    loadComponent: () =>
      import('@myrmidon/cadmus-thesaurus-list').then(
        (module) => module.ThesaurusListComponent
      ),
    canActivate: [EditorGuardService],
  },
  // cadmus - parts
  {
    path: 'items/:iid/general',
    loadChildren: () =>
      import('@myrmidon/cadmus-part-general-pg').then(
        (module) => module.CadmusPartGeneralPgModule
      ),
    canActivate: [AuthJwtGuardService],
  },
  {
    path: 'items/:iid/philology',
    loadChildren: () =>
      import('@myrmidon/cadmus-part-philology-pg').then(
        (module) => module.CadmusPartPhilologyPgModule
      ),
    canActivate: [AuthJwtGuardService],
  },
  // cadmus - graph
  {
    path: 'graph',
    loadComponent: () =>
      import('@myrmidon/cadmus-graph-pg-ex').then(
        (module) => module.GraphEditorExFeatureComponent
      ),
    canActivate: [AuthJwtGuardService],
  },
  // cadmus - preview
  {
    path: 'preview',
    loadChildren: () =>
      import('@myrmidon/cadmus-preview-pg').then(
        (module) => module.CadmusPreviewPgModule
      ),
    canActivate: [AuthJwtGuardService],
  },
  // cadmus - flags
  {
    path: 'flags',
    loadComponent: () =>
      import('@myrmidon/cadmus-flags-pg').then(
        (module) => module.FlagsEditorFeatureComponent
      ),
    canActivate: [AuthJwtGuardService],
  },
  // home
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  // fallback
  { path: '**', component: HomeComponent },
];
