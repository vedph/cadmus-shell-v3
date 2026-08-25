import { of, throwError } from 'rxjs';

import { EditedLayerRepository } from './edited-layer.repository';
import { FacetService, ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { Fragment, TextLayerPart, TokenLocation } from '@myrmidon/cadmus-core';

function makeLayerPart(
  fragments: Fragment[],
  thesaurusScope?: string
): TextLayerPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.token-text-layer',
    roleId: 'fr.it.vedph.comment',
    timeCreated: new Date(),
    creatorId: 'u',
    timeModified: new Date(),
    userId: 'u',
    fragments,
    thesaurusScope,
  };
}

function createRepository(overrides?: {
  layerPart?: TextLayerPart;
  thesauriSet?: any;
}): {
  repo: EditedLayerRepository;
  itemService: {
    getPart: ReturnType<typeof vi.fn>;
    getBaseTextPart: ReturnType<typeof vi.fn>;
    getLayerPartBreakChance: ReturnType<typeof vi.fn>;
    getLayerPartHints: ReturnType<typeof vi.fn>;
    applyLayerPatches: ReturnType<typeof vi.fn>;
    addPart: ReturnType<typeof vi.fn>;
  };
  facetService: { getFacetParts: ReturnType<typeof vi.fn> };
  thesaurusService: { getThesauriSet: ReturnType<typeof vi.fn>; getScopedId: ReturnType<typeof vi.fn> };
} {
  const layerPart = overrides?.layerPart ?? makeLayerPart([]);
  const itemService = {
    getPart: vi.fn().mockReturnValue(of(layerPart)),
    getBaseTextPart: vi
      .fn()
      .mockReturnValue(of({ part: { id: 'bt1' }, text: 'hello world' })),
    getLayerPartBreakChance: vi.fn().mockReturnValue(of({ chance: 0 })),
    getLayerPartHints: vi.fn().mockReturnValue(of([])),
    applyLayerPatches: vi.fn(),
    addPart: vi.fn(),
  };
  const facetService = {
    getFacetParts: vi.fn().mockReturnValue(of([])),
  };
  const thesaurusService = {
    getThesauriSet: vi.fn().mockReturnValue(of(overrides?.thesauriSet ?? {})),
    getScopedId: vi.fn().mockImplementation((id: string, scope?: string) =>
      scope ? `${id}.${scope}` : id
    ),
  };

  const repo = new EditedLayerRepository(
    itemService as unknown as ItemService,
    facetService as unknown as FacetService,
    thesaurusService as unknown as ThesaurusService
  );

  return { repo, itemService, facetService, thesaurusService };
}

