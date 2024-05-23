import { TestBed } from '@angular/core/testing';

import { EditorGuardService } from './editor-guard.service';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';

describe('EditorGuardService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
    imports: [RouterTestingModule],
    providers: [HttpClient, RouterTestingModule, provideHttpClient(withInterceptorsFromDi())]
})
  );

  it('should be created', () => {
    const service: EditorGuardService = TestBed.inject(EditorGuardService);
    expect(service).toBeTruthy();
  });
});
