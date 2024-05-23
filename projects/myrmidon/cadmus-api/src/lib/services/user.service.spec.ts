import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

xdescribe('Service: User', () => {
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
    const service: UserService = TestBed.inject(UserService);
    expect(service).toBeTruthy();
  });
});
