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

  it('should send all the node class IDs', () => {
    const http = TestBed.inject(HttpTestingController);
    service.getNodes(1, 10, { classIds: [1, 2, 3] }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('graph/nodes'));
    expect(req.request.params.getAll('classIds')).toEqual(['1', '2', '3']);
    http.verify();
  });

  it('should send all the linked node class IDs', () => {
    const http = TestBed.inject(HttpTestingController);
    service
      .getLinkedNodes(1, 10, { otherNodeId: 1, predicateId: 2, classIds: [4, 5] })
      .subscribe();
    const req = http.expectOne(() => true);
    expect(req.request.params.getAll('classIds')).toEqual(['4', '5']);
    http.verify();
  });

  it('should send all the predicate IDs and literal filters for triples', () => {
    const http = TestBed.inject(HttpTestingController);
    service
      .getTriples(1, 10, {
        predicateIds: [1, 2],
        notPredicateIds: [3, 4],
        literalPattern: '^a',
        literalLanguage: 'en',
        minLiteralNumber: 0,
      })
      .subscribe();
    const req = http.expectOne((r) => r.url.endsWith('graph/triples'));
    expect(req.request.params.getAll('predicateIds')).toEqual(['1', '2']);
    expect(req.request.params.getAll('notPredicateIds')).toEqual(['3', '4']);
    expect(req.request.params.get('literalPattern')).toBe('^a');
    expect(req.request.params.get('literalLanguage')).toBe('en');
    expect(req.request.params.get('minLiteralNumber')).toBe('0');
    http.verify();
  });

  it('should send literal filters for triple groups', () => {
    const http = TestBed.inject(HttpTestingController);
    service
      .getTripleGroups(1, 10, { subjectId: 1, literalType: 'xsd:int' })
      .subscribe();
    const req = http.expectOne((r) => r.url.endsWith('walk/triples'));
    expect(req.request.params.get('subjectId')).toBe('1');
    expect(req.request.params.get('literalType')).toBe('xsd:int');
    http.verify();
  });

  it('should send node set IDs as ids', () => {
    const http = TestBed.inject(HttpTestingController);
    service.getNodeSet([7, 8]).subscribe();
    const req = http.expectOne((r) => r.url === 'http://api/graph/nodes-set');
    expect(req.request.params.getAll('ids')).toEqual(['7', '8']);
    http.verify();
  });
});
