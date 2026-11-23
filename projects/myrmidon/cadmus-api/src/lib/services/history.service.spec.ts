import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { EnvService } from '@myrmidon/ngx-tools';
import { EditStatus } from '@myrmidon/cadmus-core';

import { HistoryService } from './history.service';

describe('HistoryService', () => {
  let service: HistoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnvService, useValue: { get: () => 'http://api/' } },
      ],
    });
    service = TestBed.inject(HistoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getItemHistory should get a page with the time range', () => {
    const min = new Date('2026-11-01T00:00:00.000Z');
    const max = new Date('2026-11-08T00:00:00.000Z');
    let total: number | undefined;

    service
      .getItemHistory('i1', { minModified: min, maxModified: max }, 2, 50)
      .subscribe((page) => (total = page.total));

    const req = http.expectOne(
      (r) => r.url === 'http://api/items/i1/history',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pageNumber')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('50');
    expect(req.request.params.get('minModified')).toBe(min.toISOString());
    expect(req.request.params.get('maxModified')).toBe(max.toISOString());
    expect(req.request.params.has('userId')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ pageNumber: 2, pageSize: 50, pageCount: 1, total: 3, items: [] });
    expect(total).toBe(3);
  });

  it('getPartHistory should clamp the page size and pass user and status', () => {
    service
      .getPartHistory('p1', { userId: 'zeus', status: EditStatus.created }, 1, 500)
      .subscribe();

    const req = http.expectOne((r) => r.url === 'http://api/parts/p1/history');
    expect(req.request.params.get('pageSize')).toBe('100');
    expect(req.request.params.get('userId')).toBe('zeus');
    expect(req.request.params.get('status')).toBe('0');
    req.flush({ pageNumber: 1, pageSize: 100, pageCount: 0, total: 0, items: [] });
  });

  it('getHistoryItem should get by history ID', () => {
    let title: string | undefined;
    service.getHistoryItem('h1').subscribe((i) => (title = i.title));
    http.expectOne('http://api/history/items/h1').flush({ id: 'h1', title: 'T' });
    expect(title).toBe('T');
  });

  it('getHistoryPart should get by history ID', () => {
    let partId: string | undefined;
    service.getHistoryPart('h2').subscribe((p) => (partId = p.part.id));
    http
      .expectOne('http://api/history/parts/h2')
      .flush({ id: 'h2', referenceId: 'p1', part: { id: 'p1' } });
    expect(partId).toBe('p1');
  });
});