describe('EditedLayerRepository', () => {
  it('should be created with empty initial state', () => {
    const { repo } = createRepository();
    expect(repo.getPart()).toBeUndefined();
    expect(repo.getBaseText()).toBeUndefined();
    expect(repo.getLocations()).toEqual([]);
  });

  describe('reset', () => {
    it('should clear part, base text and locations', () => {
      const layerPart = makeLayerPart([{ location: '1.1' }]);
      const { repo } = createRepository({ layerPart });
      repo.load('item1', 'part1');
      expect(repo.getPart()).toBeTruthy();

      repo.reset();

      expect(repo.getPart()).toBeUndefined();
      expect(repo.getBaseText()).toBeUndefined();
      expect(repo.getLocations()).toEqual([]);
    });
  });

  describe('load without thesauri', () => {
    it('should load part, base text, break chance and hints', () => {
      const layerPart = makeLayerPart([{ location: '1.1' }, { location: '1.3' }]);
      const { repo } = createRepository({ layerPart });

      repo.load('item1', 'part1');

      expect(repo.getPart()).toEqual(layerPart);
      expect(repo.getBaseText()).toBe('hello world');
      expect(repo.getLocations().map((l) => l.toString())).toEqual([
        '1.1',
        '1.3',
      ]);
    });

    it('should toggle loading true then false', () => {
      const { repo } = createRepository();
      const loadingHistory: boolean[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      repo.load('item1', 'part1');

      expect(loadingHistory).toEqual([false, true, false]);
    });

    it('should reset loading to false on error and leave state untouched', () => {
      const { repo, itemService } = createRepository();
      itemService.getPart.mockReturnValue(throwError(() => new Error('boom')));
      const loadingHistory: boolean[] = [];
      repo.loading$.subscribe((v) => loadingHistory.push(v));

      repo.load('item1', 'part1');

      expect(loadingHistory).toEqual([false, true, false]);
      expect(repo.getPart()).toBeUndefined();
    });
  });

  describe('load with thesauri', () => {
    it('should use the unscoped thesauri when the part has no thesaurus scope', () => {
      const layerPart = makeLayerPart([]);
      const { repo, thesaurusService } = createRepository({
        layerPart,
        thesauriSet: { 'cat@en': { id: 'cat@en', entries: [] } },
      });

      repo.load('item1', 'part1', ['cat@en']);

      expect(thesaurusService.getThesauriSet).toHaveBeenCalledTimes(1);
      expect(thesaurusService.getThesauriSet).toHaveBeenCalledWith(['cat@en']);
      expect(repo.getPart()).toEqual(layerPart);
    });

    it('should reload thesauri scoped to the part when it has a thesaurusScope', () => {
      const layerPart = makeLayerPart([], 'myscope');
      const { repo, thesaurusService } = createRepository({ layerPart });

      repo.load('item1', 'part1', ['cat@en']);

      // 1st call: unscoped ids resolution is done via getScopedId, not
      // getThesauriSet; getThesauriSet itself is called twice: once with
      // the unscoped ids (initial forkJoin) and once with the scoped ones
      expect(thesaurusService.getThesauriSet).toHaveBeenCalledTimes(2);
      expect(thesaurusService.getThesauriSet).toHaveBeenLastCalledWith([
        'cat@en.myscope',
      ]);
      expect(repo.getPart()).toEqual(layerPart);
    });

    it('should expose the loaded thesauri via thesauriSet$', () => {
      const layerPart = makeLayerPart([]);
      const thesauriSet = { 'cat@en': { id: 'cat@en', entries: [] } };
      const { repo } = createRepository({ layerPart, thesauriSet });

      let received: unknown;
      repo.thesauriSet$.subscribe((v) => (received = v));
      repo.load('item1', 'part1', ['cat@en']);

      expect(received).toEqual(thesauriSet);
    });
  });

  describe('refreshBreakChance', () => {
    it('should do nothing when no part is loaded', () => {
      const { repo, itemService } = createRepository();
      repo.refreshBreakChance();
      expect(itemService.getLayerPartBreakChance).not.toHaveBeenCalled();
    });

    it('should update breakChance$ from the loaded part id', () => {
      const layerPart = makeLayerPart([]);
      const { repo, itemService } = createRepository({ layerPart });
      repo.load('item1', 'part1');
      itemService.getLayerPartBreakChance.mockReturnValue(of({ chance: 2 }));

      let chance: number | undefined;
      repo.breakChance$.subscribe((v) => (chance = v));
      repo.refreshBreakChance();

      expect(chance).toBe(2);
      expect(itemService.getLayerPartBreakChance).toHaveBeenCalledWith('part1');
    });

    it('should reset breakChance$ to -1 on error', () => {
      const layerPart = makeLayerPart([]);
      const { repo, itemService } = createRepository({ layerPart });
      repo.load('item1', 'part1');
      itemService.getLayerPartBreakChance.mockReturnValue(
        throwError(() => new Error('boom'))
      );

      let chance: number | undefined;
      repo.breakChance$.subscribe((v) => (chance = v));
      repo.refreshBreakChance();

      expect(chance).toBe(-1);
    });
  });

  describe('applyLayerPatches', () => {
    it('should save then reload from the returned part', () => {
      const layerPart = makeLayerPart([{ location: '1.1' }]);
      const { repo, itemService } = createRepository({ layerPart });
      itemService.applyLayerPatches.mockReturnValue(of(layerPart));

      const savingHistory: boolean[] = [];
      repo.saving$.subscribe((v) => savingHistory.push(v));

      repo.applyLayerPatches('part1', ['patch1']);

      expect(itemService.applyLayerPatches).toHaveBeenCalledWith('part1', [
        'patch1',
      ]);
      expect(itemService.getPart).toHaveBeenCalledWith('part1');
      expect(savingHistory).toEqual([false, true, false]);
    });

    it('should reset saving to false on error without reloading', () => {
      const { repo, itemService } = createRepository();
      itemService.applyLayerPatches.mockReturnValue(
        throwError(() => new Error('boom'))
      );
      const savingHistory: boolean[] = [];
      repo.saving$.subscribe((v) => savingHistory.push(v));

      repo.applyLayerPatches('part1', ['patch1']);

      expect(savingHistory).toEqual([false, true, false]);
      expect(itemService.getPart).not.toHaveBeenCalled();
    });
  });

  describe('deleteFragment', () => {
    it('should do nothing when no part is loaded', () => {
      const { repo, itemService } = createRepository();
      repo.deleteFragment(TokenLocation.parse('1.1')!);
      expect(itemService.addPart).not.toHaveBeenCalled();
    });

    it('should do nothing when no fragment overlaps the given location', () => {
      const layerPart = makeLayerPart([{ location: '1.1' }]);
      const { repo, itemService } = createRepository({ layerPart });
      repo.load('item1', 'part1');

      repo.deleteFragment(TokenLocation.parse('9.9')!);

      expect(itemService.addPart).not.toHaveBeenCalled();
    });

    it('should remove the overlapping fragment and save a copy of the part', () => {
      const layerPart = makeLayerPart([
        { location: '1.1' },
        { location: '1.3' },
      ]);
      const { repo, itemService } = createRepository({ layerPart });
      repo.load('item1', 'part1');
      itemService.addPart.mockReturnValue(of(layerPart));

      repo.deleteFragment(TokenLocation.parse('1.1')!);

      expect(itemService.addPart).toHaveBeenCalledTimes(1);
      const savedPart = itemService.addPart.mock.calls[0][0] as TextLayerPart;
      expect(savedPart.fragments.map((f) => f.location)).toEqual(['1.3']);
      // the original loaded part must not be mutated (deep copy)
      expect(layerPart.fragments.map((f) => f.location)).toEqual([
        '1.1',
        '1.3',
      ]);
    });
  });

  describe('saveFragment', () => {
    it('should do nothing when no part is loaded', () => {
      const { repo, itemService } = createRepository();
      repo.saveFragment({ location: '1.1' });
      expect(itemService.addPart).not.toHaveBeenCalled();
    });

    it('should append a new non-overlapping fragment in sorted position', () => {
      const layerPart = makeLayerPart([
        { location: '1.1' },
        { location: '1.5' },
      ]);
      const { repo, itemService } = createRepository({ layerPart });
      repo.load('item1', 'part1');
      itemService.addPart.mockReturnValue(of(layerPart));

      repo.saveFragment({ location: '1.3' });

      const savedPart = itemService.addPart.mock.calls[0][0] as TextLayerPart;
      expect(savedPart.fragments.map((f) => f.location)).toEqual([
        '1.1',
        '1.3',
        '1.5',
      ]);
    });

    it('should replace a fragment at the same location in place', () => {
      const layerPart = makeLayerPart([
        { location: '1.1', baseText: 'old' },
      ]);
      const { repo, itemService } = createRepository({ layerPart });
      repo.load('item1', 'part1');
      itemService.addPart.mockReturnValue(of(layerPart));

      repo.saveFragment({ location: '1.1', baseText: 'new' });

      const savedPart = itemService.addPart.mock.calls[0][0] as TextLayerPart;
      expect(savedPart.fragments.length).toBe(1);
      expect(savedPart.fragments[0]).toEqual({
        location: '1.1',
        baseText: 'new',
      });
    });

    it('should toggle saving true then false and reload after success', () => {
      const layerPart = makeLayerPart([]);
      const { repo, itemService } = createRepository({ layerPart });
      repo.load('item1', 'part1');
      itemService.addPart.mockReturnValue(of(layerPart));
      const savingHistory: boolean[] = [];
      repo.saving$.subscribe((v) => savingHistory.push(v));

      repo.saveFragment({ location: '1.1' });

      expect(savingHistory).toEqual([false, true, false]);
      // reload triggered via load(part.itemId, part.id)
      expect(itemService.getPart).toHaveBeenCalledWith('part1');
    });

    it('should reset saving to false on error', () => {
      const layerPart = makeLayerPart([]);
      const { repo, itemService } = createRepository({ layerPart });
      repo.load('item1', 'part1');
      itemService.addPart.mockReturnValue(throwError(() => new Error('boom')));
      const savingHistory: boolean[] = [];
      repo.saving$.subscribe((v) => savingHistory.push(v));

      repo.saveFragment({ location: '1.1' });

      expect(savingHistory).toEqual([false, true, false]);
    });
  });
});
