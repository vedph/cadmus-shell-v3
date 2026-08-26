import { of, throwError } from 'rxjs';

import {
  GraphWalker,
  PagedLinkedNodeFilter,
  WalkerNodeData,
  WalkerPropData,
} from './graph-walker';
import { GraphNode } from './graph-interfaces';
import {
  GraphService,
  NodeSourceType,
  TripleGroup,
  UriNode,
  UriTriple,
} from '@myrmidon/cadmus-api';
import { DataPage } from '@myrmidon/ngx-tools';

//#region helpers
function makeUriNode(id: number, overrides?: Partial<UriNode>): UriNode {
  return {
    id,
    uri: `x:node${id}`,
    label: `Node ${id}`,
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

function makeGroup(
  predicateId: number,
  predicateUri: string,
  count: number
): TripleGroup {
  return { predicateId, predicateUri, count };
}

function makeLiteralTriple(id: number, overrides?: Partial<UriTriple>): UriTriple {
  return {
    id,
    subjectId: 1,
    predicateId: 10,
    subjectUri: 'x:node1',
    predicateUri: 'x:p10',
    objectLiteral: 'hello',
    ...overrides,
  };
}

function makePage<T>(items: T[], total?: number): DataPage<T> {
  return {
    pageNumber: 1,
    pageSize: 20,
    pageCount: 1,
    total: total ?? items.length,
    items,
  };
}

function latest<T>(obs: { subscribe: (fn: (v: T) => void) => unknown }): T {
  let value!: T;
  obs.subscribe((v) => (value = v));
  return value;
}

function createWalker(): {
  walker: GraphWalker;
  graphService: {
    getNode: ReturnType<typeof vi.fn>;
    getTripleGroups: ReturnType<typeof vi.fn>;
    getLinkedNodes: ReturnType<typeof vi.fn>;
    getLinkedLiterals: ReturnType<typeof vi.fn>;
  };
} {
  const graphService = {
    getNode: vi.fn().mockReturnValue(of(makeUriNode(1))),
    getTripleGroups: vi.fn().mockReturnValue(of(makePage<TripleGroup>([]))),
    getLinkedNodes: vi.fn().mockReturnValue(of(makePage<UriNode>([]))),
    getLinkedLiterals: vi.fn().mockReturnValue(of(makePage<UriTriple>([]))),
  };
  const walker = new GraphWalker(graphService as unknown as GraphService);
  return { walker, graphService };
}

// builds a standalone "N" node data shape, for tests that exercise
// expandNode/selectNode/toggleNode without going through reset() first.
function makeNNode(id: string, overrides?: Partial<WalkerNodeData>): GraphNode {
  const nid = +id.substring(1);
  const data: WalkerNodeData = {
    originId: '',
    uri: `x:${id}`,
    sourceType: NodeSourceType.User,
    outFilter: { pageNumber: 1, pageSize: 10, subjectId: nid },
    inFilter: { pageNumber: 1, pageSize: 10, objectId: nid },
    ...overrides,
  };
  return { id, label: id, data };
}

// builds a standalone "P" (property group) node data shape.
function makePNode(id: string, overrides?: Partial<WalkerPropData>): GraphNode {
  const data: WalkerPropData = {
    originId: 'N1',
    uri: 'x:p10',
    outFilter: { pageNumber: 1, pageSize: 10, otherNodeId: 1, predicateId: 10 },
    inFilter: { pageNumber: 1, pageSize: 10, otherNodeId: 1, predicateId: 10 },
    litFilter: { pageNumber: 1, pageSize: 10, predicateId: 10 },
    ...overrides,
  };
  return { id, label: '1', data };
}

// sets up a 3-level graph: N1 --P10N1--> N2, via reset(1) + expandProperty.
function setupThreeLevelGraph() {
  const { walker, graphService } = createWalker();
  graphService.getNode.mockReturnValue(of(makeUriNode(1, { label: 'Root' })));
  graphService.getTripleGroups.mockImplementation(
    (_pn: number, _ps: number, filter: any) => {
      if (filter.subjectId !== undefined) {
        return of(makePage([makeGroup(10, 'x:p10', 2)], 1));
      }
      return of(makePage<TripleGroup>([], 0));
    }
  );
  graphService.getLinkedNodes.mockImplementation(
    (_pn: number, _ps: number, filter: PagedLinkedNodeFilter) => {
      if (filter.isObject) {
        return of(makePage([makeUriNode(2, { label: 'Child' })], 1));
      }
      return of(makePage<UriNode>([], 0));
    }
  );
  graphService.getLinkedLiterals.mockReturnValue(of(makePage<UriTriple>([])));

  walker.reset(1); // -> N1, expanded into P10N1
  const p10 = latest(walker.nodes$).find((n) => n.id === 'P10N1')!;
  walker.expandProperty(p10); // -> P10N1 expanded into N2

  return { walker, graphService, p10 };
}
//#endregion

describe('GraphWalker', () => {
  describe('construction', () => {
    it('should start with empty graph and neutral state', () => {
      const { walker } = createWalker();

      expect(walker).toBeTruthy();
      expect(latest(walker.nodes$)).toEqual([]);
      expect(latest(walker.edges$)).toEqual([]);
      expect(latest(walker.loading$)).toBe(false);
      expect(latest(walker.error$)).toBeNull();
      expect(latest(walker.selectedNode$)).toBeNull();
      expect(latest(walker.pOutFilter$)).toBeNull();
      expect(latest(walker.pInFilter$)).toBeNull();
      expect(latest(walker.pLitFilter$)).toBeNull();
      expect(latest(walker.nOutFilter$)).toBeNull();
      expect(latest(walker.nInFilter$)).toBeNull();
      expect(latest(walker.childTotals$)).toEqual({
        nOut: 0,
        nIn: 0,
        pOut: 0,
        pIn: 0,
        pLit: 0,
      });
      expect(walker.getSelectedNode()).toBeNull();
    });

    it('should default pageSize to 10 and maxLiteralLen to 30', () => {
      const { walker } = createWalker();
      expect(walker.pageSize).toBe(10);
      expect(walker.maxLiteralLen).toBe(30);
    });
  });

  describe('reset', () => {
    it('should load the origin node, replace the graph, and auto-expand it', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(
        of(makeUriNode(1, { label: 'Root', sid: 'sid1' }))
      );

      walker.reset(1);

      expect(graphService.getNode).toHaveBeenCalledWith(1);
      // outbound + inbound triple groups requested to auto-expand the root
      expect(graphService.getTripleGroups).toHaveBeenCalledTimes(2);

      const nodes = latest(walker.nodes$);
      expect(nodes.length).toBe(1);
      expect(nodes[0].id).toBe('N1');
      expect(nodes[0].label).toBe('Root');
      const data = nodes[0].data as WalkerNodeData;
      expect(data.originId).toBe(''); // root has no origin
      expect(data.sid).toBe('sid1');
      expect(data.expanded).toBe(true); // auto-expanded synchronously
      expect(latest(walker.edges$)).toEqual([]);
      expect(latest(walker.loading$)).toBe(false);
    });

    it('should use node.uri as the label fallback when the node has no label', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(
        of(makeUriNode(1, { label: '' as any, uri: 'x:fallback' }))
      );

      walker.reset(1);

      expect(latest(walker.nodes$)[0].label).toBe('x:fallback');
    });

    it('should build outFilter/inFilter using the configured pageSize', () => {
      const { walker, graphService } = createWalker();
      walker.pageSize = 5;

      walker.reset(1);

      expect(graphService.getTripleGroups).toHaveBeenCalledWith(
        1,
        5,
        expect.objectContaining({ subjectId: 1 })
      );
      expect(graphService.getTripleGroups).toHaveBeenCalledWith(
        1,
        5,
        expect.objectContaining({ objectId: 1 })
      );
    });

    it('should toggle loading$ true then false around the request', () => {
      const { walker } = createWalker();
      const history: boolean[] = [];
      walker.loading$.subscribe((v) => history.push(v));

      walker.reset(1);

      expect(history[0]).toBe(false); // initial
      expect(history.at(-1)).toBe(false); // ends not loading
      expect(history).toContain(true); // was loading at some point
    });

    it('should set error$ to the error message on a plain string error', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(throwError(() => 'oops'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      walker.reset(1);

      expect(latest(walker.error$)).toBe('oops');
      errorSpy.mockRestore();
    });

    it('should set error$ to a generic message on a non-string error', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(throwError(() => new Error('boom')));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      walker.reset(1);

      expect(latest(walker.error$)).toBe('Walker error');
      // loading$ must not stay stuck at true after an error (complete
      // never fires after error in RxJS)
      expect(latest(walker.loading$)).toBe(false);
      errorSpy.mockRestore();
    });

    // Bug fix: reset() used to leave the previous selection and its
    // dependent filters dangling, pointing at a node that no longer
    // exists once the graph is replaced with a new origin.
    it('should clear a previously selected node and its filters when resetting to a new origin', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);
      walker.selectNode('N1');
      expect(walker.getSelectedNode()?.id).toBe('N1');
      expect(latest(walker.nOutFilter$)).not.toBeNull();

      graphService.getNode.mockReturnValue(of(makeUriNode(2)));
      walker.reset(2);

      expect(walker.getSelectedNode()).toBeNull();
      expect(latest(walker.selectedNode$)).toBeNull();
      expect(latest(walker.nOutFilter$)).toBeNull();
      expect(latest(walker.nInFilter$)).toBeNull();
      expect(latest(walker.childTotals$)).toEqual({
        nOut: 0,
        nIn: 0,
        pOut: 0,
        pIn: 0,
        pLit: 0,
      });
    });
  });

  describe('expandNode', () => {
    it('should build property nodes and edges from outbound and inbound triple groups', () => {
      const { walker, graphService } = createWalker();
      graphService.getTripleGroups.mockImplementation(
        (_pn: number, _ps: number, filter: any) => {
          if (filter.subjectId !== undefined) {
            return of(makePage([makeGroup(10, 'x:out', 2)], 1));
          }
          return of(makePage([makeGroup(20, 'x:in', 3)], 1));
        }
      );
      const node = makeNNode('N1');

      walker.expandNode(node);

      expect(node.data.expanded).toBe(true);
      expect(node.data.outTotal).toBe(1);
      expect(node.data.inTotal).toBe(1);

      const nodes = latest(walker.nodes$);
      expect(nodes.map((n) => n.id).sort()).toEqual(['P10N1', 'P20N1']);

      const edges = latest(walker.edges$);
      // outbound: origin -> prop
      expect(edges.some((e) => e.id === 'EN1_P10N1')).toBe(true);
      // inbound: prop -> origin
      expect(edges.some((e) => e.id === 'EP20N1_N1')).toBe(true);
    });

    it('should default outFilter/inFilter to page 1 with subjectId/objectId set from the node id', () => {
      const { walker, graphService } = createWalker();
      const node = makeNNode('N7');

      walker.expandNode(node);

      expect(graphService.getTripleGroups).toHaveBeenNthCalledWith(
        1,
        1,
        walker.pageSize,
        expect.objectContaining({ pageNumber: 1, subjectId: 7 })
      );
      expect(graphService.getTripleGroups).toHaveBeenNthCalledWith(
        2,
        1,
        walker.pageSize,
        expect.objectContaining({ pageNumber: 1, objectId: 7 })
      );
    });

    it('should merge a partial outFilter/inFilter into the node data and recompute subjectId/objectId', () => {
      const { walker, graphService } = createWalker();
      const node = makeNNode('N3');

      walker.expandNode(node, { pageNumber: 2 }, { pageNumber: 4 });

      expect(node.data.outFilter).toEqual(
        expect.objectContaining({ pageNumber: 2, subjectId: 3 })
      );
      expect(node.data.inFilter).toEqual(
        expect.objectContaining({ pageNumber: 4, objectId: 3 })
      );
      expect(graphService.getTripleGroups).toHaveBeenNthCalledWith(
        1,
        2,
        walker.pageSize,
        expect.objectContaining({ pageNumber: 2, subjectId: 3 })
      );
    });

    it('should replace previous children rather than accumulating duplicates on re-expand', () => {
      const { walker, graphService } = createWalker();
      const node = makeNNode('N1');
      graphService.getTripleGroups.mockReturnValueOnce(
        of(makePage([makeGroup(10, 'x:out', 1)], 1))
      );
      graphService.getTripleGroups.mockReturnValueOnce(of(makePage([], 0)));
      walker.expandNode(node);
      expect(latest(walker.nodes$).map((n) => n.id)).toEqual(['P10N1']);

      // re-expand with a different result set
      graphService.getTripleGroups.mockReturnValueOnce(
        of(makePage([makeGroup(30, 'x:out2', 1)], 1))
      );
      graphService.getTripleGroups.mockReturnValueOnce(of(makePage([], 0)));
      walker.expandNode(node);

      expect(latest(walker.nodes$).map((n) => n.id)).toEqual(['P30N1']);
    });

    it('should set node.data.error and error$ on failure, and still push the (unchanged) nodes$', () => {
      const { walker, graphService } = createWalker();
      graphService.getTripleGroups.mockReturnValue(
        throwError(() => new Error('fail'))
      );
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const node = makeNNode('N5');

      walker.expandNode(node);

      expect(node.data.error).toBe('Error loading properties');
      expect(latest(walker.error$)).toBe('Walker error');
      expect(latest(walker.loading$)).toBe(false);
      errorSpy.mockRestore();
    });
  });

  describe('expandSelectedNode', () => {
    it('should do nothing when there is no selection', () => {
      const { walker, graphService } = createWalker();

      walker.expandSelectedNode();

      expect(graphService.getTripleGroups).not.toHaveBeenCalled();
    });

    it('should do nothing when the selected node is not an "N" node', () => {
      const { walker, graphService } = createWalker();
      // seed a P node as "selected" by expanding+selecting via a full walk
      graphService.getTripleGroups.mockReturnValueOnce(
        of(makePage([makeGroup(10, 'x:p', 1)], 1))
      );
      graphService.getTripleGroups.mockReturnValueOnce(of(makePage([], 0)));
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);
      walker.selectNode('P10N1');
      // spy only after reset()'s own internal auto-expand has already run,
      // so it only captures calls made by expandSelectedNode() below
      const spy = vi.spyOn(walker, 'expandNode');

      walker.expandSelectedNode();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should delegate to expandNode for the selected N node', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);
      walker.selectNode('N1');
      graphService.getTripleGroups.mockClear();

      walker.expandSelectedNode({ pageNumber: 2 });

      expect(graphService.getTripleGroups).toHaveBeenCalled();
    });
  });

  describe('expandProperty', () => {
    it('should build non-literal out/in nodes and literal nodes, with edges, and set totals', () => {
      const { walker, graphService } = createWalker();
      graphService.getLinkedNodes.mockImplementation(
        (_pn: number, _ps: number, filter: PagedLinkedNodeFilter) => {
          if (filter.isObject) {
            return of(makePage([makeUriNode(2, { label: 'Out child' })], 1));
          }
          return of(makePage([makeUriNode(3, { label: 'In child' })], 1));
        }
      );
      graphService.getLinkedLiterals.mockReturnValue(
        of(makePage([makeLiteralTriple(9, { objectLiteral: 'lit-value' })], 1))
      );
      const node = makePNode('P10N1');

      walker.expandProperty(node);

      expect(node.data.expanded).toBe(true);
      expect(node.data.outTotal).toBe(1);
      expect(node.data.inTotal).toBe(1);
      expect(node.data.litTotal).toBe(1);

      const nodes = latest(walker.nodes$);
      expect(nodes.map((n) => n.id).sort()).toEqual(['L9', 'N2', 'N3']);

      const edges = latest(walker.edges$);
      expect(edges.some((e) => e.id === 'EP10N1_N2')).toBe(true); // out edge
      expect(edges.some((e) => e.id === 'EN3_P10N1')).toBe(true); // in edge
      expect(edges.some((e) => e.id === 'EP10N1_L9')).toBe(true); // literal edge
    });

    it('should truncate literal labels longer than maxLiteralLen', () => {
      const { walker, graphService } = createWalker();
      graphService.getLinkedLiterals.mockReturnValue(
        of(makePage([makeLiteralTriple(1, { objectLiteral: 'x'.repeat(40) })], 1))
      );
      const node = makePNode('P10N1');

      walker.expandProperty(node);

      const lit = latest(walker.nodes$).find((n) => n.id === 'L1')!;
      expect(lit.label).toBe('x'.repeat(30) + '…');
    });

    it('should not truncate literal labels when maxLiteralLen is 0', () => {
      const { walker, graphService } = createWalker();
      walker.maxLiteralLen = 0;
      const longValue = 'y'.repeat(50);
      graphService.getLinkedLiterals.mockReturnValue(
        of(makePage([makeLiteralTriple(2, { objectLiteral: longValue })], 1))
      );
      const node = makePNode('P10N1');

      walker.expandProperty(node);

      const lit = latest(walker.nodes$).find((n) => n.id === 'L2')!;
      expect(lit.label).toBe(longValue);
    });

    it('should set node.data.error and error$ on failure', () => {
      const { walker, graphService } = createWalker();
      graphService.getLinkedNodes.mockReturnValue(
        throwError(() => new Error('fail'))
      );
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const node = makePNode('P10N1');

      walker.expandProperty(node);

      expect(node.data.error).toBe('Error loading nodes');
      expect(latest(walker.error$)).toBe('Walker error');
      expect(latest(walker.loading$)).toBe(false);
      errorSpy.mockRestore();
    });

    // Documents current (possibly unintended) behavior: nodes discovered
    // via expandProperty start with pageNumber 0 in their own outFilter/
    // inFilter, unlike the root node (reset()) and property nodes
    // (buildPropertyNode), which both start at pageNumber 1. Flagged for
    // review rather than "fixed", since it is unclear whether some other
    // part of the UI relies on 0 as a "not yet paged" sentinel.
    it('documents that newly discovered non-literal nodes start with pageNumber 0 (inconsistent with root/property nodes)', () => {
      const { walker, graphService } = createWalker();
      graphService.getLinkedNodes.mockReturnValueOnce(
        of(makePage([makeUriNode(2)], 1))
      );
      graphService.getLinkedNodes.mockReturnValue(of(makePage<UriNode>([], 0)));
      const node = makePNode('P10N1');

      walker.expandProperty(node);

      const child = latest(walker.nodes$).find((n) => n.id === 'N2')!;
      const data = child.data as WalkerNodeData;
      expect(data.outFilter.pageNumber).toBe(0);
      expect(data.inFilter.pageNumber).toBe(0);
    });
  });

  describe('expandSelectedProperty', () => {
    it('should do nothing when there is no selection', () => {
      const { walker, graphService } = createWalker();

      walker.expandSelectedProperty();

      expect(graphService.getLinkedNodes).not.toHaveBeenCalled();
    });

    it('should do nothing when the selected node is not a "P" node', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);
      walker.selectNode('N1');
      graphService.getLinkedNodes.mockClear();

      walker.expandSelectedProperty();

      expect(graphService.getLinkedNodes).not.toHaveBeenCalled();
    });

    it('should delegate to expandProperty for the selected P node', () => {
      const { walker, graphService } = createWalker();
      graphService.getTripleGroups.mockReturnValueOnce(
        of(makePage([makeGroup(10, 'x:p', 1)], 1))
      );
      graphService.getTripleGroups.mockReturnValueOnce(of(makePage([], 0)));
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);
      walker.selectNode('P10N1');
      graphService.getLinkedNodes.mockClear();

      walker.expandSelectedProperty(null, { pageNumber: 3 });

      expect(graphService.getLinkedNodes).toHaveBeenCalled();
    });
  });

  describe('selectNode', () => {
    it('should clear the selection and all filters when called with null', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);
      walker.selectNode('N1');

      walker.selectNode(null);

      expect(walker.getSelectedNode()).toBeNull();
      expect(latest(walker.nOutFilter$)).toBeNull();
      expect(latest(walker.nInFilter$)).toBeNull();
      expect(latest(walker.pOutFilter$)).toBeNull();
      expect(latest(walker.pInFilter$)).toBeNull();
      expect(latest(walker.pLitFilter$)).toBeNull();
    });

    it('should clear the selection when called with an id not present in the graph', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);
      walker.selectNode('N1');

      walker.selectNode('N999');

      expect(walker.getSelectedNode()).toBeNull();
    });

    it('should select an N node, populate its filters, and fall back totals to 0 when unset', () => {
      const { walker, graphService } = createWalker();
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1); // auto-expands, setting outTotal/inTotal

      walker.selectNode('N1');

      const node = walker.getSelectedNode()!;
      expect(node.id).toBe('N1');
      expect(latest(walker.nOutFilter$)).toBe((node.data as WalkerNodeData).outFilter);
      expect(latest(walker.nInFilter$)).toBe((node.data as WalkerNodeData).inFilter);
      expect(latest(walker.pOutFilter$)).toBeNull();
      expect(latest(walker.pInFilter$)).toBeNull();
      expect(latest(walker.pLitFilter$)).toBeNull();
      // no triples for this fixture -> totals are 0
      expect(latest(walker.childTotals$)).toEqual({
        nOut: 0,
        nIn: 0,
        pOut: 0,
        pIn: 0,
        pLit: 0,
      });
    });

    it('should select a P node and populate its filters/totals', () => {
      const { walker, graphService } = createWalker();
      graphService.getTripleGroups.mockImplementation(
        (_pn: number, _ps: number, filter: any) => {
          if (filter.subjectId !== undefined) {
            return of(makePage([makeGroup(10, 'x:p', 2)], 2));
          }
          return of(makePage([], 0));
        }
      );
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);

      walker.selectNode('P10N1');

      const node = walker.getSelectedNode()!;
      expect(node.id).toBe('P10N1');
      const data = node.data as WalkerPropData;
      expect(latest(walker.pOutFilter$)).toBe(data.outFilter);
      expect(latest(walker.pInFilter$)).toBe(data.inFilter);
      expect(latest(walker.pLitFilter$)).toBe(data.litFilter);
      expect(latest(walker.nOutFilter$)).toBeNull();
      expect(latest(walker.nInFilter$)).toBeNull();
      // outTotal/inTotal/litTotal unset until expandProperty runs -> 0
      expect(latest(walker.childTotals$)).toEqual({
        nOut: 0,
        nIn: 0,
        pOut: 0,
        pIn: 0,
        pLit: 0,
      });
    });

    it('should select a literal node, keep it as selectedNode$, but reset all filters', () => {
      const { walker, graphService } = setupLiteralGraph();

      walker.selectNode('L9');

      expect(walker.getSelectedNode()?.id).toBe('L9');
      expect(latest(walker.nOutFilter$)).toBeNull();
      expect(latest(walker.nInFilter$)).toBeNull();
      expect(latest(walker.pOutFilter$)).toBeNull();
      expect(latest(walker.pInFilter$)).toBeNull();
      expect(latest(walker.pLitFilter$)).toBeNull();
      expect(latest(walker.childTotals$)).toEqual({
        nOut: 0,
        nIn: 0,
        pOut: 0,
        pIn: 0,
        pLit: 0,
      });

      function setupLiteralGraph() {
        const created = createWalker();
        created.graphService.getNode.mockReturnValue(of(makeUriNode(1)));
        created.graphService.getTripleGroups.mockImplementation(
          (_pn: number, _ps: number, filter: any) => {
            if (filter.subjectId !== undefined) {
              return of(makePage([makeGroup(10, 'x:p', 1)], 1));
            }
            return of(makePage([], 0));
          }
        );
        created.graphService.getLinkedLiterals.mockReturnValue(
          of(makePage([makeLiteralTriple(9)], 1))
        );
        created.walker.reset(1);
        const p10 = latest(created.walker.nodes$).find(
          (n) => n.id === 'P10N1'
        )!;
        created.walker.expandProperty(p10);
        return created;
      }
    });

    it('should deselect the previously selected node when selecting a new one', () => {
      const { walker, graphService } = createWalker();
      graphService.getTripleGroups.mockImplementation(
        (_pn: number, _ps: number, filter: any) => {
          if (filter.subjectId !== undefined) {
            return of(makePage([makeGroup(10, 'x:p', 1)], 1));
          }
          return of(makePage([], 0));
        }
      );
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);

      walker.selectNode('N1');
      const n1 = latest(walker.nodes$).find((n) => n.id === 'N1')!;
      expect(n1.data.selected).toBe(true);

      walker.selectNode('P10N1');

      expect(n1.data.selected).toBeUndefined();
      const p10 = latest(walker.nodes$).find((n) => n.id === 'P10N1')!;
      expect(p10.data.selected).toBe(true);
    });
  });

  describe('toggleNode', () => {
    it('should remove an expanded node children (single level) and clear its expanded flag', () => {
      const { walker, graphService } = createWalker();
      graphService.getTripleGroups.mockReturnValueOnce(
        of(makePage([makeGroup(10, 'x:p', 1)], 1))
      );
      graphService.getTripleGroups.mockReturnValueOnce(of(makePage([], 0)));
      graphService.getNode.mockReturnValue(of(makeUriNode(1)));
      walker.reset(1);
      const n1 = latest(walker.nodes$).find((n) => n.id === 'N1')!;
      expect(latest(walker.nodes$).map((n) => n.id)).toEqual(['N1', 'P10N1']);

      walker.toggleNode(n1);

      expect(n1.data.expanded).toBeUndefined();
      expect(latest(walker.nodes$).map((n) => n.id)).toEqual(['N1']);
      expect(latest(walker.edges$)).toEqual([]);
    });

    it('should cascade-remove grandchildren when collapsing an ancestor', () => {
      const { walker } = setupThreeLevelGraph();
      const n1 = latest(walker.nodes$).find((n) => n.id === 'N1')!;
      expect(latest(walker.nodes$).map((n) => n.id).sort()).toEqual(
        ['N1', 'N2', 'P10N1'].sort()
      );

      walker.toggleNode(n1);

      expect(latest(walker.nodes$).map((n) => n.id)).toEqual(['N1']);
      expect(latest(walker.edges$)).toEqual([]);
    });

    it('should reselect the root node when collapsing removes the currently selected node', () => {
      const { walker, p10 } = setupThreeLevelGraph();
      walker.selectNode('N2');
      expect(walker.getSelectedNode()?.id).toBe('N2');

      walker.toggleNode(p10); // collapses P10N1, removing N2

      expect(walker.getSelectedNode()?.id).toBe('N1');
    });

    it('should call expandNode when toggling a collapsed N-type node', () => {
      const { walker } = createWalker();
      const node = makeNNode('N9');
      const spy = vi.spyOn(walker, 'expandNode');

      walker.toggleNode(node);

      expect(spy).toHaveBeenCalledWith(node);
    });

    it('should call expandProperty when toggling a collapsed P-type node', () => {
      const { walker } = createWalker();
      const node = makePNode('P1N1');
      const spy = vi.spyOn(walker, 'expandProperty');

      walker.toggleNode(node);

      expect(spy).toHaveBeenCalledWith(node);
    });

    it('should do nothing when toggling a collapsed node with an unrecognized id prefix', () => {
      const { walker, graphService } = createWalker();
      const node: GraphNode = {
        id: 'L5',
        label: 'lit',
        data: { originId: 'P1N1', value: 'hello' },
      };

      walker.toggleNode(node);

      expect(graphService.getTripleGroups).not.toHaveBeenCalled();
      expect(graphService.getLinkedNodes).not.toHaveBeenCalled();
    });
  });
});
