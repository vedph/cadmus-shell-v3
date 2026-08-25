import { of, throwError } from 'rxjs';

import { ThesaurusListRepository } from './thesaurus-list.repository';
import { ThesaurusService } from '@myrmidon/cadmus-api';
import { DataPage } from '@myrmidon/ngx-tools';
import { Thesaurus } from '@myrmidon/cadmus-core';

function makePage(items: Thesaurus[] = []): DataPage<Thesaurus> {
  return { pageNumber: 1, pageSize: 20, pageCount: 1, total: items.length, items };
}

function createRepository(): {
  repo: ThesaurusListRepository;
  thesaurusService: {
    getThesauri: ReturnType<typeof vi.fn>;
    deleteThesaurus: ReturnType<typeof vi.fn>;
  };
} {
  const thesaurusService = {
    getThesauri: vi.fn().mockReturnValue(of(makePage())),
    deleteThesaurus: vi.fn().mockReturnValue(of(undefined)),
  };
  const repo = new ThesaurusListRepository(
    thesaurusService as unknown as ThesaurusService
  );
  return { repo, thesaurusService };
}

describe('ThesaurusListRepository', () => {
  it('should be created and load an initial page', () => {
    const { repo, thesaurusService } = createRepository();
    expect(repo).toBeTruthy();
    expect(thesaurusService.getThesauri).toHaveBeenCalled();
  });

  describe('loadPage', () => {
    it('should delegate to ThesaurusService.getThesauri and toggle loading$', () => {
      const { repo, thesaurusService } = createRepository();
      thesaurusService.getThesauri.mockClear();
      const filter = { id: 'x' };
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      let result: DataPage<Thesaurus> | undefined;
      repo.loadPage(2, 10, filter).subscribe((p) => (result = p));

      expect(thesaurusService.getThesauri).toHaveBeenCalledWith(filter, 2, 10);
      expect(result).toBeTruthy();
      expect(loadingHistory.at(-1)).toBe(false);
    });

    it('should reset loading$ to false even when the request errors', () => {
      const { repo, thesaurusService } = createRepository();
      thesaurusService.getThesauri.mockReturnValue(
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
      const { repo, thesaurusService } = createRepository();
      thesaurusService.getThesauri.mockClear();

      await repo.setFilter({ id: 'hello' });

      expect(thesaurusService.getThesauri).toHaveBeenCalledWith(
        { id: 'hello' },
        1,
        expect.any(Number)
      );
    });

    it('should load the requested page via setPage', async () => {
      const { repo, thesaurusService } = createRepository();
      thesaurusService.getThesauri.mockClear();

      await repo.setPage(3, 15);

      expect(thesaurusService.getThesauri).toHaveBeenCalledWith(
        expect.anything(),
        3,
        15
      );
    });
  });

  describe('deleteThesaurus', () => {
    it('should delete via ThesaurusService and reset the store on success', () => {
      const { repo, thesaurusService } = createRepository();
      thesaurusService.getThesauri.mockClear();

      repo.deleteThesaurus('t1');

      expect(thesaurusService.deleteThesaurus).toHaveBeenCalledWith('t1');
      // reset() reloads the first page
      expect(thesaurusService.getThesauri).toHaveBeenCalled();
    });

    it('should reset loading$ to false on delete error without resetting the store', () => {
      const { repo, thesaurusService } = createRepository();
      thesaurusService.deleteThesaurus.mockReturnValue(
        throwError(() => new Error('boom'))
      );
      thesaurusService.getThesauri.mockClear();
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      repo.deleteThesaurus('t1');

      expect(loadingHistory.at(-1)).toBe(false);
      expect(thesaurusService.getThesauri).not.toHaveBeenCalled();
    });
  });
});
