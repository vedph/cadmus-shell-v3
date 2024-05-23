import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { FlagService } from './flag.service';

describe('FlagService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [
        HttpClient,
        { provide: 'apiEndpoint', useValue: 'none' },
        { provide: 'databaseId', useValue: 'cadmus' },
        provideHttpClient(withInterceptorsFromDi()),
    ]
});
  });

  it('should be created', () => {
    const service: FlagService = TestBed.inject(FlagService);
    expect(service).toBeTruthy();
  });
});
