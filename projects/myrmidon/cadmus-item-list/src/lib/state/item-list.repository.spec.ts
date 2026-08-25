import { Subject, of, throwError } from 'rxjs';

import {
  ItemListRepository,
  MESSAGE_ITEM_LIST_REPOSITORY_RESET,
} from './item-list.repository';
import { ItemService, MessagingService, MessagePayload } from '@myrmidon/cadmus-api';
import { DataPage } from '@myrmidon/ngx-tools';
import { ItemFilter, ItemInfo } from '@myrmidon/cadmus-core';

function makePage(items: ItemInfo[] = []): DataPage<ItemInfo> {
  return { pageNumber: 1, pageSize: 20, pageCount: 1, total: items.length, items };
}

function createRepository(): {
  repo: ItemListRepository;
  itemService: {
    getItems: ReturnType<typeof vi.fn>;
    deleteItem: ReturnType<typeof vi.fn>;
  };
  messages$: Subject<MessagePayload<any>>;
} {
  const itemService = {
    getItems: vi.fn().mockReturnValue(of(makePage())),
    deleteItem: vi.fn().mockReturnValue(of(undefined)),
  };
  const messages$ = new Subject<MessagePayload<any>>();
  const messaging = { messages$ };

  const repo = new ItemListRepository(
    itemService as unknown as ItemService,
    messaging as unknown as MessagingService
  );
  return { repo, itemService, messages$ };
}

describe('ItemListRepository', () => {
  it('should be created and load an initial page', () => {
    const { repo, itemService } = createRepository();
    expect(repo).toBeTruthy();
    expect(itemService.getItems).toHaveBeenCalled();
  });

  describe('loadPage', () => {
    it('should delegate to ItemService.getItems and toggle loading$', () => {
      const { repo, itemService } = createRepository();
      itemService.getItems.mockClear();
      const filter: ItemFilter = { title: 'x' };
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      let result: DataPage<ItemInfo> | undefined;
      repo.loadPage(2, 10, filter).subscribe((page) => (result = page));

      expect(itemService.getItems).toHaveBeenCalledWith(filter, 2, 10);
      expect(result).toBeTruthy();
      expect(loadingHistory.at(-1)).toBe(false);
    });

    it('should reset loading$ to false even when the request errors', () => {
      const { repo, itemService } = createRepository();
      itemService.getItems.mockReturnValue(throwError(() => new Error('boom')));
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      repo.loadPage(1, 20, {}).subscribe({ error: () => {} });

      expect(loadingHistory.at(-1)).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reload the first page and toggle loading$', async () => {
      const { repo, itemService } = createRepository();
      itemService.getItems.mockClear();
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      await repo.reset();

      expect(itemService.getItems).toHaveBeenCalled();
      expect(loadingHistory.at(-1)).toBe(false);
    });

    it('should be triggered by a MESSAGE_ITEM_LIST_REPOSITORY_RESET message', async () => {
      const { repo, itemService, messages$ } = createRepository();
      itemService.getItems.mockClear();

      messages$.next({ id: MESSAGE_ITEM_LIST_REPOSITORY_RESET });
      // reset() is async; give its promise chain a tick
      await Promise.resolve();
      await Promise.resolve();

      expect(itemService.getItems).toHaveBeenCalled();
    });

    it('should ignore unrelated messages', () => {
      const { itemService, messages$ } = createRepository();
      itemService.getItems.mockClear();

      messages$.next({ id: 'some-other-message' });

      expect(itemService.getItems).not.toHaveBeenCalled();
    });
  });

  describe('setFilter / getFilter', () => {
    it('should apply the filter and expose it via getFilter', async () => {
      const { repo } = createRepository();
      const filter: ItemFilter = { title: 'hello' };

      await repo.setFilter(filter);

      expect(repo.getFilter()).toEqual(filter);
    });

    it('should reset loading$ to false even when setFilter fails', async () => {
      const { repo, itemService } = createRepository();
      itemService.getItems.mockReturnValue(throwError(() => new Error('boom')));
      const loadingHistory: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      await expect(repo.setFilter({ title: 'x' })).rejects.toBeTruthy();

      expect(loadingHistory.at(-1)).toBe(false);
    });
  });

  describe('setPage', () => {
    it('should load the requested page', async () => {
      const { repo, itemService } = createRepository();
      itemService.getItems.mockClear();

      await repo.setPage(3, 15);

      expect(itemService.getItems).toHaveBeenCalledWith(
        expect.anything(),
        3,
        15
      );
    });
  });

  describe('deleteItem', () => {
    it('should delete via ItemService and reset the store', () => {
      const { repo, itemService } = createRepository();
      itemService.getItems.mockClear();

      repo.deleteItem('item1');

      expect(itemService.deleteItem).toHaveBeenCalledWith('item1');
      // reset() reloads the first page
      expect(itemService.getItems).toHaveBeenCalled();
    });
  });
});
