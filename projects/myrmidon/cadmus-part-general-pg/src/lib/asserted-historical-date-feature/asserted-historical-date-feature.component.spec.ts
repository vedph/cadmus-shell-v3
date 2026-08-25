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
import { EditedObject } from '@myrmidon/cadmus-core';
import { AssertedHistoricalDate } from '@myrmidon/cadmus-refs-asserted-chronotope';

import { AssertedHistoricalDateFeatureComponent } from './asserted-historical-date-feature.component';
import {
  AssertedHistoricalDatesPart,
  ASSERTED_HISTORICAL_DATES_PART_TYPEID,
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

function makeDate(value: number): AssertedHistoricalDate {
  return { a: { value } };
}

function makePart(
  overrides?: Partial<AssertedHistoricalDatesPart>,
): AssertedHistoricalDatesPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: ASSERTED_HISTORICAL_DATES_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    dates: [],
    ...overrides,
  };
}

describe('AssertedHistoricalDateFeatureComponent', () => {
  let component: AssertedHistoricalDateFeatureComponent;
  let fixture: ComponentFixture<AssertedHistoricalDateFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;

  async function configure(
    loadResult: EditedObject<AssertedHistoricalDatesPart> | null | undefined = undefined,
    routeOverrides?: { rid?: string },
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);

    await TestBed.configureTestingModule({
      imports: [AssertedHistoricalDateFeatureComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({
            typeId: ASSERTED_HISTORICAL_DATES_PART_TYPEID,
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
        // AssertedHistoricalDatesPartComponent uses DialogService.confirm
        // for delete confirmation dialogs.
        { provide: DialogService, useValue: { confirm: vi.fn().mockReturnValue(of(true)) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssertedHistoricalDateFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({ value: makePart({ dates: [makeDate(100)] }), thesauri: {} });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(ASSERTED_HISTORICAL_DATES_PART_TYPEID);
  });

  it('should load data on init and request the expected thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining([
        'asserted-historical-dates-tags',
        'assertion-tags',
        'doc-reference-types',
        'doc-reference-tags',
      ]),
    );
    expect(component.data()?.value).toEqual(makePart({ dates: [makeDate(100)] }));
  });

  it('should suffix requested thesauri IDs with the role ID when present', async () => {
    await configure(
      { value: makePart(), thesauri: {} },
      { rid: 'rl1' },
    );
    await fixture.whenStable();

    expect(component.identity().roleId).toBe('rl1');
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      'asserted-historical-dates-tags_rl1',
      'assertion-tags_rl1',
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
    const part = makePart({ dates: [makeDate(200)] });
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
