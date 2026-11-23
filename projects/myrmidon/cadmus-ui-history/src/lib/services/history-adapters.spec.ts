import { firstValueFrom, of } from 'rxjs';

import {
  EditStatus,
  HistoryItem,
  HistoryItemInfo,
  Item,
  Part,
} from '@myrmidon/cadmus-core';
import { HistoryService, ItemService } from '@myrmidon/cadmus-api';
import { DataPage } from '@myrmidon/ngx-tools';

import {
  historyItemToItem,
  ItemHistoryAdapter,
  loadAllHistoryPages,
  PartHistoryAdapter,
  toItemJsonObject,
} from './history-adapters';

function page<T>(pageNumber: number, pageCount: number, items: T[]): DataPage<T> {
  return {
    pageNumber,
    pageSize: 100,
    pageCount,
    total: pageCount * items.length,
    items,
  };
}

function makeItem(overrides?: Partial<Item>): Item {
  return {
    id: 'i1',
    title: 'Title',
    description: 'Desc',
    facetId: 'f1',
    groupId: 'g1',
    sortKey: 'sk',
    flags: 0,
    timeCreated: new Date('2026-01-01T00:00:00Z'),
    creatorId: 'hera',
    timeModified: new Date('2026-11-01T00:00:00Z'),
    userId: 'zeus',
    ...overrides,
  };
}

function makeHistoryInfo(id: string): HistoryItemInfo {
  return {
    id,
    referenceId: 'i1',
    status: EditStatus.updated,
    flags: 0,
    timeCreated: new Date(0),
    creatorId: 'hera',
    timeModified: new Date(1000),
    userId: 'zeus',
  };
}

describe('loadAllHistoryPages', () => {
  it('should load all the pages in order', async () => {
    const getPage = vi.fn((n: number) => of(page(n, 3, [n])));
    const all = await firstValueFrom(loadAllHistoryPages(getPage));
    expect(all).toEqual([1, 2, 3]);
    expect(getPage).toHaveBeenCalledTimes(3);
  });

  it('should load a single empty page', async () => {
    const getPage = vi.fn(() => of(page<number>(1, 0, [])));
    expect(await firstValueFrom(loadAllHistoryPages(getPage))).toEqual([]);
    expect(getPage).toHaveBeenCalledTimes(1);
  });
});

describe('item helpers', () => {
  it('historyItemToItem should use the reference ID as the item ID', () => {
    const h: HistoryItem = {
      id: 'h1',
      referenceId: 'i1',
      status: EditStatus.updated,
      title: 'T',
      description: 'D',
      facetId: 'f',
      sortKey: 's',
      flags: 3,
      timeCreated: new Date(0),
      creatorId: 'c',
      timeModified: new Date(1),
      userId: 'u',
    };
    const item = historyItemToItem(h);
    expect(item.id).toBe('i1');
    expect(item.groupId).toBe('');
    expect(item.flags).toBe(3);
    expect((item as unknown as Record<string, unknown>)['status']).toBeUndefined();
  });

  it('toItemJsonObject should drop parts and normalize the group', () => {
    const json = toItemJsonObject(
      makeItem({ groupId: '', parts: [{ id: 'p' } as Part] }),
    ) as Record<string, unknown>;
    expect(json['parts']).toBeUndefined();
    expect(json['groupId']).toBeNull();
    // history and current versions with the same data have the same JSON
    expect(JSON.stringify(toItemJsonObject(makeItem({ groupId: '' })))).toBe(
      JSON.stringify(toItemJsonObject(makeItem({ groupId: undefined as any }))),
    );
  });
});

