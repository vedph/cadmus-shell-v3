import { of, throwError } from 'rxjs';

import { PartEditorService } from './part-editor.service';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { Part, PartIdentity } from '@myrmidon/cadmus-core';

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.note',
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ...overrides,
  };
}

const defaultPart = makePart();

function createService(): {
  service: PartEditorService;
  itemService: {
    getPart: ReturnType<typeof vi.fn>;
    addPart: ReturnType<typeof vi.fn>;
  };
  thesaurusService: {
    getThesauriSet: ReturnType<typeof vi.fn>;
    getScopedId: ReturnType<typeof vi.fn>;
  };
} {
  const itemService = {
    getPart: vi.fn().mockReturnValue(of(defaultPart)),
    addPart: vi.fn(),
  };
  const thesaurusService = {
    getThesauriSet: vi.fn().mockReturnValue(of({})),
    getScopedId: vi
      .fn()
      .mockImplementation((id: string, scope?: string) =>
        scope ? `${id}.${scope}` : id
      ),
  };
  const service = new PartEditorService(
    itemService as unknown as ItemService,
    thesaurusService as unknown as ThesaurusService
  );
  return { service, itemService, thesaurusService };
}

const identity: PartIdentity = {
  itemId: 'item1',
  typeId: 'it.vedph.note',
  partId: 'part1',
  roleId: null,
};

describe('PartEditorService', () => {
  it('should be created', () => {
    const { service } = createService();
    expect(service).toBeTruthy();
  });

  describe('load without thesauri', () => {
    it('should load the part with an empty thesauri set', async () => {
      const { service, itemService } = createService();
      const result = await service.load(identity);
      expect(itemService.getPart).toHaveBeenCalledWith('part1');
      expect(result).toEqual({ value: defaultPart, thesauri: {} });
    });

    it('should resolve null when the part id is null (new part)', async () => {
      const { service, itemService } = createService();
      itemService.getPart.mockReturnValue(of(null));
      const result = await service.load({ ...identity, partId: null });
      // identity.partId! is a compile-time-only assertion: at runtime a
      // null partId is passed straight through, which is safe because
      // ItemService.getPart() itself treats any falsy id as "not found".
      expect(itemService.getPart).toHaveBeenCalledWith(null);
      expect(result).toBeNull();
    });

    it('should toggle loading$ true then false', async () => {
      const { service } = createService();
      const history: boolean[] = [];
      service.loading$.subscribe((v) => history.push(v));
      await service.load(identity);
      expect(history).toEqual([false, true, false]);
    });

    it('should reject with a descriptive message on error', async () => {
      const { service, itemService } = createService();
      itemService.getPart.mockReturnValue(throwError(() => new Error('boom')));
      await expect(service.load(identity)).rejects.toMatchObject({
        message: 'Error loading part part1',
      });
    });
  });

  describe('load with thesauri', () => {
    it('should load part and thesauri together', async () => {
      const { service, itemService, thesaurusService } = createService();
      thesaurusService.getThesauriSet.mockReturnValue(
        of({ 'cat@en': { id: 'cat@en', entries: [] } })
      );
      const result = await service.load(identity, ['cat@en']);
      expect(itemService.getPart).toHaveBeenCalledWith('part1');
      expect(thesaurusService.getThesauriSet).toHaveBeenCalledWith(['cat@en']);
      expect(result?.thesauri).toEqual({
        'cat@en': { id: 'cat@en', entries: [] },
      });
    });

    it('should reload thesauri scoped to the part when it has a thesaurusScope', async () => {
      const { service, itemService, thesaurusService } = createService();
      itemService.getPart.mockReturnValue(
        of(makePart({ thesaurusScope: 'myscope' }))
      );
      thesaurusService.getThesauriSet
        .mockReturnValueOnce(of({}))
        .mockReturnValueOnce(
          of({ 'cat@en.myscope': { id: 'cat@en.myscope', entries: [] } })
        );

      const result = await service.load(identity, ['cat@en']);

      expect(thesaurusService.getThesauriSet).toHaveBeenCalledTimes(2);
      expect(thesaurusService.getThesauriSet).toHaveBeenLastCalledWith([
        'cat@en.myscope',
      ]);
      expect(result?.thesauri).toEqual({
        'cat@en.myscope': { id: 'cat@en.myscope', entries: [] },
      });
    });

    it('should reject with a descriptive message when loading thesauri fails', async () => {
      const { service, thesaurusService } = createService();
      thesaurusService.getThesauriSet.mockReturnValue(
        throwError(() => new Error('boom'))
      );
      await expect(service.load(identity, ['cat@en'])).rejects.toMatchObject({
        message: 'Error loading thesauri cat@en',
      });
    });
  });

  describe('save', () => {
    it('should save the part and toggle saving$ true then false', async () => {
      const { service, itemService } = createService();
      const saved = makePart();
      itemService.addPart.mockReturnValue(of(saved));
      const history: boolean[] = [];
      service.saving$.subscribe((v) => history.push(v));

      const result = await service.save(saved);

      expect(result).toEqual(saved);
      expect(history).toEqual([false, true, false]);
    });

    it('should reject with a descriptive message on error', async () => {
      const { service, itemService } = createService();
      itemService.addPart.mockReturnValue(throwError(() => new Error('boom')));
      await expect(service.save(makePart())).rejects.toMatchObject({
        message: 'Error saving part part1',
      });
    });
  });
});
