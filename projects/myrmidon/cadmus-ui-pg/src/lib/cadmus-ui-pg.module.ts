import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { CadmusCoreModule } from '@myrmidon/cadmus-core';
import { CadmusApiModule } from '@myrmidon/cadmus-api';
import { CadmusStateModule } from '@myrmidon/cadmus-state';

import { CurrentItemBarComponent } from './components/current-item-bar/current-item-bar.component';
import { CurrentLayerPartBarComponent } from './components/current-layer-part-bar/current-layer-part-bar.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    // cadmus
    CadmusApiModule,
    CadmusCoreModule,
    CadmusStateModule,
  ],
  declarations: [CurrentItemBarComponent, CurrentLayerPartBarComponent],
  exports: [CurrentItemBarComponent, CurrentLayerPartBarComponent],
})
export class CadmusUiPgModule {}
