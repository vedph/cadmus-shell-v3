import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { EditedObject } from '@myrmidon/cadmus-core';

import { MetadataPartFeatureComponent } from './metadata-part-feature.component';
import { MetadataPart, METADATA_PART_TYPEID } from '@myrmidon/cadmus-part-general-ui';
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

function makePart(overrides?: Partial<MetadataPart>): MetadataPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: METADATA_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    metadata: [],
    ...overrides,
  };
}

describe('MetadataPartFeatureComponent', () => {
  let component: MetadataPartFeatureComponent;
  let fixture: ComponentFixture<MetadataPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  async function configure(
    loadResult: EditedObject<MetadataPart> | null | undefined = undefined,
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MetadataPartFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: mockPartRoute({ typeId: METADATA_PART_TYPEID }) },
        { provide: MatSnackBar, useValue: mockSnackBar() },
        { provide: ItemService, useValue: mockItemService() },
        { provide: ThesaurusService, useValue: mockThesaurusService() },
        { provide: PartEditorService, useValue: editorService },
        { provide: AuthJwtService, useValue: mockAuthJwtService() },
        { provide: AppRepository, useValue: mockAppRepository() },
        { provide: EditedItemRepository, useValue: mockEditedItemRepository() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MetadataPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({
      value: makePart({ metadata: [{ name: 'n', value: 'v' }] }),
      thesauri: {},
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(METADATA_PART_TYPEID);
  });

  it('should load data on init and request the metadata-types and metadata-names thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining(['metadata-types', 'metadata-names']),
    );
    expect(component.data()?.value).toEqual(
      makePart({ metadata: [{ name: 'n', value: 'v' }] }),
    );
  });

  it('should not suffix thesauri ids (roleIdInThesauri is not set for this feature)', async () => {
    await configure({ value: makePart(), thesauri: {} });
    // this component's constructor never sets `this.roleIdInThesauri = true`,
    // unlike keywords/names/note/physical-measurements, so role-based
    // suffixing never applies here even if the route carries a role id
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      'metadata-types',
      'metadata-names',
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
    const part = makePart({ metadata: [{ name: 'n2', value: 'v2' }] });
    component.save(part);
    await Promise.resolve();
    expect(editorService.save).toHaveBeenCalledWith(part);
  });

  it('close should navigate back to the item', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
