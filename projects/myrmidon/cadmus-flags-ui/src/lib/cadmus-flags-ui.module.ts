import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { CadmusApiModule } from '@myrmidon/cadmus-api';
import { CadmusStateModule } from '@myrmidon/cadmus-state';

import { FlagDefinitionEditorComponent } from './components/flag-definition-editor/flag-definition-editor.component';
import { FlagListComponent } from './components/flag-list/flag-list.component';
import { FlagBitPipe } from './pipes/flag-bit.pipe';

@NgModule({
  declarations: [FlagDefinitionEditorComponent, FlagListComponent, FlagBitPipe],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    // material
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
    // Cadmus
    CadmusApiModule,
    CadmusStateModule,
  ],
  exports: [FlagDefinitionEditorComponent, FlagListComponent, FlagBitPipe],
})
export class CadmusFlagsUiModule {}
