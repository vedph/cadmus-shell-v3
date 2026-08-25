import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { EditedObject } from '@myrmidon/cadmus-core';

import { TiledTextPartFeatureComponent } from './tiled-text-part-feature.component';
import {
  TiledTextPart,
  TextTileRow,
  TILED_TEXT_PART_TYPEID,
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

function makePart(rows: TextTileRow[] = []): TiledTextPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: TILED_TEXT_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    citation: 'cit',
    rows,
  };
}

describe('TiledTextPartFeatureComponent', () => {
  let component: TiledTextPartFeatureComponent;
  let fixture: ComponentFixture<TiledTextPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  async function configure(
    loadResult: EditedObject<TiledTextPart> | null | undefined = undefined,
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TiledTextPartFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({ typeId: TILED_TEXT_PART_TYPEID }),
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

    fixture = TestBed.createComponent(TiledTextPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({
      value: makePart([{ y: 1, tiles: [{ x: 1, data: { text: 'a' } }] }]),
      thesauri: {},
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(TILED_TEXT_PART_TYPEID);
  });

  it('should load data on init requesting no thesauri (base default)', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), []);
    expect(component.data()?.value).toEqual(
      makePart([{ y: 1, tiles: [{ x: 1, data: { text: 'a' } }] }]),
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
    const part = makePart([{ y: 2, tiles: [] }]);
    component.save(part);
    await Promise.resolve();
    expect(editorService.save).toHaveBeenCalledWith(part);
  });

  it('close should navigate to the item route', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
