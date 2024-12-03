import { CommonModule } from '@angular/common';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { NgModule } from '@angular/core';

import { SortPipe } from './pipes/sort.pipe';

@NgModule({
  declarations: [SortPipe],
  exports: [SortPipe],
  imports: [CommonModule],
  providers: [provideHttpClient(withInterceptorsFromDi())],
})
export class CadmusCoreModule {}
