import { of } from 'rxjs';

import { FlagListRepository } from './flag-list.repository';
import { FlagService } from '@myrmidon/cadmus-api';
import { FlagDefinition } from '@myrmidon/cadmus-core';

function makeFlag(overrides?: Partial<FlagDefinition>): FlagDefinition {
  return {
    id: 1,
    label: 'admin',
    description: 'admin flag',
    colorKey: 'f00000',
    ...overrides,
  };
}

function createRepository(initial: FlagDefinition[] = []): {
  repo: FlagListRepository;
  flagService: {
    getFlags: ReturnType<typeof vi.fn>;
    addFlags: ReturnType<typeof vi.fn>;
  };
} {
  const flagService = {
    getFlags: vi.fn().mockReturnValue(of(initial)),
    addFlags: vi.fn().mockReturnValue(of(undefined)),
  };
  const repo = new FlagListRepository(flagService as unknown as FlagService);
  return { repo, flagService };
}

describe('FlagListRepository', () => {
  it('should load flags on construction', () => {
    const { repo, flagService } = createRepository([makeFlag()]);
    expect(flagService.getFlags).toHaveBeenCalled();
    expect(repo.getFlags()).toEqual([makeFlag()]);
  });

  describe('reset', () => {
    it('should clear the active flag and reload from the service', () => {
      const { repo, flagService } = createRepository([makeFlag()]);
      repo.setActive(1);
      flagService.getFlags.mockClear();
      flagService.getFlags.mockReturnValue(of([makeFlag({ id: 2 })]));

      repo.reset();

      let active: FlagDefinition | null = makeFlag();
      repo.activeFlag$.subscribe((f) => (active = f));
      expect(active).toBeNull();
      expect(flagService.getFlags).toHaveBeenCalled();
      expect(repo.getFlags()).toEqual([makeFlag({ id: 2 })]);
    });

    it('should toggle loading$ around the request', () => {
      const { repo } = createRepository();
      const history: boolean[] = [];
      repo.loading$.subscribe((v) => history.push(v));
      repo.reset();
      expect(history.at(-1)).toBe(false);
    });
  });

  describe('getCount', () => {
    it('should return the number of loaded flags', () => {
      const { repo } = createRepository([makeFlag(), makeFlag({ id: 2 })]);
      expect(repo.getCount()).toBe(2);
    });

    it('should return 0 when there are no flags', () => {
      const { repo } = createRepository([]);
      expect(repo.getCount()).toBe(0);
    });
  });

  describe('save', () => {
    it('should delegate to FlagService.addFlags with the current flags', async () => {
      const { repo, flagService } = createRepository([makeFlag()]);

      await repo.save();

      expect(flagService.addFlags).toHaveBeenCalledWith([makeFlag()]);
    });

    it('should toggle loading$ around the save', async () => {
      const { repo } = createRepository();
      const history: boolean[] = [];
      repo.loading$.subscribe((v) => history.push(v));
      await repo.save();
      expect(history.at(-1)).toBe(false);
    });
  });

  describe('addNewFlag', () => {
    it('should add a flag with the lowest unused bit id and set it active', () => {
      const { repo } = createRepository([makeFlag({ id: 1 }), makeFlag({ id: 2 })]);

      const id = repo.addNewFlag();

      expect(id).toBe(4);
      expect(repo.getFlags().map((f) => f.id)).toEqual([1, 2, 4]);
      let active: FlagDefinition | null = null;
      repo.activeFlag$.subscribe((f) => (active = f));
      expect(active).toMatchObject({ id: 4 });
    });

    it('should return 0 when all 32 bits are already used', () => {
      const allBits = Array.from({ length: 32 }, (_, i) => makeFlag({ id: 1 << i }));
      const { repo } = createRepository(allBits);

      const id = repo.addNewFlag();

      expect(id).toBe(0);
      expect(repo.getCount()).toBe(32);
    });
  });

  describe('deleteFlag', () => {
    it('should remove the flag with the given id', () => {
      const { repo } = createRepository([makeFlag({ id: 1 }), makeFlag({ id: 2 })]);
      repo.deleteFlag(1);
      expect(repo.getFlags().map((f) => f.id)).toEqual([2]);
    });

    it('should clear the active flag when it is the one being deleted', () => {
      const { repo } = createRepository([makeFlag({ id: 1 })]);
      repo.setActive(1);

      repo.deleteFlag(1);

      let active: FlagDefinition | null = makeFlag();
      repo.activeFlag$.subscribe((f) => (active = f));
      expect(active).toBeNull();
    });

    it('should leave the active flag unchanged when a different flag is deleted', () => {
      const { repo } = createRepository([
        makeFlag({ id: 1 }),
        makeFlag({ id: 2 }),
      ]);
      repo.setActive(1);

      repo.deleteFlag(2);

      let active: FlagDefinition | null = null;
      repo.activeFlag$.subscribe((f) => (active = f));
      expect(active).toMatchObject({ id: 1 });
    });
  });

  describe('addFlag', () => {
    it('should append a new flag', () => {
      const { repo } = createRepository([makeFlag({ id: 1 })]);
      repo.addFlag(makeFlag({ id: 2, label: 'new' }));
      expect(repo.getFlags().map((f) => f.id)).toEqual([1, 2]);
    });

    it('should replace an existing flag with the same id', () => {
      const { repo } = createRepository([makeFlag({ id: 1, label: 'old' })]);
      repo.addFlag(makeFlag({ id: 1, label: 'updated' }));
      expect(repo.getFlags()).toEqual([makeFlag({ id: 1, label: 'updated' })]);
    });
  });

  describe('setActive', () => {
    it('should set the active flag matching the given id', () => {
      const { repo } = createRepository([makeFlag({ id: 1 }), makeFlag({ id: 2 })]);
      repo.setActive(2);
      let active: FlagDefinition | null = null;
      repo.activeFlag$.subscribe((f) => (active = f));
      expect(active).toMatchObject({ id: 2 });
    });

    it('should set the active flag to null when the id is not found', () => {
      const { repo } = createRepository([makeFlag({ id: 1 })]);
      repo.setActive(99);
      let active: FlagDefinition | null = makeFlag();
      repo.activeFlag$.subscribe((f) => (active = f));
      expect(active).toBeNull();
    });

    it('should set the active flag to null when given null', () => {
      const { repo } = createRepository([makeFlag({ id: 1 })]);
      repo.setActive(1);
      repo.setActive(null);
      let active: FlagDefinition | null = makeFlag();
      repo.activeFlag$.subscribe((f) => (active = f));
      expect(active).toBeNull();
    });
  });
});
