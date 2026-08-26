import { of, throwError } from 'rxjs';

import { GraphTripleListRepository } from './graph-triple-list.repository';
import {
  GraphService,
  NodeSourceType,
  TripleFilter,
  UriNode,
  UriTriple,
} from '@myrmidon/cadmus-api';
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

function makePage(items: UriTriple[] = []): DataPage<UriTriple> {
  return { pageNumber: 1, pageSize: 20, pageCount: 1, total: items.length, items };
}

function createRepository(): {
  repo: GraphTripleListRepository;
  graphService: {
    getTriples: ReturnType<typeof vi.fn>;
    getNode: ReturnType<typeof vi.fn>;
  };
} {
  const graphService = {
    getTriples: vi.fn().mockReturnValue(of(makePage())),
    getNode: vi.fn().mockReturnValue(of(makeNode(1))),
  };
  const repo = new GraphTripleListRepository(
    graphService as unknown as GraphService
  );
  return { repo, graphService };
}

describe('GraphTripleListRepository', () => {
  it('should be created and load an initial page', () => {
    const { repo, graphService } = createRepository();
    expect(repo).toBeTruthy();
    expect(graphService.getTriples).toHaveBeenCalled();
  });

  describe('loadPage', () => {
    it('should delegate to GraphService.getTriples and toggle loading$', () => {
      const { repo, graphService } = createRepository();
      graphService.getTriples.mockClear();
      const filter: TripleFilter = { subjectId: 1 };
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      let result: DataPage<UriTriple> | undefined;
      repo.loadPage(2, 10, filter).subscribe((p) => (result = p));

      expect(graphService.getTriples).toHaveBeenCalledWith(2, 10, filter);
      expect(result).toBeTruthy();
      expect(loadingHistory.at(-1)).toBe(false);
    });

    it('should reset loading$ to false even when the request errors', () => {
      const { repo, graphService } = createRepository();
      graphService.getTriples.mockReturnValue(
        throwError(() => new Error('boom'))
      );
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
      graphService.getTriples.mockClear();

      await repo.setFilter({ sid: 'hello' });

      expect(graphService.getTriples).toHaveBeenCalledWith(
        1,
        expect.any(Number),
        { sid: 'hello' }
      );
    });

    it('should load the requested page via setPage', async () => {
      const { repo, graphService } = createRepository();
      graphService.getTriples.mockClear();

      await repo.setPage(3, 15);

      expect(graphService.getTriples).toHaveBeenCalledWith(
        3,
        15,
        expect.anything()
      );
    });
  });

  describe('setTerm / getTerm / selectTerm', () => {
    it('should have no terms set by default', () => {
      const { repo } = createRepository();
      expect(repo.getTerm('S')).toBeUndefined();
      expect(repo.getTerm('P')).toBeUndefined();
      expect(repo.getTerm('O')).toBeUndefined();
    });

    it('should set and get the subject term', () => {
      const { repo } = createRepository();
      const node = makeNode(1);

      repo.setTerm(node, 'S');

      expect(repo.getTerm('S')).toEqual(node);
    });

    it('should set and get the predicate term', () => {
      const { repo } = createRepository();
      const node = makeNode(2);

      repo.setTerm(node, 'P');

      expect(repo.getTerm('P')).toEqual(node);
    });

    it('should set and get the object term', () => {
      const { repo } = createRepository();
      const node = makeNode(3);

      repo.setTerm(node, 'O');

      expect(repo.getTerm('O')).toEqual(node);
    });

    it('should clear a term when set with null/undefined', () => {
      const { repo } = createRepository();
      repo.setTerm(makeNode(1), 'S');

      repo.setTerm(null, 'S');

      expect(repo.getTerm('S')).toBeUndefined();
    });

    it('should expose the current term via selectTerm observable', () => {
      const { repo } = createRepository();
      const node = makeNode(1);
      let emitted: UriNode | undefined;
      repo.selectTerm('S').subscribe((n) => (emitted = n));

      repo.setTerm(node, 'S');

      expect(emitted).toEqual(node);
    });
  });

  describe('setTermId', () => {
    it('should resolve and set the term via GraphService.getNode', () => {
      const { repo, graphService } = createRepository();
      const node = makeNode(4);
      graphService.getNode.mockReturnValue(of(node));

      repo.setTermId(4, 'O');

      expect(graphService.getNode).toHaveBeenCalledWith(4);
      expect(repo.getTerm('O')).toEqual(node);
    });

    it('should clear the term when called with a falsy id', () => {
      const { repo } = createRepository();
      repo.setTerm(makeNode(1), 'P');

      repo.setTermId(null, 'P');

      expect(repo.getTerm('P')).toBeUndefined();
    });

    it('should not update the term when GraphService.getNode errors', () => {
      const { repo, graphService } = createRepository();
      graphService.getNode.mockReturnValue(
        throwError(() => new Error('not found'))
      );
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      repo.setTermId(5, 'S');

      expect(repo.getTerm('S')).toBeUndefined();
      errorSpy.mockRestore();
    });
  });
});
