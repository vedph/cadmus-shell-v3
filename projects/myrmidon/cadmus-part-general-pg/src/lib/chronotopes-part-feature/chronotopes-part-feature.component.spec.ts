import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { RamStorageService } from '@myrmidon/ngx-tools';
import { EditedObject } from '@myrmidon/cadmus-core';
import { AssertedChronotope } from '@myrmidon/cadmus-refs-asserted-chronotope';

import { ChronotopesPartFeatureComponent } from './chronotopes-part-feature.component';
import {
  ChronotopesPart,
  CHRONOTOPES_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
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

function makeChronotope(overrides?: Partial<AssertedChronotope>): AssertedChronotope {
  return { place: { value: 'Rome' }, ...overrides };
}

function makePart(overrides?: Partial<ChronotopesPart>): ChronotopesPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: CHRONOTOPES_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    chronotopes: [],
    ...overrides,
  };
}

describe('ChronotopesPartFeatureComponent', () => {
  let component: ChronotopesPartFeatureComponent;
  let fixture: ComponentFixture<ChronotopesPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;

  async function configure(
    loadResult: EditedObject<ChronotopesPart> | null | undefined = undefined,
    routeOverrides?: { rid?: string },
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);

    await TestBed.configureTestingModule({
      imports: [ChronotopesPartFeatureComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({
            typeId: CHRONOTOPES_PART_TYPEID,
            ...routeOverrides,
          }),
        },
        { provide: MatSnackBar, useValue: mockSnackBar() },
        { provide: ItemService, useValue: mockItemService() },
        { provide: ThesaurusService, useValue: mockThesaurusService() },
        { provide: PartEditorService, useValue: editorService },
        { provide: AuthJwtService, useValue: mockAuthJwtService() },
        { provide: AppRepository, useValue: mockAppRepository() },
        { provide: EditedItemRepository, useValue: mockEditedItemRepository() },
        // ChronotopesPartComponent uses DialogService.confirm for entry
        // deletion, and RamStorageService to resolve a place lookup config.
        { provide: DialogService, useValue: { confirm: vi.fn().mockReturnValue(of(true)) } },
        { provide: RamStorageService, useValue: { retrieve: vi.fn().mockReturnValue(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChronotopesPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({
      value: makePart({ chronotopes: [makeChronotope()] }),
      thesauri: {},
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(CHRONOTOPES_PART_TYPEID);
  });

  it('should load data on init and request the expected thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining([
        'chronotope-place-tags',
        'chronotope-assertion-tags',
        'doc-reference-types',
        'doc-reference-tags',
      ]),
    );
    expect(component.data()?.value).toEqual(
      makePart({ chronotopes: [makeChronotope()] }),
    );
  });

  it('should suffix requested thesauri IDs with the role ID when present', async () => {
    await configure({ value: makePart(), thesauri: {} }, { rid: 'rl1' });
    await fixture.whenStable();

    expect(component.identity().roleId).toBe('rl1');
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      'chronotope-place-tags_rl1',
      'chronotope-assertion-tags_rl1',
      'doc-reference-types_rl1',
      'doc-reference-tags_rl1',
    ]);
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
    const part = makePart({ chronotopes: [makeChronotope({ place: { value: 'Athens' } })] });
    component.save(part);
    await Promise.resolve();
    expect(editorService.save).toHaveBeenCalledWith(part);
  });

  it('close should navigate back to the item', () => {
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
