import { of, throwError } from 'rxjs';

import { ItemSearchRepository } from './item-search.repository';
import { ItemService } from '@myrmidon/cadmus-api';
import { DataPage, ErrorWrapper } from '@myrmidon/ngx-tools';
import { ItemInfo } from '@myrmidon/cadmus-core';

function makePage(items: ItemInfo[] = []): DataPage<ItemInfo> {
  return { pageNumber: 1, pageSize: 20, pageCount: 1, total: items.length, items };
}

function createRepository(): {
  repo: ItemSearchRepository;
  itemService: { searchItems: ReturnType<typeof vi.fn>; deleteItem: ReturnType<typeof vi.fn> };
} {
  const itemService = {
    searchItems: vi.fn().mockReturnValue(of({ value: makePage() } as ErrorWrapper<DataPage<ItemInfo>>)),
    deleteItem: vi.fn().mockReturnValue(of(undefined)),
  };
  const repo = new ItemSearchRepository(itemService as unknown as ItemService);
  return { repo, itemService };
}

describe('ItemSearchRepository', () => {
  it('should be created', () => {
    const { repo } = createRepository();
    expect(repo).toBeTruthy();
  });

  describe('loadPage', () => {
    it('should return an empty page without calling the API when there is no query yet', () => {
      const { repo, itemService } = createRepository();
      let result: DataPage<ItemInfo> | undefined;
      repo.loadPage(1, 20).subscribe((p) => (result = p));
      expect(itemService.searchItems).not.toHaveBeenCalled();
      expect(result?.items).toEqual([]);
    });

    it('should search using the last query once one has been set', async () => {
      const { repo, itemService } = createRepository();
      await repo.search('hello');
      itemService.searchItems.mockClear();

      let result: DataPage<ItemInfo> | undefined;
      repo.loadPage(2, 10).subscribe((p) => (result = p));

      expect(itemService.searchItems).toHaveBeenCalledWith('hello', 2, 10);
      expect(result).toBeTruthy();
    });

    it('should surface a wrapped error via error$ and return an empty page', async () => {
      const { repo, itemService } = createRepository();
      await repo.search('hello');
      itemService.searchItems.mockReturnValue(
        of({ error: 'bad query' } as ErrorWrapper<DataPage<ItemInfo>>)
      );

      const errors: (string | undefined)[] = [];
      repo.error$.subscribe((e) => errors.push(e));

      let result: DataPage<ItemInfo> | undefined;
      repo.loadPage(1, 20).subscribe((p) => (result = p));

      expect(errors.at(-1)).toBe('bad query');
      expect(result?.items).toEqual([]);
    });

    it('should set a generic error$ and reset loading$ on a request failure', async () => {
      const { repo, itemService } = createRepository();
      await repo.search('hello');
      itemService.searchItems.mockReturnValue(throwError(() => new Error('boom')));

      const errors: (string | undefined)[] = [];
      repo.error$.subscribe((e) => errors.push(e));
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      repo.loadPage(1, 20).subscribe({ error: () => {} });

      expect(errors.at(-1)).toBe('Error searching item');
      expect(loadingHistory.at(-1)).toBe(false);
    });
  });

  describe('search', () => {
    it('should update query$ and the query history', async () => {
      const { repo } = createRepository();
      await repo.search('first');
      await repo.search('second');

      let query: string | undefined;
      repo.query$.subscribe((q) => (query = q));
      expect(query).toBe('second');

      let history: string[] = [];
      repo.lastQueries$.subscribe((h) => (history = h));
      expect(history).toEqual(['second', 'first']);
    });

    it('should not duplicate a query already in history', async () => {
      const { repo } = createRepository();
      await repo.search('same');
      await repo.search('same');

      let history: string[] = [];
      repo.lastQueries$.subscribe((h) => (history = h));
      expect(history).toEqual(['same']);
    });
  });

  describe('setPage', () => {
    it('should toggle loading$ true then false', async () => {
      const { repo } = createRepository();
      await repo.search('hello');
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      await repo.setPage(2, 10);

      expect(loadingHistory.at(-1)).toBe(false);
    });
  });

  describe('deleteItem', () => {
    it('should delete via ItemService and reset the store', () => {
      const { repo, itemService } = createRepository();
      repo.deleteItem('item1');
      expect(itemService.deleteItem).toHaveBeenCalledWith('item1');
    });
  });
});
