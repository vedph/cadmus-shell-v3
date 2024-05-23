import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { EnvServiceProvider, NgToolsModule } from '@myrmidon/ng-tools';
import { AuthJwtLoginModule } from '@myrmidon/auth-jwt-login';
import { CadmusCoreModule } from '@myrmidon/cadmus-core';

@NgModule({ imports: [CommonModule,
        // cadmus
        CadmusCoreModule,
        NgToolsModule,
        AuthJwtLoginModule], providers: [EnvServiceProvider, provideHttpClient(withInterceptorsFromDi())] })
export class CadmusApiModule {}
