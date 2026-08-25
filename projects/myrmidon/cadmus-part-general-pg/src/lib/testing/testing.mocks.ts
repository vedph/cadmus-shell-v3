import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

/**
 * Reusable Vitest test doubles for this library's "feature" wrapper
 * components (EditPartFeatureBase / EditFragmentFeatureBase subclasses).
 * Not part of the public API - import via relative path from specs only.
 */

export function mockAuthJwtService() {
  return {
    currentUser$: new Subject<any>(),
    currentUserValue: null,
  };
}

export function mockAppRepository(
  overrides?: Partial<{
    getTypeThesaurus: any;
    getSettingFor: any;
  }>,
) {
  return {
    getTypeThesaurus: vi.fn().mockReturnValue(undefined),
    getSettingFor: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Mock for @myrmidon/cadmus-item-editor's EditedItemRepository.
 * Only `item$` is consumed by CurrentItemBarComponent, which every feature
 * wrapper renders.
 */
export function mockEditedItemRepository() {
  return {
    item$: new Subject<any>(),
    facet$: new Subject<any>(),
  };
}

/**
 * Mock for @myrmidon/cadmus-state's PartEditorService, matching the shape
 * EditPartFeatureBase depends on (loading$/saving$ + load()/save()).
 */
export function mockPartEditorService(loadResult: any = undefined) {
  return {
    loading$: new Subject<boolean>(),
    saving$: new Subject<boolean>(),
    load: vi.fn().mockResolvedValue(loadResult),
    save: vi.fn().mockResolvedValue({ id: 'part1' }),
  };
}

/**
 * Mock for @myrmidon/cadmus-state's FragmentEditorService, matching the
 * shape EditFragmentFeatureBase depends on.
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
 * Builds an ActivatedRoute mock matching the shape EditPartFeatureBase's
 * constructor reads: snapshot.params.iid/pid, snapshot.queryParams.rid,
 * and snapshot.routeConfig.path (as "<partTypeId>/:pid", matching this
 * library's route table in cadmus-part-general-pg.routes.ts).
 */
export function mockPartRoute(overrides?: {
  typeId?: string;
  iid?: string;
  pid?: string;
  rid?: string;
}): ActivatedRoute {
  return {
    snapshot: {
      params: {
        iid: overrides?.iid ?? 'item1',
        pid: overrides?.pid ?? 'part1',
      },
      queryParams: overrides?.rid ? { rid: overrides.rid } : {},
      routeConfig: { path: `${overrides?.typeId ?? 'it.vedph.test'}/:pid` },
    },
  } as unknown as ActivatedRoute;
}

/**
 * Builds an ActivatedRoute mock matching the shape
 * EditFragmentFeatureBase's constructor reads: snapshot.params.iid/pid/loc,
 * snapshot.url[2].path (the fragment type ID segment), and
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

/**
 * Mock for @myrmidon/cadmus-api's ItemService. EditPartFeatureBase's
 * constructor always requires an ItemService instance (forwarded to it by
 * every part-feature subclass), even though the base class itself never
 * calls it directly (PartEditorService is mocked separately and does the
 * real loading/saving). Some wrapped editors (e.g. HistoricalEventsPart's
 * RelatedEntityComponent -> LookupPinComponent) inject the SAME ItemService
 * singleton to call searchPins, so it is stubbed here too.
 */
export function mockItemService() {
  return {
    searchPins: vi.fn().mockReturnValue(new Subject()),
  };
}

/**
 * Mock for @myrmidon/cadmus-api's ThesaurusService. Like ItemService, this
 * is always a required constructor dependency of every part-feature
 * subclass, but unused directly since PartEditorService is mocked as a
 * whole (it is the only thing that would normally call ThesaurusService).
 */
export function mockThesaurusService() {
  return {};
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
