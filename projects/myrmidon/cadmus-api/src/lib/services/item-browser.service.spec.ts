import { TestBed } from '@angular/core/testing';

import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { CadmusCoreModule } from '@myrmidon/cadmus-core';

import { ItemBrowserService } from './item-browser.service';

describe('ItemBrowserService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
    imports: [CadmusCoreModule],
    providers: [HttpClient, provideHttpClient(withInterceptorsFromDi())]
})
  );
  it('should be created', () => {
    const service: ItemBrowserService = TestBed.inject(ItemBrowserService);
    expect(service).toBeTruthy();
  });
});
