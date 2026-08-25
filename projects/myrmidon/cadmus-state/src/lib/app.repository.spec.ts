import { of, throwError } from 'rxjs';

import { AppRepository } from './app.repository';
import {
  FacetService,
  FlagService,
  ThesaurusService,
  PreviewService,
  EditorSettingsService,
} from '@myrmidon/cadmus-api';
import { FacetDefinition, FlagDefinition, Thesaurus } from '@myrmidon/cadmus-core';

function createRepository(): {
  repo: AppRepository;
  facetService: { getFacets: ReturnType<typeof vi.fn> };
  flagService: { getFlags: ReturnType<typeof vi.fn> };
  thesaurusService: { getThesauriSet: ReturnType<typeof vi.fn> };
  previewService: { getKeys: ReturnType<typeof vi.fn> };
  settingService: {
    getSetting: ReturnType<typeof vi.fn>;
    addSetting: ReturnType<typeof vi.fn>;
  };
} {
  const facets: FacetDefinition[] = [
    {
      id: 'facet1',
      label: 'Facet 1',
      colorKey: 'red',
      description: '',
      partDefinitions: [
        { typeId: 'it.vedph.note', name: 'note', colorKey: 'blue' },
        {
          typeId: 'it.vedph.token-text',
          roleId: 'fr.it.vedph.comment',
          name: 'comment',
          colorKey: 'green',
        },
      ],
    },
  ];
  const flags: FlagDefinition[] = [
    { id: 1, label: 'flag1', description: '', colorKey: 'red' },
  ];
  const thesauri = {
    'model-types': { id: 'model-types@en', entries: [] } as Thesaurus,
    'item-browsers': { id: 'item-browsers@en', entries: [] } as Thesaurus,
  };

  const facetService = { getFacets: vi.fn().mockReturnValue(of(facets)) };
  const flagService = { getFlags: vi.fn().mockReturnValue(of(flags)) };
  const thesaurusService = {
    getThesauriSet: vi.fn().mockReturnValue(of(thesauri)),
  };
  const previewService = { getKeys: vi.fn().mockReturnValue(of(['k1'])) };
  const settingService = {
    getSetting: vi.fn().mockReturnValue(of({ value: 42 })),
    addSetting: vi.fn().mockReturnValue(of({ value: 42 })),
  };

  const repo = new AppRepository(
    facetService as unknown as FacetService,
    flagService as unknown as FlagService,
    thesaurusService as unknown as ThesaurusService,
    previewService as unknown as PreviewService,
    settingService as unknown as EditorSettingsService
  );

  return { repo, facetService, flagService, thesaurusService, previewService, settingService };
}

