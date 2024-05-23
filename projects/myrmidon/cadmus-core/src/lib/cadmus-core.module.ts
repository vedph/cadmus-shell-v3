import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { NgToolsModule } from '@myrmidon/ng-tools';

import { SortPipe } from './pipes/sort.pipe';

@NgModule({ declarations: [SortPipe],
    exports: [SortPipe], imports: [CommonModule, NgToolsModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class CadmusCoreModule {}
