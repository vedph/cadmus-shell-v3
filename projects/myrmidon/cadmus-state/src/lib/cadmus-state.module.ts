import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CadmusCoreModule } from '@myrmidon/cadmus-core';
import { CadmusApiModule } from '@myrmidon/cadmus-api';

@NgModule({
  imports: [
    CommonModule,
    // Cadmus
    CadmusCoreModule,
    CadmusApiModule,
  ],
})
export class CadmusStateModule {}
