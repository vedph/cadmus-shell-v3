import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { EnvServiceProvider, NgToolsModule } from '@myrmidon/ng-tools';
import { AuthJwtLoginModule } from '@myrmidon/auth-jwt-login';
import { CadmusCoreModule } from '@myrmidon/cadmus-core';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    // cadmus
    CadmusCoreModule,
    NgToolsModule,
    AuthJwtLoginModule
  ],
  providers: [EnvServiceProvider],
})
export class CadmusApiModule {}
