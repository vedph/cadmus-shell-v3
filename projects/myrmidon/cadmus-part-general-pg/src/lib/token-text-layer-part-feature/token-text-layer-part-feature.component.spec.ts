import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';

import { TokenLocation, LayerHint, TextLayerService } from '@myrmidon/cadmus-core';
import { EditedLayerRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { UserLevelService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';

import { TokenTextLayerPartFeatureComponent } from './token-text-layer-part-feature.component';

describe('TokenTextLayerPartFeatureComponent', () => {
  let component: TokenTextLayerPartFeatureComponent;
  let fixture: ComponentFixture<TokenTextLayerPartFeatureComponent>;
  let repository: {
    loading$: Subject<boolean>;
    saving$: Subject<boolean>;
    part$: Subject<any>;
    baseText$: Subject<string | undefined>;
    locations$: Subject<TokenLocation[] | undefined>;
    breakChance$: Subject<number>;
    layerHints$: Subject<LayerHint[]>;
    reset: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    getPart: ReturnType<typeof vi.fn>;
    getBaseText: ReturnType<typeof vi.fn>;
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
  let textLayerService: {
    getSelectedRange: ReturnType<typeof vi.fn>;
    getSelectedLocationForEdit: ReturnType<typeof vi.fn>;
    getSelectedLocationForNew: ReturnType<typeof vi.fn>;
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
      locations$: new Subject<TokenLocation[] | undefined>(),
      breakChance$: new Subject<number>(),
      layerHints$: new Subject<LayerHint[]>(),
      reset: vi.fn(),
      load: vi.fn(),
      getPart: vi.fn(),
      getBaseText: vi.fn().mockReturnValue('some text'),
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
    textLayerService = {
      getSelectedRange: vi.fn(),
      getSelectedLocationForEdit: vi.fn(),
      getSelectedLocationForNew: vi.fn(),
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
      imports: [TokenTextLayerPartFeatureComponent],
      providers: [
        { provide: ActivatedRoute, useValue: makeRoute(overrides) },
        { provide: Router, useValue: router },
        { provide: EditedLayerRepository, useValue: repository },
        { provide: TextLayerService, useValue: textLayerService },
        { provide: LibraryRouteService, useValue: libraryRouteService },
        { provide: EditedItemRepository, useValue: editedItemRepository },
        { provide: DialogService, useValue: dialogService },
        {
          provide: UserLevelService,
          useValue: { getCurrentUserLevel: vi.fn().mockReturnValue(2) },
        },
        { provide: AppRepository, useValue: { getFacets: vi.fn().mockReturnValue([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TokenTextLayerPartFeatureComponent);
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

  describe('text size', () => {
    it('starts at 14', () => {
      expect(component.textSize).toBe(14);
    });

    it('makeLarger increases by 2 up to a max of 24', () => {
      for (let i = 0; i < 10; i++) {
        component.makeLarger();
      }
      expect(component.textSize).toBe(24);
    });

    it('makeSmaller decreases by 2 down to a min of 12', () => {
      for (let i = 0; i < 10; i++) {
        component.makeSmaller();
      }
      expect(component.textSize).toBe(12);
    });
  });

  describe('deleteFragment', () => {
    it('should do nothing when there is no selected range', () => {
      textLayerService.getSelectedRange.mockReturnValue(null);
      component.deleteFragment();
      expect(dialogService.confirm).not.toHaveBeenCalled();
    });

    it('should confirm and delete the fragment overlapping the selected location', () => {
      const loc = TokenLocation.parse('1.1')!;
      textLayerService.getSelectedRange.mockReturnValue({} as any);
      textLayerService.getSelectedLocationForEdit.mockReturnValue(loc);
      repository.getPart.mockReturnValue({ fragments: [{ location: '1.1' }] });

      component.deleteFragment();

      expect(dialogService.confirm).toHaveBeenCalled();
      expect(repository.deleteFragment).toHaveBeenCalledWith(loc);
    });
  });

  it('deleteFragmentFromHint should delegate to the repository with the parsed location', () => {
    component.deleteFragmentFromHint({ location: '2.2' } as LayerHint);
    expect(repository.deleteFragment).toHaveBeenCalledWith(TokenLocation.parse('2.2'));
  });

  it('refreshBreakChance should delegate to the repository', () => {
    component.refreshBreakChance();
    expect(repository.refreshBreakChance).toHaveBeenCalled();
  });

  describe('editFragment / addFragment / pickLocation', () => {
    beforeEach(() => {
      repository.getPart.mockReturnValue({
        itemId: 'item1',
        id: 'part1',
        typeId: 'it.vedph.token-text-layer',
        roleId: undefined,
      });
    });

    it('editFragment should do nothing without a selected range', () => {
      textLayerService.getSelectedRange.mockReturnValue(null);
      component.editFragment();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('editFragment should navigate to the fragment editor for the selected location', () => {
      const loc = TokenLocation.parse('1.1')!;
      textLayerService.getSelectedRange.mockReturnValue({} as any);
      textLayerService.getSelectedLocationForEdit.mockReturnValue(loc);

      component.editFragment();

      expect(libraryRouteService.buildFragmentEditorRoute).toHaveBeenCalledWith(
        [],
        'item1',
        'part1',
        'it.vedph.token-text-layer',
        undefined,
        '1.1',
      );
      expect(router.navigate).toHaveBeenCalled();
    });

    it('addFragment should navigate to the fragment editor for a new location', () => {
      const loc = TokenLocation.parse('2.1')!;
      textLayerService.getSelectedRange.mockReturnValue({} as any);
      textLayerService.getSelectedLocationForNew.mockReturnValue(loc);

      component.addFragment();

      expect(textLayerService.getSelectedLocationForNew).toHaveBeenCalledWith(
        {},
        'some text',
      );
      expect(router.navigate).toHaveBeenCalled();
    });

    it('pickLocation should set pickedLocation from the selected range', () => {
      const loc = TokenLocation.parse('3.1')!;
      textLayerService.getSelectedRange.mockReturnValue({} as any);
      textLayerService.getSelectedLocationForNew.mockReturnValue(loc);

      component.pickLocation();

      expect(component.pickedLocation).toBe('3.1');
    });
  });

  describe('moveFragmentFromHint', () => {
    it('should do nothing without a picked location', () => {
      component.moveFragmentFromHint({ location: '2.1' } as LayerHint);
      expect(repository.applyLayerPatches).not.toHaveBeenCalled();
    });

    it('should do nothing when the picked location equals the hint location', () => {
      component.pickedLocation = '2.1';
      component.moveFragmentFromHint({ location: '2.1' } as LayerHint);
      expect(repository.applyLayerPatches).not.toHaveBeenCalled();
    });

    it('should apply a move patch when a different location is picked', () => {
      component.pickedLocation = '3.1';
      component.moveFragmentFromHint({ location: '2.1' } as LayerHint);
      expect(repository.applyLayerPatches).toHaveBeenCalledWith('part1', [
        'mov 2.1 3.1',
      ]);
    });
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

  it('close should navigate to the item', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['/items', 'item1']);
  });
});
