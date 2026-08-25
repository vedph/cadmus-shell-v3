import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { EditedObject } from '@myrmidon/cadmus-core';
import { ProperName } from '@myrmidon/cadmus-refs-proper-name';

import { DistrictLocationPartFeatureComponent } from './district-location-part-feature.component';
import {
  DistrictLocationPart,
  DISTRICT_LOCATION_PART_TYPEID,
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

const PLACE: ProperName = {
  language: 'eng',
  pieces: [{ type: 'district', value: 'Downtown' }],
};

function makePart(overrides?: Partial<DistrictLocationPart>): DistrictLocationPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: DISTRICT_LOCATION_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    place: PLACE,
    ...overrides,
  };
}

describe('DistrictLocationPartFeatureComponent', () => {
  let component: DistrictLocationPartFeatureComponent;
  let fixture: ComponentFixture<DistrictLocationPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;

  async function configure(
    loadResult: EditedObject<DistrictLocationPart> | null | undefined = undefined,
    routeOverrides?: { rid?: string },
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);

    await TestBed.configureTestingModule({
      imports: [DistrictLocationPartFeatureComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({
            typeId: DISTRICT_LOCATION_PART_TYPEID,
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DistrictLocationPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({ value: makePart({ note: 'a note' }), thesauri: {} });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(DISTRICT_LOCATION_PART_TYPEID);
  });

  it('should load data on init and request the expected thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining([
        'district-name-piece-types',
        'district-name-lang-entries',
      ]),
    );
    expect(component.data()?.value).toEqual(makePart({ note: 'a note' }));
  });

  it('should suffix requested thesauri IDs with the role ID when present', async () => {
    await configure({ value: makePart(), thesauri: {} }, { rid: 'rl1' });
    await fixture.whenStable();

    expect(component.identity().roleId).toBe('rl1');
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      'district-name-piece-types_rl1',
      'district-name-lang-entries_rl1',
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
    const part = makePart({ note: 'updated note' });
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
