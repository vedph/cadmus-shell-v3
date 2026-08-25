import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

/**
 * Reusable Vitest test doubles for this library's "feature" wrapper
 * components (EditFragmentFeatureBase subclasses). Not part of the public
 * API - import via relative path from specs only.
 */

export function mockAuthJwtService() {
  return {
    currentUser$: new Subject<any>(),
    currentUserValue: null,
  };
}

export function mockAppRepository(
  overrides?: Partial<{ getTypeThesaurus: any; getSettingFor: any }>,
) {
  return {
    getTypeThesaurus: vi.fn().mockReturnValue(undefined),
    getSettingFor: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Mock for @myrmidon/cadmus-item-editor's EditedItemRepository. Only
 * `item$` is consumed by CurrentItemBarComponent, which every feature
 * wrapper renders.
 */
export function mockEditedItemRepository() {
  return {
    item$: new Subject<any>(),
    facet$: new Subject<any>(),
  };
}

/**
 * Mock for @myrmidon/cadmus-state's FragmentEditorService, matching the
 * shape EditFragmentFeatureBase depends on (loading$/saving$ + load()/save()).
 */
export function mockFragmentEditorService(loadResult: any = undefined) {
  return {
    loading$: new Subject<boolean>(),
    saving$: new Subject<boolean>(),
    load: vi.fn().mockResolvedValue(loadResult),
    save: vi.fn().mockResolvedValue({ id: 'part1' }),
  };
}

/**
 * Builds an ActivatedRoute mock matching the shape
 * EditFragmentFeatureBase's constructor reads: snapshot.params.iid/pid/loc,
 * snapshot.url[2].path (the fragment type id segment), and
 * snapshot.queryParams.frrid.
 */
export function mockFragmentRoute(overrides?: {
  frTypeId?: string;
  iid?: string;
  pid?: string;
  loc?: string;
  frrid?: string;
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
        { path: overrides?.frTypeId ?? 'fr.it.vedph.test' },
      ],
      queryParams: overrides?.frrid ? { frrid: overrides.frrid } : {},
    },
  } as unknown as ActivatedRoute;
}

export function mockSnackBar() {
  return { open: vi.fn() };
}

export function mockRouter() {
  return { navigate: vi.fn() };
}

export function mockLibraryRouteService() {
  return {
    getEditorKeyFromPartType: vi
      .fn()
      .mockReturnValue({ partKey: 'general', fragmentKey: undefined }),
  };
}
