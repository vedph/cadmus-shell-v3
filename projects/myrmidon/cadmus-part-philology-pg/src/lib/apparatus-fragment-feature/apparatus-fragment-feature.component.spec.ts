import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { FragmentEditorService } from '@myrmidon/cadmus-state';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { EditedObject, TextLayerPart } from '@myrmidon/cadmus-core';

import { ApparatusFragmentFeatureComponent } from './apparatus-fragment-feature.component';
import {
  ApparatusFragment,
  ApparatusEntryType,
  APPARATUS_FRAGMENT_TYPEID,
} from '@myrmidon/cadmus-part-philology-ui';
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
  overrides?: Partial<ApparatusFragment>,
): ApparatusFragment {
  return {
    location: '1.1',
    entries: [{ type: ApparatusEntryType.replacement, value: 'lectio' }],
    ...overrides,
  };
}

function makeLayerPart(overrides?: Partial<TextLayerPart>): TextLayerPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.token-text-layer',
    roleId: APPARATUS_FRAGMENT_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    fragments: [makeFragment()],
    ...overrides,
  };
}

describe('ApparatusFragmentFeatureComponent', () => {
  let component: ApparatusFragmentFeatureComponent;
  let fixture: ComponentFixture<ApparatusFragmentFeatureComponent>;
  let editorService: ReturnType<typeof mockFragmentEditorService>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let libraryRouteService: ReturnType<typeof mockLibraryRouteService>;

  async function configure(
    loadResult: EditedObject<ApparatusFragment> | null | undefined = undefined,
  ) {
    TestBed.resetTestingModule();
    editorService = mockFragmentEditorService(loadResult);
    router = { navigate: vi.fn() };
    libraryRouteService = mockLibraryRouteService();

    await TestBed.configureTestingModule({
      imports: [ApparatusFragmentFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: mockFragmentRoute({ frTypeId: APPARATUS_FRAGMENT_TYPEID }),
        },
        { provide: MatSnackBar, useValue: mockSnackBar() },
        { provide: FragmentEditorService, useValue: editorService },
        { provide: LibraryRouteService, useValue: libraryRouteService },
        { provide: AuthJwtService, useValue: mockAuthJwtService() },
        { provide: AppRepository, useValue: mockAppRepository() },
        { provide: EditedItemRepository, useValue: mockEditedItemRepository() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApparatusFragmentFeatureComponent);
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
    expect(component.identity().frTypeId).toBe(APPARATUS_FRAGMENT_TYPEID);
  });

  it('should load data on init and request the apparatus thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      '!apparatus-tags',
      '!apparatus-author-tags',
      '!author-works',
      'apparatus-witnesses',
      'apparatus-authors',
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
      const updated = makeFragment({
        entries: [{ type: ApparatusEntryType.note, note: 'a note' }],
      });

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
        APPARATUS_FRAGMENT_TYPEID,
      );
      expect(router.navigate).toHaveBeenCalledWith(
        ['/items/item1/general/it.vedph.token-text-layer/part1'],
        { queryParams: { rid: APPARATUS_FRAGMENT_TYPEID } },
      );
    });
  });
});
