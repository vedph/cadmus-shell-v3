import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr
} from '@angular/common/http';

import { ItemService } from './item.service';

describe('ItemService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [],
      providers: [HttpClient, provideHttpClient(withXhr(), withInterceptorsFromDi())],
    })
  );

  it('should be created', () => {
    const service: ItemService = TestBed.inject(ItemService);
    expect(service).toBeTruthy();
  });
});
