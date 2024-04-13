import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

import { NgToolsModule } from '@myrmidon/ng-tools';
import { NgMatToolsModule } from '@myrmidon/ng-mat-tools';

import { CadmusCoreModule } from '@myrmidon/cadmus-core';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';

import { MspOperationComponent } from './msp-operation/msp-operation.component';
import { ApparatusEntryComponent } from './apparatus-entry/apparatus-entry.component';
import { ApparatusFragmentComponent } from './apparatus-fragment/apparatus-fragment.component';
import { OrthographyFragmentComponent } from './orthography-fragment/orthography-fragment.component';
import { QuotationEntryComponent } from './quotation-entry/quotation-entry.component';
import { QuotationsFragmentComponent } from './quotations-fragment/quotations-fragment.component';
import { WitnessesFragmentComponent } from './witnesses-fragment/witnesses-fragment.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgeMonacoModule,
    NgeMarkdownModule,
    // material
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    ClipboardModule,
    // cadmus
    CadmusCoreModule,
    CadmusUiModule,
    NgToolsModule,
    NgMatToolsModule,
  ],
  declarations: [
    ApparatusEntryComponent,
    ApparatusFragmentComponent,
    MspOperationComponent,
    OrthographyFragmentComponent,
    QuotationEntryComponent,
    QuotationsFragmentComponent,
    WitnessesFragmentComponent,
  ],
  exports: [
    ApparatusEntryComponent,
    ApparatusFragmentComponent,
    MspOperationComponent,
    OrthographyFragmentComponent,
    QuotationsFragmentComponent,
    WitnessesFragmentComponent,
  ],
})
export class CadmusPartPhilologyUiModule {}
