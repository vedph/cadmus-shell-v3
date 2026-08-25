import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { EditedObject } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { HistoricalEventsPartFeatureComponent } from './historical-events-part-feature.component';
import {
  HistoricalEvent,
  HistoricalEventsPart,
  HISTORICAL_EVENTS_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
import {
  mockAppRepository,
  mockAuthJwtService,
  mockEditedItemRepository,
  mockPartEditorService,
  mockPartRoute,
  mockRouter,
  mockSnackBar,
  mockThesaurusService,
} from '../testing/testing.mocks';

function makeEvent(overrides?: Partial<HistoricalEvent>): HistoricalEvent {
  return {
    eid: 'e1',
    type: 'birth',
    ...overrides,
  };
}

function makePart(
  overrides?: Partial<HistoricalEventsPart>,
): HistoricalEventsPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: HISTORICAL_EVENTS_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    events: [],
    ...overrides,
  };
}

// HistoricalEventsPartComponent renders RelatedEntityComponent ->
// AssertedCompositeIdComponent -> LookupPinComponent (from @myrmidon/cadmus-ui),
// which requires ItemService.searchPins to return an Observable (not just
// any object) and the 'indexLookupDefinitions' string injection token to be
// provided, or rendering throws NG0201. It also uses DialogService (from
// @myrmidon/ngx-mat-tools) for delete confirmations.
function mockHistoricalEventsItemService() {
  return {
    searchPins: vi.fn().mockReturnValue(of({ value: { items: [] } })),
  };
}

describe('HistoricalEventsPartFeatureComponent', () => {
  let component: HistoricalEventsPartFeatureComponent;
  let fixture: ComponentFixture<HistoricalEventsPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;
  let router: ReturnType<typeof mockRouter>;

  async function configure(
    loadResult: EditedObject<HistoricalEventsPart> | null | undefined = undefined,
    routeOverrides?: Parameters<typeof mockPartRoute>[0],
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);
    router = mockRouter();

    await TestBed.configureTestingModule({
      imports: [HistoricalEventsPartFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({
            typeId: HISTORICAL_EVENTS_PART_TYPEID,
            ...routeOverrides,
          }),
        },
        { provide: MatSnackBar, useValue: mockSnackBar() },
        { provide: ItemService, useValue: mockHistoricalEventsItemService() },
        { provide: ThesaurusService, useValue: mockThesaurusService() },
        { provide: PartEditorService, useValue: editorService },
        { provide: AuthJwtService, useValue: mockAuthJwtService() },
        { provide: AppRepository, useValue: mockAppRepository() },
        { provide: EditedItemRepository, useValue: mockEditedItemRepository() },
        { provide: DialogService, useValue: { confirm: vi.fn().mockReturnValue(of(true)) } },
        { provide: 'indexLookupDefinitions', useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricalEventsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({
      value: makePart({ events: [makeEvent()] }),
      thesauri: {},
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(HISTORICAL_EVENTS_PART_TYPEID);
  });

  it('should load data on init and request all the historical-events thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining([
        'event-types',
        'event-tags',
        'event-relations',
        'chronotope-tags',
        'asserted-id-scopes',
        'asserted-id-tags',
        'assertion-tags',
        'doc-reference-tags',
        'doc-reference-types',
        'pin-link-scopes',
        'pin-link-tags',
        'asserted-id-features',
      ]),
    );
    expect(component.data()?.value).toEqual(
      makePart({ events: [makeEvent()] }),
    );
  });

  it('should suffix requested thesauri ids with the role id when present', async () => {
    await configure({ value: makePart(), thesauri: {} }, { rid: 'sample' });
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining(['event-types_sample', 'asserted-id-features_sample']),
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
    const part = makePart({ events: [makeEvent({ eid: 'e2', type: 'death' })] });
    component.save(part);
    await Promise.resolve();
    expect(editorService.save).toHaveBeenCalledWith(part);
  });

  it('close should navigate to the item', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
