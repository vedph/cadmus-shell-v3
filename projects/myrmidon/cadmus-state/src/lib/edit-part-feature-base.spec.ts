import { Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase } from './edit-part-feature-base';
import { PartEditorService } from './part-editor.service';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { EditedObject, Part } from '@myrmidon/cadmus-core';

class TestPartFeature extends EditPartFeatureBase {
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
  rid?: string;
  path?: string;
}): ActivatedRoute {
  return {
    snapshot: {
      params: { iid: overrides?.iid ?? 'item1', pid: overrides?.pid ?? 'part1' },
      routeConfig: { path: overrides?.path ?? 'it.vedph.note/:pid' },
      queryParams: overrides?.rid ? { rid: overrides.rid } : {},
    },
  } as unknown as ActivatedRoute;
}

function createFeature(routeOverrides?: Parameters<typeof makeRoute>[0]): {
  feature: TestPartFeature;
  router: { navigate: ReturnType<typeof vi.fn> };
  snackbar: { open: ReturnType<typeof vi.fn> };
  editorService: {
    loading$: Subject<boolean>;
    saving$: Subject<boolean>;
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
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
  const feature = new TestPartFeature(
    router as unknown as Router,
    makeRoute(routeOverrides),
    snackbar as unknown as MatSnackBar,
    {} as unknown as ItemService,
    {} as unknown as ThesaurusService,
    editorService as unknown as PartEditorService
  );
  return { feature, router, snackbar, editorService };
}

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

describe('EditPartFeatureBase', () => {
  describe('constructor identity parsing', () => {
    it('should build identity from the route snapshot', () => {
      const { feature } = createFeature();
      expect(feature.identity()).toEqual({
        itemId: 'item1',
        typeId: 'it.vedph.note',
        partId: 'part1',
        // no "rid" query param at all leaves roleId undefined (only the
        // literal "default" value gets normalized to null)
        roleId: undefined,
      });
    });

    it('should treat a "new" part ID as null', () => {
      const { feature } = createFeature({ pid: 'new' });
      expect(feature.identity().partId).toBeNull();
    });

    it('should treat a "default" role ID as null', () => {
      const { feature } = createFeature({ rid: 'default' });
      expect(feature.identity().roleId).toBeNull();
    });

    it('should keep a real role ID as-is', () => {
      const { feature } = createFeature({ rid: 'scholarly' });
      expect(feature.identity().roleId).toBe('scholarly');
    });

    it('should extract typeId as the segment before the first slash in the route path', () => {
      const { feature } = createFeature({ path: 'it.vedph.token-text/:pid' });
      expect(feature.identity().typeId).toBe('it.vedph.token-text');
    });
  });

  describe('loading$/saving$ subscriptions', () => {
    it('should mirror the editor service loading$ into the loading signal', () => {
      const { feature, editorService } = createFeature();
      editorService.loading$.next(true);
      expect(feature.loading()).toBe(true);
      editorService.loading$.next(false);
      expect(feature.loading()).toBe(false);
    });

    it('should mirror the editor service saving$ into the saving signal', () => {
      const { feature, editorService } = createFeature();
      editorService.saving$.next(true);
      expect(feature.saving()).toBe(true);
    });

    it('should stop mirroring after ngOnDestroy', () => {
      const { feature, editorService } = createFeature();
      feature.ngOnDestroy();
      editorService.loading$.next(true);
      expect(feature.loading()).toBeUndefined();
    });
  });

  describe('ngOnInit', () => {
    it('should load data and call onDataLoaded on success', async () => {
      const { feature, editorService } = createFeature();
      const data: EditedObject<Part> = { value: makePart(), thesauri: {} };
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
      expect(feature.data()).toBeUndefined();
    });

    it('should not call onDataLoaded when the resolved data is falsy', async () => {
      const { feature, editorService } = createFeature();
      editorService.load.mockResolvedValue(null);

      feature.ngOnInit();
      await Promise.resolve();
      await Promise.resolve();

      expect(feature.onDataLoadedCalls).toBe(0);
    });

    it('should suffix thesauri IDs with the role ID when roleIdInThesauri is enabled', async () => {
      const { feature, editorService } = createFeature({ rid: 'scholarly' });
      (feature as any).roleIdInThesauri = true;
      feature.reqThesauriIds = ['categories@en'];
      editorService.load.mockResolvedValue({
        value: makePart(),
        thesauri: { 'categories_scholarly@en': { id: 'x', entries: [] } },
      });

      feature.ngOnInit();
      await Promise.resolve();
      await Promise.resolve();

      expect(editorService.load).toHaveBeenCalledWith(feature.identity(), [
        'categories_scholarly@en',
      ]);
      // an unsuffixed alias should be added pointing to the same thesaurus
      expect(feature.data()!.thesauri['categories@en']).toEqual(
        feature.data()!.thesauri['categories_scholarly@en']
      );
    });

    it('should not suffix thesauri IDs when roleIdInThesauri is disabled', async () => {
      const { feature, editorService } = createFeature({ rid: 'scholarly' });
      feature.reqThesauriIds = ['categories@en'];
      editorService.load.mockResolvedValue({
        value: makePart(),
        thesauri: {},
      });

      feature.ngOnInit();
      await Promise.resolve();
      await Promise.resolve();

      expect(editorService.load).toHaveBeenCalledWith(feature.identity(), [
        'categories@en',
      ]);
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
      expect(feature.dirty()).toBe(true);
      expect(feature.canDeactivate()).toBe(false);
    });
  });

  describe('save', () => {
    it('should update the identity part ID when it was null and show a success snackbar', async () => {
      const { feature, editorService, snackbar } = createFeature({ pid: 'new' });
      const saved = makePart({ id: 'newly-created' });
      editorService.save.mockResolvedValue(saved);
      expect(feature.identity().partId).toBeNull();

      feature.save(saved);
      await Promise.resolve();
      await Promise.resolve();

      expect(feature.identity().partId).toBe('newly-created');
      expect(snackbar.open).toHaveBeenCalledWith(
        'Part saved',
        'OK',
        expect.objectContaining({ duration: 3000 })
      );
    });

    it('should not overwrite an existing part ID after saving', async () => {
      const { feature, editorService } = createFeature();
      const saved = makePart({ id: 'a-different-id' });
      editorService.save.mockResolvedValue(saved);

      feature.save(saved);
      await Promise.resolve();
      await Promise.resolve();

      expect(feature.identity().partId).toBe('part1');
    });

    it('should set dirty and show an error snackbar on failure', async () => {
      const { feature, editorService, snackbar } = createFeature();
      editorService.save.mockRejectedValue(new Error('save failed'));

      feature.save(makePart());
      await Promise.resolve();
      await Promise.resolve();

      expect(feature.dirty()).toBe(true);
      expect(snackbar.open).toHaveBeenCalledWith('save failed', 'OK');
    });
  });

  describe('close', () => {
    it('should navigate to the item route', () => {
      const { feature, router } = createFeature();
      feature.close();
      expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
    });
  });
});
