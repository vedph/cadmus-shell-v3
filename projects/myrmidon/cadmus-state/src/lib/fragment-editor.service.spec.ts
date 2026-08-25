import { of, throwError } from 'rxjs';

import { FragmentEditorService } from './fragment-editor.service';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { FragmentIdentity, Part, TextLayerPart } from '@myrmidon/cadmus-core';

function makeLayerPart(overrides?: Partial<TextLayerPart>): TextLayerPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.token-text-layer',
    roleId: 'fr.it.vedph.comment',
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    fragments: [{ location: '1.1', baseText: 'alpha' }],
    ...overrides,
  };
}

function createService(): {
  service: FragmentEditorService;
  itemService: {
    getPart: ReturnType<typeof vi.fn>;
    getBaseTextPart: ReturnType<typeof vi.fn>;
    addPart: ReturnType<typeof vi.fn>;
  };
  thesaurusService: {
    getThesauriSet: ReturnType<typeof vi.fn>;
    getScopedId: ReturnType<typeof vi.fn>;
  };
} {
  const itemService = {
    getPart: vi.fn().mockReturnValue(of(makeLayerPart())),
    getBaseTextPart: vi
      .fn()
      .mockReturnValue(of({ part: { id: 'bt1' }, text: 'alpha beta' })),
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
  const service = new FragmentEditorService(
    itemService as unknown as ItemService,
    thesaurusService as unknown as ThesaurusService
  );
  return { service, itemService, thesaurusService };
}

const identity: FragmentIdentity = {
  itemId: 'item1',
  typeId: '',
  partId: 'part1',
  roleId: 'fr.it.vedph.comment',
  frTypeId: 'fr.it.vedph.comment',
  frRoleId: null,
  loc: '1.1',
};

describe('FragmentEditorService', () => {
  it('should be created', () => {
    const { service } = createService();
    expect(service).toBeTruthy();
  });

  describe('load without thesauri', () => {
    it('should load the layer part, base text and the matching fragment', async () => {
      const { service } = createService();
      const result = await service.load(identity);
      expect(result?.value).toEqual({ location: '1.1', baseText: 'alpha' });
      expect(result?.baseText).toBe('alpha beta');
      expect(result?.thesauri).toEqual({});
    });

    it('should return a blank fragment stub when the location has no existing fragment', async () => {
      const { service } = createService();
      const result = await service.load({ ...identity, loc: '2.1' });
      expect(result?.value).toEqual({ location: '2.1' });
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
        message: 'Error loading layer part part1',
      });
    });
  });

  describe('load with thesauri', () => {
    it('should load part, base text and thesauri, and toggle loading$', async () => {
      const { service, thesaurusService } = createService();
      thesaurusService.getThesauriSet.mockReturnValue(
        of({ 'cat@en': { id: 'cat@en', entries: [] } })
      );
      const history: boolean[] = [];
      service.loading$.subscribe((v) => history.push(v));

      const result = await service.load(identity, ['cat@en']);

      expect(result?.value).toEqual({ location: '1.1', baseText: 'alpha' });
      expect(result?.baseText).toBe('alpha beta');
      expect(result?.thesauri).toEqual({
        'cat@en': { id: 'cat@en', entries: [] },
      });
      // regression test: loading$ must actually toggle true then false,
      // it previously stayed at its initial value throughout this path
      expect(history).toEqual([false, true, false]);
    });

    it('should reload thesauri scoped to the part when it has a thesaurusScope', async () => {
      const { service, itemService, thesaurusService } = createService();
      itemService.getPart.mockReturnValue(
        of(makeLayerPart({ thesaurusScope: 'myscope' }))
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
      const saved = makeLayerPart() as unknown as Part;
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
      await expect(
        service.save(makeLayerPart() as unknown as Part)
      ).rejects.toMatchObject({
        message: 'Error saving part part1',
      });
    });
  });
});
