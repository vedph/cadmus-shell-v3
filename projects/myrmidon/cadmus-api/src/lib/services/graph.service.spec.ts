import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { EnvService } from '@myrmidon/ngx-tools';

import { GraphService } from './graph.service';

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EnvService, useValue: { get: () => 'http://api/' } },
      ],
    });
    service = TestBed.inject(GraphService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send 0 min/max literal numbers', () => {
    const http = TestBed.inject(HttpTestingController);
    service
      .getLinkedLiterals(1, 10, {
        minLiteralNumber: 0,
        maxLiteralNumber: 0,
      } as any)
      .subscribe();
    const req = http.expectOne((r) => r.url.includes('walk/nodes/literal'));
    expect(req.request.params.get('minLiteralNumber')).toBe('0');
    expect(req.request.params.get('maxLiteralNumber')).toBe('0');
    http.verify();
  });

  it('should send a "user" (0) source type and a false isClass for linked nodes', () => {
    const http = TestBed.inject(HttpTestingController);
    service
      .getLinkedNodes(1, 10, {
        otherNodeId: 1,
        predicateId: 2,
        sourceType: 0,
        isClass: false,
      } as any)
      .subscribe();
    const req = http.expectOne(() => true);
    expect(req.request.params.get('sourceType')).toBe('0');
    expect(req.request.params.get('isClass')).toBe('false');
    http.verify();
  });
});
