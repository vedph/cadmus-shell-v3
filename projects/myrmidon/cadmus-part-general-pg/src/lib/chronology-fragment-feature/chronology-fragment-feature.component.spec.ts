import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { FragmentEditorService } from '@myrmidon/cadmus-state';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { EditedObject, TextLayerPart } from '@myrmidon/cadmus-core';

import { ChronologyFragmentFeatureComponent } from './chronology-fragment-feature.component';
import {
  ChronologyFragment,
  CHRONOLOGY_FRAGMENT_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
import {
  mockAppRepository,
  mockAuthJwtService,
  mockEditedItemRepository,
  mockFragmentEditorService,
  mockFragmentRoute,
  mockLibraryRouteService,
  mockSnackBar,
} from '../testing/testing.mocks';

function makeFragment(
  overrides?: Partial<ChronologyFragment>,
): ChronologyFragment {
  return {
    location: '1.1',
    date: { a: { value: 1200 } },
    ...overrides,
  };
}

function makeLayerPart(overrides?: Partial<TextLayerPart>): TextLayerPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.token-text-layer',
    roleId: CHRONOLOGY_FRAGMENT_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    fragments: [makeFragment()],
    ...overrides,
  };
}

describe('ChronologyFragmentFeatureComponent', () => {
  let component: ChronologyFragmentFeatureComponent;
  let fixture: ComponentFixture<ChronologyFragmentFeatureComponent>;
  let editorService: ReturnType<typeof mockFragmentEditorService>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let libraryRouteService: ReturnType<typeof mockLibraryRouteService>;

  async function configure(
    loadResult: EditedObject<ChronologyFragment> | null | undefined = undefined,
  ) {
    TestBed.resetTestingModule();
    editorService = mockFragmentEditorService(loadResult);
    router = { navigate: vi.fn() };
    libraryRouteService = mockLibraryRouteService();

    await TestBed.configureTestingModule({
      imports: [ChronologyFragmentFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: mockFragmentRoute({ frTypeId: CHRONOLOGY_FRAGMENT_TYPEID }),
        },
        { provide: MatSnackBar, useValue: mockSnackBar() },
        { provide: FragmentEditorService, useValue: editorService },
        { provide: LibraryRouteService, useValue: libraryRouteService },
        { provide: AuthJwtService, useValue: mockAuthJwtService() },
        { provide: AppRepository, useValue: mockAppRepository() },
        { provide: EditedItemRepository, useValue: mockEditedItemRepository() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChronologyFragmentFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({
      value: makeFragment(),
      thesauri: {},
      layerPart: makeLayerPart(),
      baseText: 'alpha beta',
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().loc).toBe('1.1');
    expect(component.identity().frTypeId).toBe(CHRONOLOGY_FRAGMENT_TYPEID);
  });

  it('should load data on init and request the chronology-tags thesaurus', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      'chronology-tags',
    ]);
    expect(component.data()?.value).toEqual(makeFragment());
  });

  it('should update dirty via onDirtyChange', () => {
    expect(component.dirty()).toBe(false);
    component.onDirtyChange(true);
    expect(component.dirty()).toBe(true);
  });

  it('canDeactivate should be true unless dirty', () => {
    expect(component.canDeactivate()).toBe(true);
    component.onDirtyChange(true);
    expect(component.canDeactivate()).toBe(false);
  });

  describe('save', () => {
    it('should replace the fragment at the current location and delegate to the editor service', async () => {
      await fixture.whenStable();
      const updated = makeFragment({ date: { a: { value: 1500 } } });

      component.save(updated);
      await Promise.resolve();
      await Promise.resolve();

      const savedPart = editorService.save.mock.calls[0][0] as TextLayerPart;
      expect(savedPart.fragments).toEqual([updated]);
    });

    it('should push the fragment when none exists at the current location', async () => {
      await configure({
        value: makeFragment(),
        thesauri: {},
        layerPart: makeLayerPart({
          fragments: [makeFragment({ location: '9.9' })],
        }),
        baseText: 'alpha beta',
      });
      await fixture.whenStable();

      const updated = makeFragment();
      component.save(updated);
      await Promise.resolve();
      await Promise.resolve();

      const savedPart = editorService.save.mock.calls[0][0] as TextLayerPart;
      expect(savedPart.fragments).toEqual([
        makeFragment({ location: '9.9' }),
        updated,
      ]);
    });
  });

  describe('close', () => {
    it('should resolve the editor key from the layer part and navigate accordingly', async () => {
      await fixture.whenStable();

      component.close();

      expect(libraryRouteService.getEditorKeyFromPartType).toHaveBeenCalledWith(
        'it.vedph.token-text-layer',
        CHRONOLOGY_FRAGMENT_TYPEID,
      );
      expect(router.navigate).toHaveBeenCalledWith(
        ['/items/item1/general/it.vedph.token-text-layer/part1'],
        { queryParams: { rid: CHRONOLOGY_FRAGMENT_TYPEID } },
      );
    });
  });
});
