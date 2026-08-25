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

import { ExternalIdsPartFeatureComponent } from './external-ids-part-feature.component';
import {
  ExternalIdsPart,
  EXTERNAL_IDS_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
import {
  mockAppRepository,
  mockAuthJwtService,
  mockEditedItemRepository,
  mockItemService,
  mockPartEditorService,
  mockPartRoute,
  mockRouter,
  mockSnackBar,
  mockThesaurusService,
} from '../testing/testing.mocks';

function makePart(overrides?: Partial<ExternalIdsPart>): ExternalIdsPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: EXTERNAL_IDS_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ids: [],
    ...overrides,
  };
}

describe('ExternalIdsPartFeatureComponent', () => {
  let component: ExternalIdsPartFeatureComponent;
  let fixture: ComponentFixture<ExternalIdsPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;
  let router: ReturnType<typeof mockRouter>;

  async function configure(
    loadResult: EditedObject<ExternalIdsPart> | null | undefined = undefined,
    routeOverrides?: Parameters<typeof mockPartRoute>[0],
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);
    router = mockRouter();

    await TestBed.configureTestingModule({
      imports: [ExternalIdsPartFeatureComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({
            typeId: EXTERNAL_IDS_PART_TYPEID,
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

    fixture = TestBed.createComponent(ExternalIdsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({
      value: makePart({ ids: [{ value: 'x1', scope: 's1' }] }),
      thesauri: {},
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(EXTERNAL_IDS_PART_TYPEID);
  });

  it('should load data on init and request the external-ids thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining([
        'external-id-scopes',
        'external-id-tags',
        'assertion-tags',
        'doc-reference-types',
        'doc-reference-tags',
      ]),
    );
    expect(component.data()?.value).toEqual(
      makePart({ ids: [{ value: 'x1', scope: 's1' }] }),
    );
  });

  it('should suffix requested thesauri ids with the role id when present', async () => {
    await configure({ value: makePart(), thesauri: {} }, { rid: 'sample' });
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining(['external-id-scopes_sample', 'assertion-tags_sample']),
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
    const part = makePart({ ids: [{ value: 'x2', scope: 's2' }] });
    component.save(part);
    await Promise.resolve();
    expect(editorService.save).toHaveBeenCalledWith(part);
  });

  it('close should navigate to the item', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
