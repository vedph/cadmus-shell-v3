import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { FragmentEditorService } from '@myrmidon/cadmus-state';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { LibraryRouteService } from '@myrmidon/cadmus-core';
import { EditedObject, TextLayerPart } from '@myrmidon/cadmus-core';

import { NgxMonacoEditorComponent } from '@jean-merelis/ngx-monaco-editor';
import {
  NgxMonacoEditorFakeComponent,
  provideMockMonacoEditor,
} from '@jean-merelis/ngx-monaco-editor/testing';

import { CommentFragmentFeatureComponent } from './comment-fragment-feature.component';
import {
  CommentFragment,
  COMMENT_FRAGMENT_TYPEID,
  COMMENT_PART_TYPEID,
  CommentEditorComponent,
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

const REQ_THESAURI_IDS = [
  'comment-tags',
  'doc-reference-tags',
  'doc-reference-types',
  'comment-categories',
  'comment-keyword-languages',
  'comment-keyword-indexes',
  'comment-keyword-tags',
  'comment-id-scopes',
  'comment-id-tags',
  'assertion-tags',
];

function makeFragment(overrides?: Partial<CommentFragment>): CommentFragment {
  return {
    location: '1.1',
    text: 'a comment',
    ...overrides,
  };
}

function makeLayerPart(overrides?: Partial<TextLayerPart>): TextLayerPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.token-text-layer',
    roleId: COMMENT_FRAGMENT_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    fragments: [makeFragment()],
    ...overrides,
  };
}

describe('CommentFragmentFeatureComponent', () => {
  let component: CommentFragmentFeatureComponent;
  let fixture: ComponentFixture<CommentFragmentFeatureComponent>;
  let editorService: ReturnType<typeof mockFragmentEditorService>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let libraryRouteService: ReturnType<typeof mockLibraryRouteService>;
  let appRepository: ReturnType<typeof mockAppRepository>;

  async function configure(
    loadResult: EditedObject<CommentFragment> | null | undefined = undefined,
    settingResolution: any = undefined,
  ) {
    TestBed.resetTestingModule();
    editorService = mockFragmentEditorService(loadResult);
    router = { navigate: vi.fn() };
    libraryRouteService = mockLibraryRouteService();
    appRepository = mockAppRepository({
      getSettingFor: vi.fn().mockResolvedValue(settingResolution),
    });

    await TestBed.configureTestingModule({
      imports: [CommentFragmentFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: mockFragmentRoute({ frTypeId: COMMENT_FRAGMENT_TYPEID }),
        },
        { provide: MatSnackBar, useValue: mockSnackBar() },
        { provide: FragmentEditorService, useValue: editorService },
        { provide: LibraryRouteService, useValue: libraryRouteService },
        { provide: AuthJwtService, useValue: mockAuthJwtService() },
        { provide: AppRepository, useValue: appRepository },
        { provide: EditedItemRepository, useValue: mockEditedItemRepository() },
        provideMockMonacoEditor({
          initializedEvent: { editor: { focus: vi.fn() } as any, monaco: {} as any },
        }),
      ],
    })
      .overrideComponent(CommentEditorComponent, {
        remove: { imports: [NgxMonacoEditorComponent] },
        add: { imports: [NgxMonacoEditorFakeComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CommentFragmentFeatureComponent);
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
    expect(component.identity().frTypeId).toBe(COMMENT_FRAGMENT_TYPEID);
  });

  it('should load data on init and request all the comment thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      REQ_THESAURI_IDS,
    );
    expect(component.data()?.value).toEqual(makeFragment());
  });

  it('should pass identity through so the editor can load its lookup settings', async () => {
    // bug fixed: comment-fragment-feature.component.html was missing the
    // [identity] binding on <cadmus-comment-editor/>, so its initSettings()
    // call (which needs identity()) never fired and lookupProviderOptions
    // never loaded for the real routed editor - see the .html fix.
    await configure(
      {
        value: makeFragment(),
        thesauri: {},
        layerPart: makeLayerPart(),
        baseText: 'alpha beta',
      },
      { lookupProviderOptions: { baseFilter: { limit: 5 } } },
    );
    await fixture.whenStable();

    // EditFragmentFeatureBase's constructor sets identity().roleId to the
    // fragment type id (frTypeId), so that is what flows through to
    // initSettings()'s getSettingFor call as the role id.
    expect(appRepository.getSettingFor).toHaveBeenCalledWith(
      COMMENT_PART_TYPEID,
      COMMENT_FRAGMENT_TYPEID,
    );
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
      const updated = makeFragment({ text: 'updated comment' });

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
        COMMENT_FRAGMENT_TYPEID,
      );
      expect(router.navigate).toHaveBeenCalledWith(
        ['/items/item1/general/it.vedph.token-text-layer/part1'],
        { queryParams: { rid: COMMENT_FRAGMENT_TYPEID } },
      );
    });
  });
});
