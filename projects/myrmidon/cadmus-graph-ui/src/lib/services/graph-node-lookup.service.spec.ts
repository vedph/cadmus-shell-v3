import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { GraphService, NodeSourceType, UriNode } from '@myrmidon/cadmus-api';

import { GraphNodeLookupService } from './graph-node-lookup.service';

function buildUriNode(overrides: Partial<UriNode> = {}): UriNode {
  return {
    id: 1,
    uri: 'x:node1',
    label: 'Node 1',
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

describe('GraphNodeLookupService', () => {
  let service: GraphNodeLookupService;
  let graphService: {
    getNode: ReturnType<typeof vi.fn>;
    getNodes: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    graphService = {
      getNode: vi.fn(),
      getNodes: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: GraphService, useValue: graphService }],
    });
    service = TestBed.inject(GraphNodeLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the id "graph-node"', () => {
    expect(service.id).toBe('graph-node');
  });

  //#region getById
  it('getById should parse the id and delegate to graphService.getNode', () => {
    const node = buildUriNode({ id: 42 });
    graphService.getNode.mockReturnValue(of(node));

    let result: any;
    service.getById('42').subscribe((n) => (result = n));

    expect(graphService.getNode).toHaveBeenCalledWith(42);
    expect(result).toBe(node);
  });
  //#endregion

  //#region lookup
  it('lookup should return an empty array without calling the service when text is empty', () => {
    const spy = vi.fn();
    service.lookup({ text: undefined, limit: 10 }).subscribe(spy);

    expect(graphService.getNodes).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith([]);
  });

  it('lookup should query nodes by label with the default limit of 10', () => {
    const nodes = [buildUriNode({ id: 1 }), buildUriNode({ id: 2 })];
    graphService.getNodes.mockReturnValue(
      of({ pageNumber: 1, pageSize: 10, pageCount: 1, total: 2, items: nodes })
    );

    let result: any;
    service.lookup({ text: 'foo', limit: 0 }).subscribe((r) => (result = r));

    expect(graphService.getNodes).toHaveBeenCalledWith(1, 10, {
      label: 'foo',
      isClass: undefined,
      tag: undefined,
    });
    expect(result).toBe(nodes);
  });

  it('lookup should use the given limit and pass through tag', () => {
    graphService.getNodes.mockReturnValue(
      of({ pageNumber: 1, pageSize: 5, pageCount: 1, total: 0, items: [] })
    );

    service.lookup({ text: 'foo', limit: 5, tag: 't1' }).subscribe();

    expect(graphService.getNodes).toHaveBeenCalledWith(1, 5, {
      label: 'foo',
      isClass: undefined,
      tag: 't1',
    });
  });

  it('lookup should coerce isClass to a strict boolean, undefined when unset', () => {
    graphService.getNodes.mockReturnValue(
      of({ pageNumber: 1, pageSize: 10, pageCount: 1, total: 0, items: [] })
    );

    service.lookup({ text: 'foo', limit: 10, isClass: true }).subscribe();
    expect(graphService.getNodes).toHaveBeenLastCalledWith(
      1,
      10,
      expect.objectContaining({ isClass: true })
    );

    service.lookup({ text: 'foo', limit: 10, isClass: false }).subscribe();
    expect(graphService.getNodes).toHaveBeenLastCalledWith(
      1,
      10,
      expect.objectContaining({ isClass: false })
    );

    service.lookup({ text: 'foo', limit: 10, isClass: null }).subscribe();
    expect(graphService.getNodes).toHaveBeenLastCalledWith(
      1,
      10,
      expect.objectContaining({ isClass: undefined })
    );
  });
  //#endregion

  //#region getName
  it('getName should return the item label', () => {
    expect(service.getName(buildUriNode({ label: 'My node' }))).toBe(
      'My node'
    );
  });
  //#endregion
});