describe('ItemHistoryAdapter', () => {
  let historyService: {
    getItemHistory: ReturnType<typeof vi.fn>;
    getHistoryItem: ReturnType<typeof vi.fn>;
  };
  let itemService: {
    getItem: ReturnType<typeof vi.fn>;
    addItem: ReturnType<typeof vi.fn>;
  };

  function create(mask = 0): ItemHistoryAdapter {
    historyService = {
      getItemHistory: vi.fn(),
      getHistoryItem: vi.fn(),
    };
    itemService = {
      getItem: vi.fn().mockReturnValue(of(makeItem())),
      addItem: vi.fn().mockReturnValue(of(makeItem())),
    };
    return new ItemHistoryAdapter(
      'i1',
      historyService as unknown as HistoryService,
      itemService as unknown as ItemService,
      () => mask,
    );
  }

  it('getEntries should get all pages in the range', async () => {
    const adapter = create();
    historyService.getItemHistory.mockImplementation(
      (_id: string, _f: unknown, n: number) =>
        of(page(n, 2, [makeHistoryInfo('h' + n)])),
    );
    const min = new Date(0);
    const max = new Date(5000);

    const entries = await firstValueFrom(adapter.getEntries(min, max));

    expect(entries.map((e) => e.id)).toEqual(['h1', 'h2']);
    expect(historyService.getItemHistory).toHaveBeenCalledWith(
      'i1',
      { minModified: min, maxModified: max },
      1,
      100,
    );
  });

  it('getLatestEntry should get the first entry or null', async () => {
    const adapter = create();
    historyService.getItemHistory.mockReturnValue(
      of(page(1, 1, [makeHistoryInfo('h9')])),
    );
    expect((await firstValueFrom(adapter.getLatestEntry()))?.id).toBe('h9');
    expect(historyService.getItemHistory).toHaveBeenCalledWith(
      'i1',
      undefined,
      1,
      1,
    );
    historyService.getItemHistory.mockReturnValue(of(page(1, 0, [])));
    expect(await firstValueFrom(adapter.getLatestEntry())).toBeNull();
  });

  it('getCurrent should not fail when the item does not exist', () => {
    const adapter = create();
    adapter.getCurrent();
    expect(itemService.getItem).toHaveBeenCalledWith('i1', false, true);
  });

  it('restore should save the current item with the version metadata', async () => {
    const adapter = create();
    const current = makeItem({ sortKey: 'current-sk', flags: 1 });
    const version = makeItem({
      title: 'Old',
      description: 'Old desc',
      facetId: 'f0',
      groupId: 'g0',
      flags: 2,
      sortKey: 'old-sk',
      timeModified: new Date(0),
    });

    await firstValueFrom(adapter.restore(version, current));

    const saved: Item = itemService.addItem.mock.calls[0][0];
    expect(saved).toEqual(
      expect.objectContaining({
        id: 'i1',
        title: 'Old',
        description: 'Old desc',
        facetId: 'f0',
        groupId: 'g0',
        flags: 2,
        // the rest comes from the current item
        sortKey: 'current-sk',
        timeModified: current.timeModified,
      }),
    );
  });

  it('restore should keep the flags the user cannot change', () => {
    // flag 4 is an admin flag for a non-admin user
    const adapter = create(4);
    const current = makeItem({ flags: 4 | 1 });
    const version = makeItem({ flags: 2 });

    const restored = adapter.getRestoredItem(version, current);

    // 2 restored, 1 cleared, admin 4 kept as currently set
    expect(restored.flags).toBe(4 | 2);
    // an admin flag set only in the version is not restored
    expect(
      adapter.getRestoredItem(makeItem({ flags: 4 }), makeItem({ flags: 0 }))
        .flags,
    ).toBe(0);
  });
});

describe('PartHistoryAdapter', () => {
  let itemService: {
    getPart: ReturnType<typeof vi.fn>;
    addPart: ReturnType<typeof vi.fn>;
  };
  let historyService: {
    getPartHistory: ReturnType<typeof vi.fn>;
    getHistoryPart: ReturnType<typeof vi.fn>;
  };

  function makePart(overrides?: Partial<Part>): Part {
    return {
      id: 'p1',
      itemId: 'i1',
      typeId: 'it.vedph.note',
      timeCreated: new Date(0),
      creatorId: 'hera',
      timeModified: new Date(0),
      userId: 'zeus',
      ...overrides,
    };
  }

  function create(): PartHistoryAdapter {
    itemService = {
      getPart: vi.fn().mockReturnValue(of(makePart())),
      addPart: vi.fn().mockReturnValue(of(makePart())),
    };
    historyService = {
      getPartHistory: vi.fn().mockReturnValue(of(page(1, 1, []))),
      getHistoryPart: vi
        .fn()
        .mockReturnValue(of({ id: 'h1', part: makePart({ text: 'old' } as any) })),
    };
    return new PartHistoryAdapter(
      'p1',
      historyService as unknown as HistoryService,
      itemService as unknown as ItemService,
    );
  }

  it('getEntryData should return the part of the history part', async () => {
    const adapter = create();
    const part = await firstValueFrom(
      adapter.getEntryData({ id: 'h1' } as any),
    );
    expect(historyService.getHistoryPart).toHaveBeenCalledWith('h1');
    expect((part as any).text).toBe('old');
  });

  it('getEntries should query the part history in the range', async () => {
    const adapter = create();
    await firstValueFrom(adapter.getEntries(new Date(0), new Date(1)));
    expect(historyService.getPartHistory).toHaveBeenCalledWith(
      'p1',
      { minModified: new Date(0), maxModified: new Date(1) },
      1,
      100,
    );
  });

  it('restore should keep the current thesaurus scope', async () => {
    const adapter = create();
    const version = makePart({ thesaurusScope: 'old-scope', text: 'old' } as any);

    await firstValueFrom(
      adapter.restore(version, makePart({ thesaurusScope: 'new-scope' })),
    );

    const saved = itemService.addPart.mock.calls[0][0];
    expect(saved.thesaurusScope).toBe('new-scope');
    expect(saved.text).toBe('old');
    expect(saved.id).toBe('p1');
    // the version is not changed
    expect(version.thesaurusScope).toBe('old-scope');
  });

  it('restore should remove the scope when the current part has none', () => {
    const adapter = create();
    const restored = adapter.getRestoredPart(
      makePart({ thesaurusScope: 'old-scope' }),
      makePart(),
    );
    expect('thesaurusScope' in restored).toBe(false);
  });
});
