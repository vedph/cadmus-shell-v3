import { TestBed } from '@angular/core/testing';

import { UserRefLookupService } from './user-ref-lookup.service';

describe('UserRefLookupService', () => {
  let service: UserRefLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserRefLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
