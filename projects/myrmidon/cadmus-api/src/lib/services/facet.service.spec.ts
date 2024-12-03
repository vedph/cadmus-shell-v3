import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { EnvServiceProvider } from '@myrmidon/ngx-tools';

import { FacetService } from './facet.service';

describe('FacetService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [HttpClient, EnvServiceProvider, provideHttpClient(withInterceptorsFromDi())]
});
  });

  it('should be created', () => {
    const service: FacetService = TestBed.inject(FacetService);
    expect(service).toBeTruthy();
  });
});
