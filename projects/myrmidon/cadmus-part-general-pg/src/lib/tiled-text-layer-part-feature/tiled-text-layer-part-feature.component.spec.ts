import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';

import {
  TILED_TEXT_PART_TYPEID,
  TextTileRow,
  TiledTextPart,
} from '@myrmidon/cadmus-part-general-ui';
import { TokenLocation, LayerHint } from '@myrmidon/cadmus-core';
import { EditedLayerRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { UserLevelService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';
import { FacetService } from '@myrmidon/cadmus-api';

import { TiledTextLayerPartFeatureComponent } from './tiled-text-layer-part-feature.component';

function makeRow(y: number, xs: number[]): TextTileRow {
  return {
    y,
    tiles: xs.map((x) => ({ x, data: { text: `c${y}-${x}` } })),
  };
}

describe('TiledTextLayerPartFeatureComponent', () => {
  let component: TiledTextLayerPartFeatureComponent;
  let fixture: ComponentFixture<TiledTextLayerPartFeatureComponent>;
  let repository: {
    loading$: Subject<boolean>;
    saving$: Subject<boolean>;
    part$: Subject<any>;
    baseText$: Subject<string | undefined>;
    locations$: Subject<TokenLocation[]>;
    breakChance$: Subject<number>;
    layerHints$: Subject<LayerHint[]>;
    baseTextPart$: Subject<TiledTextPart | undefined>;
    reset: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    getPart: ReturnType<typeof vi.fn>;
    getLocations: ReturnType<typeof vi.fn>;
    deleteFragment: ReturnType<typeof vi.fn>;
    applyLayerPatches: ReturnType<typeof vi.fn>;
    refreshBreakChance: ReturnType<typeof vi.fn>;
  };
  let editedItemRepository: {
    ensureItemLoaded: ReturnType<typeof vi.fn>;
    getFacet: ReturnType<typeof vi.fn>;
    facet$: Subject<any>;
    item$: Subject<any>;
  };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let libraryRouteService: {
    buildFragmentEditorRoute: ReturnType<typeof vi.fn>;
    getEditorKeyFromPartType: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  function makeRoute(overrides?: { pid?: string; rid?: string }): ActivatedRoute {
    return {
      snapshot: {
        params: { iid: 'item1', pid: overrides?.pid ?? 'part1' },
        queryParams: overrides?.rid ? { rid: overrides.rid } : {},
      },
    } as unknown as ActivatedRoute;
  }

  async function configure(overrides?: { pid?: string; rid?: string }) {
    TestBed.resetTestingModule();
    repository = {
      loading$: new Subject<boolean>(),
      saving$: new Subject<boolean>(),
      part$: new Subject<any>(),
      baseText$: new Subject<string | undefined>(),
      locations$: new Subject<TokenLocation[]>(),
      breakChance$: new Subject<number>(),
      layerHints$: new Subject<LayerHint[]>(),
      baseTextPart$: new Subject<TiledTextPart | undefined>(),
      reset: vi.fn(),
      load: vi.fn(),
      getPart: vi.fn(),
      getLocations: vi.fn().mockReturnValue([]),
      deleteFragment: vi.fn(),
      applyLayerPatches: vi.fn(),
      refreshBreakChance: vi.fn(),
    };
    editedItemRepository = {
      ensureItemLoaded: vi.fn(),
      getFacet: vi.fn().mockReturnValue({ partDefinitions: [] }),
      facet$: new Subject<any>(),
      item$: new Subject<any>(),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    libraryRouteService = {
      buildFragmentEditorRoute: vi
        .fn()
        .mockReturnValue({ route: '/items/item1/general/fragment/part1/fr.x/1.1' }),
      getEditorKeyFromPartType: vi.fn().mockReturnValue({ partKey: 'general' }),
    };
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TiledTextLayerPartFeatureComponent],
      providers: [
        { provide: ActivatedRoute, useValue: makeRoute(overrides) },
        { provide: Router, useValue: router },
        { provide: EditedLayerRepository, useValue: repository },
        { provide: LibraryRouteService, useValue: libraryRouteService },
        { provide: EditedItemRepository, useValue: editedItemRepository },
        { provide: DialogService, useValue: dialogService },
        {
          provide: UserLevelService,
          useValue: { getCurrentUserLevel: vi.fn().mockReturnValue(2) },
        },
        { provide: AppRepository, useValue: { getFacets: vi.fn().mockReturnValue([]) } },
        { provide: FacetService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TiledTextLayerPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse itemId/partId/roleId from the route', async () => {
    await configure({ pid: 'part9', rid: 'scholarly' });
    expect(component.itemId).toBe('item1');
    expect(component.partId).toBe('part9');
    expect(component.roleId).toBe('scholarly');
  });

  it('should treat pid "new" as no partId and rid "default" as no roleId', async () => {
    await configure({ pid: 'new', rid: 'default' });
    expect(component.partId).toBeUndefined();
    expect(component.roleId).toBeUndefined();
  });

  it('canDeactivate should always be true', () => {
    expect(component.canDeactivate()).toBe(true);
  });

  it('ngOnInit should ensure the item is loaded and reset+load the layer part', () => {
    expect(editedItemRepository.ensureItemLoaded).toHaveBeenCalledWith('item1');
    expect(repository.reset).toHaveBeenCalled();
    expect(repository.load).toHaveBeenCalledWith('item1', 'part1');
  });

  it('ngOnInit should not call load() when there is no partId (new part)', async () => {
    await configure({ pid: 'new' });
    expect(repository.load).not.toHaveBeenCalled();
  });

  it('should build a view from rows$ and apply fragment locations', () => {
    const loc = TokenLocation.parse('1.1')!;
    repository.getLocations = vi.fn().mockReturnValue([loc]);
    repository.baseTextPart$.next({ rows: [makeRow(1, [1])] } as TiledTextPart);

    expect(component.view()).toBeTruthy();
    expect(component.view()!.rows[0].tiles[0].frIndex).toBe(0);
  });

  it('should clear the view when rows$ emits an undefined base text part', () => {
    repository.baseTextPart$.next({ rows: [makeRow(1, [1])] } as TiledTextPart);
    expect(component.view()).toBeTruthy();

    repository.baseTextPart$.next(undefined);
    expect(component.view()).toBeUndefined();
  });

  it('onTileChecked should delegate to the view', () => {
    repository.baseTextPart$.next({ rows: [makeRow(1, [1]), makeRow(2, [1, 2])] } as TiledTextPart);

    component.onTileChecked(1, 1, true);

    expect(component.view()!.rows[0].tiles[0].checked).toBe(true);
  });

  it('selectNextTile should move to the next tile', () => {
    repository.baseTextPart$.next({ rows: [makeRow(1, [1]), makeRow(2, [1, 2])] } as TiledTextPart);
    component.selectedTile = component.view()!.rows[0].tiles[0];

    component.selectNextTile();

    expect(component.selectedTile).toBe(component.view()!.rows[1].tiles[0]);
  });

  it('selectPrevTile should move to the previous tile', () => {
    repository.baseTextPart$.next({ rows: [makeRow(1, [1]), makeRow(2, [1, 2])] } as TiledTextPart);
    component.selectedTile = component.view()!.rows[1].tiles[0];

    component.selectPrevTile();

    expect(component.selectedTile).toBe(component.view()!.rows[0].tiles[0]);
  });

  it('clearTileChecks should uncheck all tiles and clear the picked location', () => {
    repository.baseTextPart$.next({ rows: [makeRow(1, [1])] } as TiledTextPart);
    component.view()!.setAllTilesViewState({ checked: true });
    component.pickedLocation = '1.1';

    component.clearTileChecks();

    expect(component.view()!.rows[0].tiles[0].checked).toBe(false);
    expect(component.pickedLocation).toBeUndefined();
  });

  it('applyLayerPatches should delegate to the repository when a partId is set', () => {
    component.applyLayerPatches(['mov 1.1 1.2']);
    expect(repository.applyLayerPatches).toHaveBeenCalledWith('part1', ['mov 1.1 1.2']);
  });

  it('applyLayerPatches should do nothing without a partId', async () => {
    await configure({ pid: 'new' });
    component.applyLayerPatches(['mov 1.1 1.2']);
    expect(repository.applyLayerPatches).not.toHaveBeenCalled();
  });

  it('deleteFragmentFromHint should delegate to the repository with the parsed location', () => {
    component.deleteFragmentFromHint({ location: '2.2' } as LayerHint);
    expect(repository.deleteFragment).toHaveBeenCalledWith(TokenLocation.parse('2.2'));
  });

  it('close should navigate to the item', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['/items', 'item1']);
  });

  describe('deleteFragment', () => {
    it('should do nothing when no tile is checked', () => {
      repository.baseTextPart$.next({ rows: [makeRow(1, [1])] } as TiledTextPart);
      component.deleteFragment();
      expect(dialogService.confirm).not.toHaveBeenCalled();
    });

    it('should confirm and delete the fragment covering the checked location', () => {
      // a lone checked tile with nothing after it leaves
      // getCheckedLocation() unable to find its end boundary, so use a
      // 2-row fixture with an unchecked tile following the checked one
      const loc = TokenLocation.parse('1.1')!;
      repository.getLocations = vi.fn().mockReturnValue([loc]);
      repository.getPart = vi
        .fn()
        .mockReturnValue({ fragments: [{ location: '1.1' }] });
      repository.baseTextPart$.next({
        rows: [makeRow(1, [1]), makeRow(2, [1, 2])],
      } as TiledTextPart);
      component.view()!.linearSetCheck(1, 1, 1, 1, true);

      component.deleteFragment();

      expect(dialogService.confirm).toHaveBeenCalled();
      expect(repository.deleteFragment).toHaveBeenCalledWith(loc);
    });
  });

  describe('editFragment / addFragment', () => {
    it('editFragment should navigate to the fragment editor for a checked existing fragment', () => {
      const loc = TokenLocation.parse('1.1')!;
      repository.getLocations = vi.fn().mockReturnValue([loc]);
      repository.getPart = vi.fn().mockReturnValue({
        itemId: 'item1',
        id: 'part1',
        typeId: TILED_TEXT_PART_TYPEID,
        roleId: undefined,
      });
      repository.baseTextPart$.next({
        rows: [makeRow(1, [1]), makeRow(2, [1, 2])],
      } as TiledTextPart);
      component.view()!.linearSetCheck(1, 1, 1, 1, true);

      component.editFragment();

      expect(libraryRouteService.buildFragmentEditorRoute).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalled();
    });

    it('addFragment should do nothing when the checked location already has a fragment', () => {
      const loc = TokenLocation.parse('1.1')!;
      repository.getLocations = vi.fn().mockReturnValue([loc]);
      repository.getPart = vi.fn().mockReturnValue({
        itemId: 'item1',
        id: 'part1',
        typeId: TILED_TEXT_PART_TYPEID,
        roleId: undefined,
      });
      repository.baseTextPart$.next({
        rows: [makeRow(1, [1]), makeRow(2, [1, 2])],
      } as TiledTextPart);
      component.view()!.linearSetCheck(1, 1, 1, 1, true);

      component.addFragment();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
