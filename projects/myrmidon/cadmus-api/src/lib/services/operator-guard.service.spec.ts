import { TestBed } from '@angular/core/testing';

import { OperatorGuardService } from './operator-guard.service';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';

describe('OperatorGuardService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
    imports: [RouterTestingModule],
    providers: [HttpClient, RouterTestingModule, provideHttpClient(withInterceptorsFromDi())]
})
  );

  it('should be created', () => {
    const service: OperatorGuardService = TestBed.inject(OperatorGuardService);
    expect(service).toBeTruthy();
  });
});
