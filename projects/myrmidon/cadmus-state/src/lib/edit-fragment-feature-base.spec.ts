import { Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditFragmentFeatureBase } from './edit-fragment-feature-base';
import { FragmentEditorService } from './fragment-editor.service';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import {
  EditedObject,
  Fragment,
  Part,
  TextLayerPart,
} from '@myrmidon/cadmus-core';

class TestFragmentFeature extends EditFragmentFeatureBase {
  public onDataLoadedCalls = 0;
  public reqThesauriIds: string[] = [];

  protected override getReqThesauriIds(): string[] {
    return this.reqThesauriIds;
  }

  protected override onDataLoaded(): void {
    this.onDataLoadedCalls++;
  }
}

function makeRoute(overrides?: {
  iid?: string;
  pid?: string;
  loc?: string;
  frrid?: string;
  frTypeSegment?: string;
}): ActivatedRoute {
  return {
    snapshot: {
      params: {
        iid: overrides?.iid ?? 'item1',
        pid: overrides?.pid ?? 'part1',
        loc: overrides?.loc ?? '1.1',
      },
      url: [
        { path: 'x' },
        { path: 'fragment' },
        { path: overrides?.frTypeSegment ?? 'fr.it.vedph.comment' },
      ],
      queryParams: overrides?.frrid ? { frrid: overrides.frrid } : {},
    },
  } as unknown as ActivatedRoute;
}

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

