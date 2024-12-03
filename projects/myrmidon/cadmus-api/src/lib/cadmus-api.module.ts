import { CommonModule } from '@angular/common';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { NgModule } from '@angular/core';

import { EnvServiceProvider } from '@myrmidon/ngx-tools';
import { CadmusCoreModule } from '@myrmidon/cadmus-core';

@NgModule({
  imports: [
    CommonModule,
    // cadmus
    CadmusCoreModule,
  ],
  providers: [EnvServiceProvider, provideHttpClient(withInterceptorsFromDi())],
})
export class CadmusApiModule {}
