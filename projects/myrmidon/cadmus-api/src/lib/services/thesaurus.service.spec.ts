import { TestBed } from '@angular/core/testing';

import { ThesaurusService } from './thesaurus.service';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

xdescribe('TagService', () => {
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
    const service: ThesaurusService = TestBed.inject(ThesaurusService);
    expect(service).toBeTruthy();
  });
});