function createFeature(routeOverrides?: Parameters<typeof makeRoute>[0]): {
  feature: TestFragmentFeature;
  router: { navigate: ReturnType<typeof vi.fn> };
  snackbar: { open: ReturnType<typeof vi.fn> };
  editorService: {
    loading$: Subject<boolean>;
    saving$: Subject<boolean>;
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  libraryRouteService: {
    getEditorKeyFromPartType: ReturnType<typeof vi.fn>;
  };
} {
  const router = { navigate: vi.fn() };
  const snackbar = { open: vi.fn() };
  const editorService = {
    loading$: new Subject<boolean>(),
    saving$: new Subject<boolean>(),
    load: vi.fn(),
    save: vi.fn(),
  };
  const libraryRouteService = {
    getEditorKeyFromPartType: vi
      .fn()
      .mockReturnValue({ partKey: 'general', frKey: 'comment-fragment' }),
  };
  const feature = new TestFragmentFeature(
    router as unknown as Router,
    makeRoute(routeOverrides),
    snackbar as unknown as MatSnackBar,
    editorService as unknown as FragmentEditorService,
    libraryRouteService as unknown as LibraryRouteService
  );
  return { feature, router, snackbar, editorService, libraryRouteService };
}

describe('EditFragmentFeatureBase', () => {
  describe('constructor identity parsing', () => {
    it('should build identity from the route snapshot', () => {
      const { feature } = createFeature();
      expect(feature.identity()).toEqual({
        itemId: 'item1',
        typeId: '',
        partId: 'part1',
        roleId: 'fr.it.vedph.comment',
        frTypeId: 'fr.it.vedph.comment',
        frRoleId: undefined,
        loc: '1.1',
      });
    });

    it('should read the fragment role ID from the "frrid" query param', () => {
      const { feature } = createFeature({ frrid: 'alt' });
      expect(feature.identity().frRoleId).toBe('alt');
    });

    it('should read the fragment type ID from the 3rd URL segment', () => {
      const { feature } = createFeature({
        frTypeSegment: 'fr.it.vedph.orthography',
      });
      expect(feature.identity().frTypeId).toBe('fr.it.vedph.orthography');
      expect(feature.identity().roleId).toBe('fr.it.vedph.orthography');
    });
  });

  describe('loading$/saving$ subscriptions', () => {
    it('should mirror the editor service loading$ into the loading signal', () => {
      const { feature, editorService } = createFeature();
      editorService.loading$.next(true);
      expect(feature.loading()).toBe(true);
    });

    it('should stop mirroring after ngOnDestroy', () => {
      const { feature, editorService } = createFeature();
      feature.ngOnDestroy();
      editorService.saving$.next(true);
      expect(feature.saving()).toBeUndefined();
    });
  });

  describe('ngOnInit', () => {
    it('should parse frLoc from the identity location', () => {
      const { feature, editorService } = createFeature();
      editorService.load.mockResolvedValue(null);
      feature.ngOnInit();
      expect(feature.frLoc()!.toString()).toBe('1.1');
    });

    it('should load data and call onDataLoaded on success', async () => {
      const { feature, editorService } = createFeature();
      const data: EditedObject<Fragment> = {
        value: { location: '1.1', baseText: 'alpha' },
        thesauri: {},
        layerPart: makeLayerPart(),
        baseText: 'alpha beta',
      };
      editorService.load.mockResolvedValue(data);

      feature.ngOnInit();
      expect(feature.loading()).toBe(true);
      await Promise.resolve();
      await Promise.resolve();

      expect(editorService.load).toHaveBeenCalledWith(feature.identity(), []);
      expect(feature.data()).toEqual(data);
      expect(feature.onDataLoadedCalls).toBe(1);
    });

    it('should show a snackbar with the error message on failure', async () => {
      const { feature, editorService, snackbar } = createFeature();
      editorService.load.mockRejectedValue(new Error('load failed'));

      feature.ngOnInit();
      await Promise.resolve();
      await Promise.resolve();

      expect(snackbar.open).toHaveBeenCalledWith('load failed', 'OK');
    });
  });

  describe('canDeactivate / onDirtyChange', () => {
    it('should allow deactivation when not dirty', () => {
      const { feature } = createFeature();
      expect(feature.canDeactivate()).toBe(true);
    });

    it('should block deactivation when dirty', () => {
      const { feature } = createFeature();
      feature.onDirtyChange(true);
      expect(feature.canDeactivate()).toBe(false);
    });
  });

  describe('save', () => {
    async function loadFeature(
      layerPart: TextLayerPart
    ): Promise<ReturnType<typeof createFeature>> {
      const ctx = createFeature();
      ctx.editorService.load.mockResolvedValue({
        value: { location: '1.1', baseText: 'alpha' },
        thesauri: {},
        layerPart,
        baseText: 'alpha beta',
      });
      ctx.feature.ngOnInit();
      await Promise.resolve();
      await Promise.resolve();
      return ctx;
    }

    it('should replace an existing fragment at the same location', async () => {
      const layerPart = makeLayerPart({
        fragments: [
          { location: '1.1', baseText: 'old' },
          { location: '1.5', baseText: 'other' },
        ],
      });
      const { feature, editorService } = await loadFeature(layerPart);
      editorService.save.mockResolvedValue(layerPart as unknown as Part);

      feature.save({ location: '1.1', baseText: 'new' });
      await Promise.resolve();
      await Promise.resolve();

      const savedPart = editorService.save.mock.calls[0][0] as TextLayerPart;
      expect(savedPart.fragments).toEqual([
        { location: '1.1', baseText: 'new' },
        { location: '1.5', baseText: 'other' },
      ]);
    });

    it('should not mutate the fragments array still held by the data signal', async () => {
      const originalFragments = [{ location: '1.1', baseText: 'old' }];
      const layerPart = makeLayerPart({ fragments: originalFragments });
      const { feature, editorService } = await loadFeature(layerPart);
      editorService.save.mockResolvedValue(layerPart as unknown as Part);

      feature.save({ location: '1.1', baseText: 'new' });
      await Promise.resolve();
      await Promise.resolve();

      // the array referenced by the (still current) data signal must be
      // untouched: save() must work on a deep copy, not mutate shared state
      expect(originalFragments).toEqual([{ location: '1.1', baseText: 'old' }]);
      expect(feature.data()!.layerPart!.fragments).toBe(originalFragments);
    });

    it('should append when no fragment sits at the identity loc being edited', async () => {
      // save() replaces the fragment whose location matches the route's
      // identity().loc (the one this editor session started on), not the
      // new fragment's own location - so with no fragment at that loc, the
      // new one is appended instead of replacing something else.
      const layerPart = makeLayerPart({
        fragments: [{ location: '9.9', baseText: 'unrelated' }],
      });
      const { feature, editorService } = await loadFeature(layerPart);
      editorService.save.mockResolvedValue(layerPart as unknown as Part);

      feature.save({ location: '2.1', baseText: 'new' });
      await Promise.resolve();
      await Promise.resolve();

      const savedPart = editorService.save.mock.calls[0][0] as TextLayerPart;
      expect(savedPart.fragments).toEqual([
        { location: '9.9', baseText: 'unrelated' },
        { location: '2.1', baseText: 'new' },
      ]);
    });

    it('should show a success snackbar on save', async () => {
      const layerPart = makeLayerPart();
      const { feature, editorService, snackbar } = await loadFeature(layerPart);
      editorService.save.mockResolvedValue(layerPart as unknown as Part);

      feature.save({ location: '1.1', baseText: 'new' });
      await Promise.resolve();
      await Promise.resolve();

      expect(snackbar.open).toHaveBeenCalledWith(
        'Fragment saved',
        'OK',
        expect.objectContaining({ duration: 3000 })
      );
    });

    it('should set dirty and show an error snackbar on failure', async () => {
      const layerPart = makeLayerPart();
      const { feature, editorService, snackbar } = await loadFeature(layerPart);
      editorService.save.mockRejectedValue(new Error('save failed'));

      feature.save({ location: '1.1', baseText: 'new' });
      await Promise.resolve();
      await Promise.resolve();

      expect(feature.dirty()).toBe(true);
      expect(snackbar.open).toHaveBeenCalledWith('Error saving fragment', 'OK');
    });
  });

  describe('close', () => {
    it('should navigate to the part editor route using the resolved editor key', async () => {
      const layerPart = makeLayerPart();
      const { feature, router, libraryRouteService } = await (async () => {
        const ctx = createFeature();
        ctx.editorService.load.mockResolvedValue({
          value: { location: '1.1', baseText: 'alpha' },
          thesauri: {},
          layerPart,
          baseText: 'alpha beta',
        });
        ctx.feature.ngOnInit();
        await Promise.resolve();
        await Promise.resolve();
        return ctx;
      })();

      feature.close();

      expect(libraryRouteService.getEditorKeyFromPartType).toHaveBeenCalledWith(
        layerPart.typeId,
        layerPart.roleId
      );
      expect(router.navigate).toHaveBeenCalledWith(
        ['/items/item1/general/it.vedph.token-text-layer/part1'],
        { queryParams: { rid: 'fr.it.vedph.comment' } }
      );
    });
  });
});
