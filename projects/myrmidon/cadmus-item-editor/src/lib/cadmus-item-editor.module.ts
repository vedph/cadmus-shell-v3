import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Route } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NgToolsModule } from '@myrmidon/ng-tools';
import { NgMatToolsModule } from '@myrmidon/ng-mat-tools';
import { PagedDataBrowsersModule } from '@myrmidon/paged-data-browsers';

import { CadmusCoreModule } from '@myrmidon/cadmus-core';
import { CadmusApiModule } from '@myrmidon/cadmus-api';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';
import { CadmusStateModule } from '@myrmidon/cadmus-state';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { ItemEditorComponent } from './item-editor/item-editor.component';
import { PartsScopeEditorComponent } from './parts-scope-editor/parts-scope-editor.component';
import { MissingPartsComponent } from './missing-parts/missing-parts.component';
import { HasPreviewPipe } from './has-preview.pipe';
import { ItemLookupDialogComponent } from './item-lookup-dialog/item-lookup-dialog.component';

// https://github.com/ng-packagr/ng-packagr/issues/778
export const RouterModuleForChild = RouterModule.forChild([
  { path: '', pathMatch: 'full', component: ItemEditorComponent },
]);

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModuleForChild,
    ClipboardModule,
    // material
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatDividerModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    // cadmus
    NgToolsModule,
    NgMatToolsModule,
    PagedDataBrowsersModule,
    CadmusCoreModule,
    CadmusApiModule,
    CadmusUiModule,
    CadmusStateModule,
    RefLookupComponent,
  ],
  declarations: [
    ItemEditorComponent,
    ItemLookupDialogComponent,
    MissingPartsComponent,
    PartsScopeEditorComponent,
    HasPreviewPipe,
  ],
  exports: [ItemEditorComponent, ItemLookupDialogComponent],
})
export class CadmusItemEditorModule {}
