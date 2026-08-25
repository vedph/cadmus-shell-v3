import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { EditedObject } from '@myrmidon/cadmus-core';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';

import { PinLinksPartFeatureComponent } from './pin-links-part-feature.component';
import {
  PinLinksPart,
  PIN_LINKS_PART_TYPEID,
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

const LINK: AssertedCompositeId = {
  target: { gid: 'g1', label: 'Label 1' },
};

const REQ_THESAURI_IDS = [
  'pin-link-scopes',
  'pin-link-tags',
  'pin-link-assertion-tags',
  'pin-link-docref-types',
  'pin-link-docref-tags',
  'asserted-id-features',
];

function makePart(overrides?: Partial<PinLinksPart>): PinLinksPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: PIN_LINKS_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    links: [],
    ...overrides,
  };
}

describe('PinLinksPartFeatureComponent', () => {
  let component: PinLinksPartFeatureComponent;
  let fixture: ComponentFixture<PinLinksPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  async function configure(
    loadResult: EditedObject<PinLinksPart> | null | undefined = undefined,
    routeOverrides?: Parameters<typeof mockPartRoute>[0],
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PinLinksPartFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({
            typeId: PIN_LINKS_PART_TYPEID,
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

    fixture = TestBed.createComponent(PinLinksPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({ value: makePart({ links: [LINK] }), thesauri: {} });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(PIN_LINKS_PART_TYPEID);
  });

  it('should load data on init and request the pin-links thesauri (no role -> unsuffixed)', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      REQ_THESAURI_IDS,
    );
    expect(component.data()?.value).toEqual(makePart({ links: [LINK] }));
  });

  it('should suffix requested thesauri ids with the role id (roleIdInThesauri = true)', async () => {
    await configure(
      { value: makePart({ links: [LINK] }), thesauri: {} },
      { rid: 'scholarly' },
    );
    await fixture.whenStable();

    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      REQ_THESAURI_IDS.map((id) => `${id}_scholarly`),
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
    const part = makePart({ links: [LINK] });
    component.save(part);
    await Promise.resolve();
    expect(editorService.save).toHaveBeenCalledWith(part);
  });

  it('close should navigate to the item route', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
