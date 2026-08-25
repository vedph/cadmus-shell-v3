import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { of } from 'rxjs';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EditedObject } from '@myrmidon/cadmus-core';

import { BibliographyPartFeatureComponent } from './bibliography-part-feature.component';
import {
  BibliographyPart,
  BIBLIOGRAPHY_PART_TYPEID,
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

function makePart(overrides?: Partial<BibliographyPart>): BibliographyPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: BIBLIOGRAPHY_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    entries: [],
    ...overrides,
  };
}

describe('BibliographyPartFeatureComponent', () => {
  let component: BibliographyPartFeatureComponent;
  let fixture: ComponentFixture<BibliographyPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;

  async function configure(
    loadResult: EditedObject<BibliographyPart> | null | undefined = undefined,
    routeOverrides?: { rid?: string },
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);

    await TestBed.configureTestingModule({
      imports: [BibliographyPartFeatureComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({
            typeId: BIBLIOGRAPHY_PART_TYPEID,
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
        // BibliographyPartComponent uses DialogService.confirm for entry
        // removal confirmation.
        { provide: DialogService, useValue: { confirm: vi.fn().mockReturnValue(of(true)) } },
        // BibliographyEntryComponent (rendered unconditionally) uses
        // MatDatepicker for the access date, which requires a DateAdapter.
        provideNativeDateAdapter(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BibliographyPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({
      value: makePart({ entries: [{ typeId: 'book', title: 'A title' }] }),
      thesauri: {},
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(BIBLIOGRAPHY_PART_TYPEID);
  });

  it('should load data on init and request the expected thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining([
        'bibliography-languages',
        'bibliography-types',
        'bibliography-tags',
        'bibliography-author-roles',
      ]),
    );
    expect(component.data()?.value).toEqual(
      makePart({ entries: [{ typeId: 'book', title: 'A title' }] }),
    );
  });

  it('should NOT suffix requested thesauri IDs with the role ID (roleIdInThesauri is not set)', async () => {
    await configure({ value: makePart(), thesauri: {} }, { rid: 'rl1' });
    await fixture.whenStable();

    expect(component.identity().roleId).toBe('rl1');
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      'bibliography-languages',
      'bibliography-types',
      'bibliography-tags',
      'bibliography-author-roles',
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
    const part = makePart({ entries: [{ typeId: 'article', title: 'B title' }] });
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
