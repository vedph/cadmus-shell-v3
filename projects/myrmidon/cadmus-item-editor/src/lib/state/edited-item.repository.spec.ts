import { of, throwError } from 'rxjs';

import { EditedItemRepository } from './edited-item.repository';
import { ItemService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';
import { FacetDefinition, Item, LayerPartInfo, Part } from '@myrmidon/cadmus-core';

function makeItem(overrides?: Partial<Item>): Item {
  return {
    id: 'item1',
    title: 'Item 1',
    description: '',
    facetId: 'facet1',
    groupId: '',
    sortKey: '',
    flags: 0,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ...overrides,
  };
}

function makeFacet(overrides?: Partial<FacetDefinition>): FacetDefinition {
  return {
    id: 'facet1',
    label: 'Facet',
    colorKey: 'ff0000',
    description: '',
    partDefinitions: [
      { typeId: 'it.vedph.note', name: 'Note' },
      {
        typeId: 'it.vedph.token-text-layer',
        roleId: 'fr.it.vedph.comment',
        name: 'comment layer',
      },
    ],
    ...overrides,
  };
}

function createRepository(facets: FacetDefinition[] = [makeFacet()]): {
  repo: EditedItemRepository;
  itemService: {
    getItem: ReturnType<typeof vi.fn>;
    getItemLayerInfo: ReturnType<typeof vi.fn>;
    groupParts: ReturnType<typeof vi.fn>;
    addItem: ReturnType<typeof vi.fn>;
    deletePart: ReturnType<typeof vi.fn>;
    addPart: ReturnType<typeof vi.fn>;
    setPartThesaurusScope: ReturnType<typeof vi.fn>;
  };
  appRepository: { load: ReturnType<typeof vi.fn>; getFacets: ReturnType<typeof vi.fn> };
} {
  const itemService = {
    getItem: vi.fn().mockReturnValue(of(makeItem())),
    getItemLayerInfo: vi.fn().mockReturnValue(of([] as LayerPartInfo[])),
    groupParts: vi.fn().mockReturnValue([]),
    addItem: vi.fn(),
    deletePart: vi.fn(),
    addPart: vi.fn(),
    setPartThesaurusScope: vi.fn(),
  };
  const appRepository = {
    load: vi.fn().mockResolvedValue(undefined),
    getFacets: vi.fn().mockReturnValue(facets),
  };
  const repo = new EditedItemRepository(
    appRepository as unknown as AppRepository,
    itemService as unknown as ItemService
  );
  return { repo, itemService, appRepository };
}

describe('EditedItemRepository', () => {
  it('should be created and load app data', () => {
    const { repo, appRepository } = createRepository();
    expect(repo).toBeTruthy();
    expect(appRepository.load).toHaveBeenCalled();
  });

  describe('load with no itemId (new item)', () => {
    it('should build a blank item using the default facet', () => {
      const { repo } = createRepository([
        makeFacet({ id: 'default' }),
        makeFacet({ id: 'facet1' }),
      ]);
      repo.load();
      expect(repo.getItem()?.facetId).toBe('default');
      expect(repo.getItem()?.id).toBe('');
    });

    it('should fall back to the first facet when there is no "default" facet', () => {
      const { repo } = createRepository([makeFacet({ id: 'only' })]);
      repo.load();
      expect(repo.getItem()?.facetId).toBe('only');
    });

    it('should leave facetId empty when there are no facets at all', () => {
      const { repo } = createRepository([]);
      repo.load();
      expect(repo.getItem()?.facetId).toBe('');
      expect(repo.getFacet()).toBeUndefined();
    });

    it('should toggle loading$ true then false', () => {
      const { repo } = createRepository();
      const history: (boolean | undefined)[] = [];
      repo.loading$.subscribe((v) => history.push(v));
      repo.load();
      expect(history).toEqual([undefined, true, false]);
    });
  });

  describe('load with an itemId (existing item)', () => {
    it('should load the item, its facet, parts and layers', () => {
      const facet = makeFacet();
      const item = makeItem({
        parts: [
          {
            id: 'p1',
            itemId: 'item1',
            typeId: 'it.vedph.note',
            timeCreated: new Date(0),
            creatorId: 'u',
            timeModified: new Date(0),
            userId: 'u',
          } as Part,
        ],
      });
      const { repo, itemService } = createRepository([facet]);
      itemService.getItem.mockReturnValue(of(item));
      itemService.groupParts.mockReturnValue([
        { key: 'general', label: 'general', parts: item.parts },
      ]);

      repo.load('item1');

      expect(repo.getItem()).toEqual(item);
      expect(repo.getFacet()).toEqual(facet);
      expect(repo.getPartGroups().length).toBe(1);
      expect(itemService.groupParts).toHaveBeenCalledWith(
        item.parts,
        facet.partDefinitions
      );
    });

    it('should leave facet undefined when the item facetId does not match any facet', () => {
      const { repo, itemService } = createRepository([makeFacet({ id: 'other' })]);
      itemService.getItem.mockReturnValue(of(makeItem({ facetId: 'missing' })));
      repo.load('item1');
      expect(repo.getFacet()).toBeUndefined();
    });
  });

  describe('newPartDefinitions', () => {
    it('should exclude layer (fr.-role) part definitions', () => {
      const { repo } = createRepository([makeFacet()]);
      repo.load();
      const ids: string[] = [];
      repo.newPartDefinitions$.subscribe((defs) =>
        ids.push(...defs.map((d) => d.typeId))
      );
      expect(ids).toEqual(['it.vedph.note']);
    });

    it('should exclude part definitions already present on the item', () => {
      const facet = makeFacet({
        partDefinitions: [
          { typeId: 'it.vedph.note', name: 'Note' },
          { typeId: 'it.vedph.date', name: 'Date' },
        ],
      });
      const item = makeItem({
        parts: [
          {
            id: 'p1',
            itemId: 'item1',
            typeId: 'it.vedph.note',
            timeCreated: new Date(0),
            creatorId: 'u',
            timeModified: new Date(0),
            userId: 'u',
          } as Part,
        ],
      });
      const { repo, itemService } = createRepository([facet]);
      itemService.getItem.mockReturnValue(of(item));
      itemService.groupParts.mockReturnValue([
        { key: 'general', label: 'general', parts: item.parts },
      ]);

      repo.load('item1');

      let defs: any[] = [];
      repo.newPartDefinitions$.subscribe((d) => (defs = d));
      expect(defs.map((d) => d.typeId)).toEqual(['it.vedph.date']);
    });
  });

  describe('ensureItemLoaded', () => {
    it('should not reload when the requested item is already loaded', () => {
      const { repo, itemService } = createRepository();
      itemService.getItem.mockReturnValue(of(makeItem({ id: 'item1' })));
      repo.load('item1');
      itemService.getItem.mockClear();

      repo.ensureItemLoaded('item1');

      expect(itemService.getItem).not.toHaveBeenCalled();
    });

    it('should load when a different item is requested', () => {
      const { repo, itemService } = createRepository();
      itemService.getItem.mockReturnValue(of(makeItem({ id: 'item1' })));
      repo.load('item1');
      itemService.getItem.mockClear();
      itemService.getItem.mockReturnValue(of(makeItem({ id: 'item2' })));

      repo.ensureItemLoaded('item2');

      expect(itemService.getItem).toHaveBeenCalledWith('item2', true);
    });
  });

  describe('save', () => {
    it('should save and update the item and facet', async () => {
      const facet = makeFacet({ id: 'facet2' });
      const { repo, itemService } = createRepository([facet]);
      const saved = makeItem({ id: 'item1', facetId: 'facet2' });
      itemService.addItem.mockReturnValue(of(saved));

      const result = await repo.save(makeItem());

      expect(result).toEqual(saved);
      expect(repo.getItem()).toEqual(saved);
      expect(repo.getFacet()).toEqual(facet);
    });

    it('should reject with a descriptive message on error', async () => {
      const { repo, itemService } = createRepository();
      itemService.addItem.mockReturnValue(throwError(() => new Error('boom')));
      await expect(repo.save(makeItem())).rejects.toMatchObject({
        message: 'Error saving item item1',
      });
    });
  });

  describe('deletePart', () => {
    it('should delete the part and reload the item', async () => {
      const { repo, itemService } = createRepository();
      itemService.getItem.mockReturnValue(of(makeItem({ id: 'item1' })));
      repo.load('item1');
      itemService.deletePart.mockReturnValue(of(undefined));
      itemService.getItem.mockClear();

      const result = await repo.deletePart('p1');

      expect(result).toBe('p1');
      expect(itemService.getItem).toHaveBeenCalledWith('item1', true);
    });

    it('should reject and NOT call the API when the item is unsaved (regression)', async () => {
      // regression test: previously the missing `return` after reject()
      // let execution fall through, still calling deletePart() and then
      // load(undefined) - which load() treats as "load a new item",
      // silently blowing away the currently edited item's state.
      const { repo, itemService } = createRepository();
      // no repo.load() call: _item$ stays undefined

      await expect(repo.deletePart('p1')).rejects.toMatchObject({
        message: 'Cannot delete part of unsaved item',
      });
      expect(itemService.deletePart).not.toHaveBeenCalled();
    });
  });

  describe('addNewLayerPart', () => {
    it('should add the part and reload the item', async () => {
      const { repo, itemService } = createRepository();
      itemService.getItem.mockReturnValue(of(makeItem({ id: 'item1' })));
      repo.load('item1');
      const newPart = { id: 'p1' } as Part;
      itemService.addPart.mockReturnValue(of(newPart));
      itemService.getItem.mockClear();

      const result = await repo.addNewLayerPart('it.vedph.token-text-layer', 'fr.it.vedph.comment');

      expect(result).toEqual(newPart);
      expect(itemService.addPart).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item1',
          typeId: 'it.vedph.token-text-layer',
          roleId: 'fr.it.vedph.comment',
        })
      );
      expect(itemService.getItem).toHaveBeenCalled();
    });

    it('should reject and NOT call the API when the item is unsaved (regression)', async () => {
      const { repo, itemService } = createRepository();

      await expect(
        repo.addNewLayerPart('it.vedph.token-text-layer')
      ).rejects.toMatchObject({
        message: 'Cannot add part to unsaved item',
      });
      expect(itemService.addPart).not.toHaveBeenCalled();
    });
  });

  describe('setPartThesaurusScope', () => {
    it('should set the scope and reload the item', async () => {
      const { repo, itemService } = createRepository();
      itemService.getItem.mockReturnValue(of(makeItem({ id: 'item1' })));
      repo.load('item1');
      itemService.setPartThesaurusScope.mockReturnValue(of(undefined));
      itemService.getItem.mockClear();

      const result = await repo.setPartThesaurusScope(['p1', 'p2'], 'scope1');

      expect(result).toBe(true);
      expect(itemService.setPartThesaurusScope).toHaveBeenCalledWith(
        ['p1', 'p2'],
        'scope1'
      );
      expect(itemService.getItem).toHaveBeenCalled();
    });

    it('should reject and NOT call the API when the item is unsaved (regression)', async () => {
      const { repo, itemService } = createRepository();

      await expect(
        repo.setPartThesaurusScope(['p1'], 'scope1')
      ).rejects.toMatchObject({
        message: 'Cannot set scope for unsaved item',
      });
      expect(itemService.setPartThesaurusScope).not.toHaveBeenCalled();
    });
  });
});
