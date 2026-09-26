import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { EnvService } from '@myrmidon/ngx-tools';

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

describe('ItemService download/upload', () => {
  let service: ItemService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnvService, useValue: { get: () => 'http://api/' } },
      ],
    });
    service = TestBed.inject(ItemService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('downloadItem should get the item file as a blob with parts', () => {
    const blob = new Blob(['{}']);
    let result: Blob | undefined;

    service.downloadItem('x1').subscribe((b) => (result = b));

    const req = http.expectOne('http://api/items/x1/download?parts=true');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(blob);
    expect(result).toBe(blob);
  });

  it('downloadItem should fail with a status message', () => {
    let error: string | undefined;

    service.downloadItem('x1', false).subscribe({ error: (e) => (error = e) });

    http
      .expectOne('http://api/items/x1/download?parts=false')
      .flush(new Blob(), { status: 404, statusText: 'Not Found' });
    expect(error).toBe('Server error 404: Not Found');
  });

  it('uploadItem should post the file as form data', () => {
    const file = new File(['{}'], 'item.json');
    let title: string | undefined;

    service.uploadItem(file).subscribe((item) => (title = item.title));

    const req = http.expectOne('http://api/items/upload');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('file')).toBeInstanceOf(File);
    req.flush({ id: 'x1', title: 'Item' });
    expect(title).toBe('Item');
  });

  it('uploadItem should fail with the problem details from the server', () => {
    let error: string | undefined;

    service
      .uploadItem(new File(['{}'], 'item.json'))
      .subscribe({ error: (e) => (error = e) });

    http.expectOne('http://api/items/upload').flush(
      { title: 'Item already exists', detail: 'Item x1 already exists' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(error).toBe('Item x1 already exists');
  });
});
