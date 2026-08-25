import { of } from 'rxjs';

import { ThesaurusNodeListRepository } from './thesaurus-node-list.repository';
import { ThesaurusNode, ThesaurusNodesService } from '../services/thesaurus-nodes.service';
import { DataPage } from '@myrmidon/ngx-tools';

function makePage(items: ThesaurusNode[] = []): DataPage<ThesaurusNode> {
  return { pageNumber: 1, pageSize: 20, pageCount: 1, total: items.length, items };
}

function createRepository(): {
  repo: ThesaurusNodeListRepository;
  nodesService: { getPage: ReturnType<typeof vi.fn> };
} {
  const nodesService = { getPage: vi.fn().mockReturnValue(of(makePage())) };
  const repo = new ThesaurusNodeListRepository(
    nodesService as unknown as ThesaurusNodesService
  );
  return { repo, nodesService };
}

describe('ThesaurusNodeListRepository', () => {
  it('should be created and load an initial page', () => {
    const { repo, nodesService } = createRepository();
    expect(repo).toBeTruthy();
    expect(nodesService.getPage).toHaveBeenCalled();
  });

  describe('loadPage', () => {
    it('should delegate to ThesaurusNodesService.getPage and toggle loading$', () => {
      const { repo, nodesService } = createRepository();
      nodesService.getPage.mockClear();
      const filter = { idOrValue: 'x' };
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      let result: DataPage<ThesaurusNode> | undefined;
      repo.loadPage(2, 10, filter).subscribe((p) => (result = p));

      expect(nodesService.getPage).toHaveBeenCalledWith(filter, 2, 10);
      expect(result).toBeTruthy();
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

    it('should apply a filter and expose it via getFilter', async () => {
      const { repo } = createRepository();
      const filter = { parentId: 'p1' };

      await repo.setFilter(filter);

      expect(repo.getFilter()).toEqual(filter);
    });

    it('should load the requested page via setPage', async () => {
      const { repo, nodesService } = createRepository();
      nodesService.getPage.mockClear();

      await repo.setPage(3, 15);

      expect(nodesService.getPage).toHaveBeenCalledWith(
        expect.anything(),
        3,
        15
      );
    });
  });
});
