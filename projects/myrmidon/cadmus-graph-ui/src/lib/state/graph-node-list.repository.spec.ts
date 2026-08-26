import { of, throwError } from 'rxjs';

import { NodeListRepository } from './graph-node-list.repository';
import { GraphService, NodeFilter, UriNode, NodeSourceType } from '@myrmidon/cadmus-api';
import { DataPage } from '@myrmidon/ngx-tools';

function makeNode(id: number, overrides?: Partial<UriNode>): UriNode {
  return {
    id,
    uri: `x:node${id}`,
    label: `Node ${id}`,
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

function makePage(items: UriNode[] = []): DataPage<UriNode> {
  return { pageNumber: 1, pageSize: 20, pageCount: 1, total: items.length, items };
}

function createRepository(): {
  repo: NodeListRepository;
  graphService: {
    getNodes: ReturnType<typeof vi.fn>;
    getNode: ReturnType<typeof vi.fn>;
  };
} {
  const graphService = {
    getNodes: vi.fn().mockReturnValue(of(makePage())),
    getNode: vi.fn().mockReturnValue(of(makeNode(1))),
  };
  const repo = new NodeListRepository(graphService as unknown as GraphService);
  return { repo, graphService };
}

describe('NodeListRepository', () => {
  it('should be created and load an initial page', () => {
    const { repo, graphService } = createRepository();
    expect(repo).toBeTruthy();
    expect(graphService.getNodes).toHaveBeenCalled();
  });

  describe('loadPage', () => {
    it('should delegate to GraphService.getNodes and toggle loading$', () => {
      const { repo, graphService } = createRepository();
      graphService.getNodes.mockClear();
      const filter: NodeFilter = { label: 'x' };
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      let result: DataPage<UriNode> | undefined;
      repo.loadPage(2, 10, filter).subscribe((p) => (result = p));

      expect(graphService.getNodes).toHaveBeenCalledWith(2, 10, filter);
      expect(result).toBeTruthy();
      expect(loadingHistory.at(-1)).toBe(false);
    });

    it('should reset loading$ to false even when the request errors', () => {
      const { repo, graphService } = createRepository();
      graphService.getNodes.mockReturnValue(throwError(() => new Error('boom')));
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      repo.loadPage(1, 20, {}).subscribe({ error: () => {} });

      expect(loadingHistory.at(-1)).toBe(false);
    });
  });

  describe('reset / setFilter / setPage', () => {
    it('should toggle loading$ true then false on reset', async () => {
      const { repo } = createRepository();
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      await repo.reset();

      expect(loadingHistory.at(-1)).toBe(false);
    });

    it('should apply a filter via setFilter', async () => {
      const { repo, graphService } = createRepository();
      graphService.getNodes.mockClear();

      await repo.setFilter({ label: 'hello' });

      expect(graphService.getNodes).toHaveBeenCalledWith(
        1,
        expect.any(Number),
        { label: 'hello' }
      );
    });

    it('should load the requested page via setPage', async () => {
      const { repo, graphService } = createRepository();
      graphService.getNodes.mockClear();

      await repo.setPage(3, 15);

      expect(graphService.getNodes).toHaveBeenCalledWith(
        3,
        15,
        expect.anything()
      );
    });
  });

  describe('linked node', () => {
    it('should have no linked node by default', () => {
      const { repo } = createRepository();
      expect(repo.getLinkedNode()).toBeUndefined();
    });

    it('should set and get the linked node via setLinkedNode', () => {
      const { repo } = createRepository();
      const node = makeNode(5);

      repo.setLinkedNode(node);

      expect(repo.getLinkedNode()).toEqual(node);
    });

    it('should clear the linked node when setLinkedNode is called with undefined', () => {
      const { repo } = createRepository();
      repo.setLinkedNode(makeNode(5));

      repo.setLinkedNode(undefined);

      expect(repo.getLinkedNode()).toBeUndefined();
    });

    it('should resolve and set the linked node via setLinkedNodeId', () => {
      const { repo, graphService } = createRepository();
      const node = makeNode(7);
      graphService.getNode.mockReturnValue(of(node));

      repo.setLinkedNodeId(7);

      expect(graphService.getNode).toHaveBeenCalledWith(7);
      expect(repo.getLinkedNode()).toEqual(node);
    });

    it('should clear the linked node when setLinkedNodeId is called with a falsy id', () => {
      const { repo } = createRepository();
      repo.setLinkedNode(makeNode(5));

      repo.setLinkedNodeId(undefined);

      expect(repo.getLinkedNode()).toBeUndefined();
    });

    it('should not update the linked node when setLinkedNodeId errors', () => {
      const { repo, graphService } = createRepository();
      graphService.getNode.mockReturnValue(throwError(() => new Error('not found')));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      repo.setLinkedNodeId(9);

      expect(repo.getLinkedNode()).toBeUndefined();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });

  describe('class nodes', () => {
    it('should have no class nodes by default', () => {
      const { repo } = createRepository();
      expect(repo.getClassNodes()).toEqual([]);
    });

    it('should add a class node via addClassNode', () => {
      const { repo } = createRepository();
      const node = makeNode(1);

      repo.addClassNode(node);

      expect(repo.getClassNodes()).toEqual([node]);
    });

    it('should not add a duplicate class node with the same id', () => {
      const { repo } = createRepository();
      const node = makeNode(1);
      repo.addClassNode(node);

      repo.addClassNode(makeNode(1, { label: 'Duplicate' }));

      expect(repo.getClassNodes()).toEqual([node]);
    });

    it('should delete a class node via deleteClassNode', () => {
      const { repo } = createRepository();
      repo.addClassNode(makeNode(1));
      repo.addClassNode(makeNode(2));

      repo.deleteClassNode(1);

      expect(repo.getClassNodes()).toEqual([makeNode(2)]);
    });

    it('should do nothing when deleting a non-existent class node', () => {
      const { repo } = createRepository();
      repo.addClassNode(makeNode(1));

      repo.deleteClassNode(99);

      expect(repo.getClassNodes()).toEqual([makeNode(1)]);
    });

    it('should resolve and set class nodes via setClassNodeIds', () => {
      const { repo, graphService } = createRepository();
      graphService.getNode.mockImplementation((id: number) => of(makeNode(id)));

      repo.setClassNodeIds([1, 2]);

      expect(graphService.getNode).toHaveBeenCalledWith(1);
      expect(graphService.getNode).toHaveBeenCalledWith(2);
      expect(repo.getClassNodes()).toEqual([makeNode(1), makeNode(2)]);
    });

    it('should clear class nodes when setClassNodeIds is called with an empty/undefined array', () => {
      const { repo } = createRepository();
      repo.addClassNode(makeNode(1));

      repo.setClassNodeIds(undefined);

      expect(repo.getClassNodes()).toEqual([]);
    });

    it('should not update class nodes when setClassNodeIds errors', () => {
      const { repo, graphService } = createRepository();
      repo.addClassNode(makeNode(1));
      graphService.getNode.mockReturnValue(throwError(() => new Error('boom')));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      repo.setClassNodeIds([2]);

      // forkJoin errors as a whole, so the previous class nodes are left
      // untouched (the failed call never reaches the next() callback)
      expect(repo.getClassNodes()).toEqual([makeNode(1)]);
      errorSpy.mockRestore();
    });
  });
});