describe('AppRepository', () => {
  it('should be created with empty initial state', () => {
    const { repo } = createRepository();
    expect(repo).toBeTruthy();
    expect(repo.getFacets()).toEqual([]);
    expect(repo.getFlags()).toEqual([]);
    expect(repo.getTypeThesaurus()).toBeUndefined();
  });

  describe('load', () => {
    it('should load facets, flags, thesauri and preview keys', async () => {
      const { repo } = createRepository();
      await repo.load();
      expect(repo.getFacets().length).toBe(1);
      expect(repo.getFlags().length).toBe(1);
      expect(repo.getTypeThesaurus()?.id).toBe('model-types@en');
    });

    it('should update the observable streams', async () => {
      const { repo } = createRepository();
      const facetsPromise = new Promise<FacetDefinition[]>((resolve) => {
        repo.facets$.subscribe((f) => {
          if (f.length) {
            resolve(f);
          }
        });
      });
      await repo.load();
      const facets = await facetsPromise;
      expect(facets.length).toBe(1);
    });

    it('should not reload when already loaded and refresh is false', async () => {
      const { repo, facetService } = createRepository();
      await repo.load();
      await repo.load();
      expect(facetService.getFacets).toHaveBeenCalledTimes(1);
    });

    it('should reload when refresh is true even if already loaded', async () => {
      const { repo, facetService } = createRepository();
      await repo.load();
      await repo.load(true);
      expect(facetService.getFacets).toHaveBeenCalledTimes(2);
    });

    it('should reject when the underlying request fails', async () => {
      const { repo, facetService } = createRepository();
      facetService.getFacets.mockReturnValue(throwError(() => new Error('boom')));
      await expect(repo.load()).rejects.toBeTruthy();
    });
  });

  describe('clear', () => {
    it('should reset all state and the settings cache', async () => {
      const { repo, settingService } = createRepository();
      await repo.load();
      await repo.getSetting('s1');
      repo.clear();

      expect(repo.getFacets()).toEqual([]);
      expect(repo.getFlags()).toEqual([]);
      expect(repo.getTypeThesaurus()).toBeUndefined();

      // cache was cleared, so getSetting should hit the service again
      await repo.getSetting('s1');
      expect(settingService.getSetting).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadThesauri', () => {
    it('should load only the type and item-browser thesauri', async () => {
      const { repo, thesaurusService } = createRepository();
      await repo.loadThesauri();
      expect(repo.getTypeThesaurus()?.id).toBe('model-types@en');
      expect(thesaurusService.getThesauriSet).toHaveBeenCalledWith([
        'model-types@en',
        'item-browsers@en',
      ]);
    });

    it('should reject when the request fails', async () => {
      const { repo, thesaurusService } = createRepository();
      thesaurusService.getThesauriSet.mockReturnValue(
        throwError(() => new Error('boom'))
      );
      await expect(repo.loadThesauri()).rejects.toBeTruthy();
    });
  });

  describe('loadFlags', () => {
    it('should load flags', async () => {
      const { repo } = createRepository();
      await repo.loadFlags();
      expect(repo.getFlags().length).toBe(1);
    });

    it('should reject when the request fails', async () => {
      const { repo, flagService } = createRepository();
      flagService.getFlags.mockReturnValue(throwError(() => new Error('boom')));
      await expect(repo.loadFlags()).rejects.toBeTruthy();
    });
  });

  describe('getPartColor', () => {
    it('should return undefined when no facets are loaded', () => {
      const { repo } = createRepository();
      expect(repo.getPartColor('it.vedph.note')).toBeUndefined();
    });

    it('should return the color for a type-only match', async () => {
      const { repo } = createRepository();
      await repo.load();
      expect(repo.getPartColor('it.vedph.note')).toBe('blue');
    });

    it('should match by type and role when a role is given', async () => {
      const { repo } = createRepository();
      await repo.load();
      expect(
        repo.getPartColor('it.vedph.token-text', 'fr.it.vedph.comment')
      ).toBe('green');
    });

    it('should return undefined when the role does not match', async () => {
      const { repo } = createRepository();
      await repo.load();
      expect(
        repo.getPartColor('it.vedph.token-text', 'fr.it.vedph.other')
      ).toBeUndefined();
    });
  });

  describe('getSetting / setSetting', () => {
    it('should fetch and cache a setting', async () => {
      const { repo, settingService } = createRepository();
      const s1 = await repo.getSetting('s1');
      const s2 = await repo.getSetting('s1');
      expect(s1).toEqual({ value: 42 });
      expect(s2).toEqual({ value: 42 });
      expect(settingService.getSetting).toHaveBeenCalledTimes(1);
    });

    it('should force reload when reload is true', async () => {
      const { repo, settingService } = createRepository();
      await repo.getSetting('s1');
      await repo.getSetting('s1', true);
      expect(settingService.getSetting).toHaveBeenCalledTimes(2);
    });

    it('should reject when the underlying request fails', async () => {
      const { repo, settingService } = createRepository();
      settingService.getSetting.mockReturnValue(throwError(() => new Error('boom')));
      await expect(repo.getSetting('missing')).rejects.toBeTruthy();
    });

    it('should update the cache after setSetting resolves', async () => {
      const { repo, settingService } = createRepository();
      settingService.addSetting.mockReturnValue(of({ value: 99 }));
      repo.setSetting('s1', { value: 99 });
      // wait a tick for the subscription to resolve
      await Promise.resolve();
      const s1 = await repo.getSetting('s1');
      expect(s1).toEqual({ value: 99 });
      expect(settingService.getSetting).not.toHaveBeenCalled();
    });
  });

  describe('getSettingFor / setSettingFor', () => {
    it('should key the setting by typeId alone when no roleId is given', async () => {
      const { repo, settingService } = createRepository();
      await repo.getSettingFor('it.vedph.note');
      expect(settingService.getSetting).toHaveBeenCalledWith('it.vedph.note');
    });

    it('should key the setting by typeId_roleId when a roleId is given', async () => {
      const { repo, settingService } = createRepository();
      await repo.getSettingFor('it.vedph.note', 'scholarly');
      expect(settingService.getSetting).toHaveBeenCalledWith(
        'it.vedph.note_scholarly'
      );
    });

    it('setSettingFor should use the same key convention as getSettingFor', async () => {
      const { repo, settingService } = createRepository();
      settingService.addSetting.mockReturnValue(of({ value: 7 }));
      repo.setSettingFor('it.vedph.note', { value: 7 }, 'scholarly');
      await Promise.resolve();
      const cached = await repo.getSettingFor('it.vedph.note', 'scholarly');
      expect(cached).toEqual({ value: 7 });
      expect(settingService.getSetting).not.toHaveBeenCalled();
    });
  });
});
