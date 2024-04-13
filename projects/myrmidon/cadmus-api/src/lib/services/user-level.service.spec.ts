import { TestBed } from '@angular/core/testing';

import { UserLevelService } from './user-level.service';

describe('UserLevelService', () => {
  let service: UserLevelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserLevelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
