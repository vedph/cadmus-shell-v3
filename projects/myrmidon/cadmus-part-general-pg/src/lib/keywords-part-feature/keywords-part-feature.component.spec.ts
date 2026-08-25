import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { EditedObject } from '@myrmidon/cadmus-core';

import { KeywordsPartFeatureComponent } from './keywords-part-feature.component';
import { KeywordsPart, KEYWORDS_PART_TYPEID } from '@myrmidon/cadmus-part-general-ui';
import {
  mockAppRepository,
  mockAuthJwtService,
  mockEditedItemRepository,
  mockItemService,
  mockPartEditorService,
  mockPartRoute,
  mockSnackBar,
  mockThesaurusService,
} from '../testing/testing.mocks';

function makePart(overrides?: Partial<KeywordsPart>): KeywordsPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: KEYWORDS_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    keywords: [],
    ...overrides,
  };
}

describe('KeywordsPartFeatureComponent', () => {
  let component: KeywordsPartFeatureComponent;
  let fixture: ComponentFixture<KeywordsPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;
  let router: ReturnType<typeof mockRouter>;

  function mockRouter() {
    return { navigate: vi.fn() };
  }

  async function configure(
    loadResult: EditedObject<KeywordsPart> | null | undefined = undefined,
    routeOverrides?: Parameters<typeof mockPartRoute>[0],
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);
    router = mockRouter();

    await TestBed.configureTestingModule({
      imports: [KeywordsPartFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({ typeId: KEYWORDS_PART_TYPEID, ...routeOverrides }),
        },
        { provide: MatSnackBar, useValue: mockSnackBar() },
        { provide: ItemService, useValue: mockItemService() },
        { provide: ThesaurusService, useValue: mockThesaurusService() },
        { provide: PartEditorService, useValue: editorService },
        { provide: AuthJwtService, useValue: mockAuthJwtService() },
        { provide: AppRepository, useValue: mockAppRepository() },
        { provide: EditedItemRepository, useValue: mockEditedItemRepository() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KeywordsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({
      value: makePart({ keywords: [{ language: 'eng', value: 'a' }] }),
      thesauri: {},
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(KEYWORDS_PART_TYPEID);
  });

  it('should load data on init and request the languages thesaurus (unsuffixed, no role)', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining(['languages']),
    );
    expect(component.data()?.value).toEqual(
      makePart({ keywords: [{ language: 'eng', value: 'a' }] }),
    );
  });

  it('should suffix the languages thesaurus id with the role id when roleIdInThesauri is set and a role is present', async () => {
    await configure(
      {
        value: makePart(),
        thesauri: { languages_sample: { id: 'languages_sample@en', entries: [] } },
      },
      { rid: 'sample' },
    );
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      'languages_sample',
    ]);
    // an unsuffixed alias should be added to the loaded thesauri set
    expect(component.data()?.thesauri['languages']).toEqual(
      component.data()?.thesauri['languages_sample'],
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

  it('save should delegate to the editor service', async () => {
    const part = makePart({ keywords: [{ language: 'eng', value: 'b' }] });
    component.save(part);
    await Promise.resolve();
    expect(editorService.save).toHaveBeenCalledWith(part);
  });

  it('close should navigate back to the item', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
