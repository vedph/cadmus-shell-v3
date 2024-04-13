import { TestBed } from '@angular/core/testing';

import { GraphNodeLookupService } from './graph-node-lookup.service';

describe('GraphNodeLookupService', () => {
  let service: GraphNodeLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphNodeLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
