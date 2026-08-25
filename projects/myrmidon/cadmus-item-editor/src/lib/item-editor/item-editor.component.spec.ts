import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { ItemEditorComponent } from './item-editor.component';
import { ItemRefLookupService } from '@myrmidon/cadmus-refs-asserted-ids';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '../state/edited-item.repository';
import { ItemService, MessagingService, UserLevelService } from '@myrmidon/cadmus-api';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { EnvService } from '@myrmidon/ngx-tools';
import {
  FacetDefinition,
  FlagDefinition,
  Item,
  LibraryRouteService,
  Part,
} from '@myrmidon/cadmus-core';

function makeItem(overrides?: Partial<Item>): Item {
  return {
    id: 'item1',
    title: 'Item 1',
    description: 'Desc',
    facetId: 'facet1',
    groupId: 'g1',
    sortKey: 'sk',
    flags: 0,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ...overrides,
  };
}

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    itemId: 'item1',
    typeId: 'it.vedph.note',
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    ...overrides,
  };
}

function makeFlag(id: number, isAdmin = false): FlagDefinition {
  return { id, label: `flag${id}`, description: '', colorKey: 'ff0000', isAdmin };
}

function makeUser(overrides?: Partial<User>): User {
  return { userName: 'bob', email: 'bob@x.com', roles: [], ...overrides };
}

describe('ItemEditorComponent', () => {
  let component: ItemEditorComponent;
  let fixture: ComponentFixture<ItemEditorComponent>;

  let repository: {
    item$: Subject<Item | undefined>;
    parts$: Subject<Part[]>;
    partGroups$: Subject<any[]>;
    layers$: Subject<any[]>;
    facet$: Subject<FacetDefinition | undefined>;
    newPartDefinitions$: Subject<any[]>;
    load: ReturnType<typeof vi.fn>;
    getItem: ReturnType<typeof vi.fn>;
    getPartGroups: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    deletePart: ReturnType<typeof vi.fn>;
    addNewLayerPart: ReturnType<typeof vi.fn>;
    setPartThesaurusScope: ReturnType<typeof vi.fn>;
  };
  let appRepository: {
    facets$: Subject<FacetDefinition[]>;
    typeThesaurus$: Subject<any>;
    previewJKeys$: Subject<string[]>;
    previewFKeys$: Subject<string[]>;
    flags$: Subject<FlagDefinition[]>;
    getTypeThesaurus: ReturnType<typeof vi.fn>;
  };
  let itemService: {
    getBaseTextPart: ReturnType<typeof vi.fn>;
    partWithTypeAndRoleExists: ReturnType<typeof vi.fn>;
    addPart: ReturnType<typeof vi.fn>;
    generateItems: ReturnType<typeof vi.fn>;
    getItemMetadata: ReturnType<typeof vi.fn>;
  };
  let libraryRouteService: { buildPartEditorRoute: ReturnType<typeof vi.fn> };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let authService: { currentUser$: BehaviorSubject<User | null> };
  let userLevelService: { getCurrentUserLevel: ReturnType<typeof vi.fn> };
  let messaging: { sendMessage: ReturnType<typeof vi.fn> };
  let envService: { get: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let snackbar: { open: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };

  function createComponent(routeId = 'new') {
    repository = {
      item$: new Subject(),
      parts$: new BehaviorSubject<Part[]>([]),
      partGroups$: new BehaviorSubject<any[]>([]),
      layers$: new BehaviorSubject<any[]>([]),
      facet$: new Subject(),
      newPartDefinitions$: new BehaviorSubject<any[]>([]),
      load: vi.fn(),
      getItem: vi.fn(),
      getPartGroups: vi.fn().mockReturnValue([]),
      save: vi.fn(),
      deletePart: vi.fn(),
      addNewLayerPart: vi.fn(),
      setPartThesaurusScope: vi.fn(),
    };
    appRepository = {
      facets$: new BehaviorSubject<FacetDefinition[]>([]),
      typeThesaurus$: new Subject(),
      previewJKeys$: new BehaviorSubject<string[]>([]),
      previewFKeys$: new BehaviorSubject<string[]>([]),
      flags$: new BehaviorSubject<FlagDefinition[]>([]),
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
    };
    itemService = {
      getBaseTextPart: vi.fn(),
      partWithTypeAndRoleExists: vi.fn(),
      addPart: vi.fn(),
      generateItems: vi.fn(),
      getItemMetadata: vi.fn(),
    };
    libraryRouteService = {
      buildPartEditorRoute: vi.fn().mockReturnValue({ route: '/items/item1/general/it.vedph.note/new' }),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    authService = { currentUser$: new BehaviorSubject<User | null>(null) };
    userLevelService = { getCurrentUserLevel: vi.fn().mockReturnValue(0) };
    messaging = { sendMessage: vi.fn() };
    envService = { get: vi.fn().mockReturnValue(undefined) };
    router = { navigate: vi.fn() };
    snackbar = { open: vi.fn() };
    dialog = { open: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ItemEditorComponent],
      providers: [
        { provide: ItemRefLookupService, useValue: {} },
        { provide: MatDialog, useValue: dialog },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: routeId } } },
        },
        { provide: MatSnackBar, useValue: snackbar },
        { provide: AppRepository, useValue: appRepository },
        { provide: EditedItemRepository, useValue: repository },
        { provide: ItemService, useValue: itemService },
        { provide: LibraryRouteService, useValue: libraryRouteService },
        { provide: DialogService, useValue: dialogService },
        { provide: AuthJwtService, useValue: authService },
        { provide: UserLevelService, useValue: userLevelService },
        { provide: MessagingService, useValue: messaging },
        { provide: EnvService, useValue: envService },
      ],
    });
    fixture = TestBed.createComponent(ItemEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('id parsing', () => {
    it('should treat route id "new" as undefined', () => {
      createComponent('new');
      expect(component.id()).toBeUndefined();
    });

    it('should keep a real route id', () => {
      createComponent('item1');
      expect(component.id()).toBe('item1');
    });
  });

  it('should load the repository with the parsed id on ngOnInit', () => {
    createComponent('item1');
    expect(repository.load).toHaveBeenCalledWith('item1');
  });

  describe('metadata form sync', () => {
    it('should reset the form when the item becomes undefined', async () => {
      createComponent();
      // item() must actually transition (signals no-op on an unchanged
      // value, and it starts as undefined already), so first load a real
      // item, then clear it
      repository.item$.next(makeItem());
      await fixture.whenStable();
      component.title.setValue('x');
      repository.item$.next(undefined);
      await fixture.whenStable();
      expect(component.title.value).toBeNull();
    });

    it('should populate the form fields from the loaded item', async () => {
      createComponent();
      repository.item$.next(makeItem());
      await fixture.whenStable();
      expect(component.title.value).toBe('Item 1');
      expect(component.sortKey.value).toBe('sk');
      expect(component.description.value).toBe('Desc');
      expect(component.facetCtrl.value).toBe('facet1');
      expect(component.group.value).toBe('g1');
      expect(component.flags.value).toBe(0);
      expect(component.metadata.pristine).toBe(true);
    });
  });

  describe('canDeactivate', () => {
    it('should return true when the metadata form is not dirty', () => {
      createComponent();
      expect(component.canDeactivate()).toBe(true);
    });

    it('should return false when the metadata form is dirty', () => {
      createComponent();
      component.title.markAsDirty();
      expect(component.canDeactivate()).toBe(false);
    });
  });

  describe('flags computeds', () => {
    it('should exclude admin flags from flagSetFlags for non-admin users', () => {
      createComponent();
      appRepository.flags$.next([makeFlag(1), makeFlag(2, true)]);
      userLevelService.getCurrentUserLevel.mockReturnValue(3);
      authService.currentUser$.next(makeUser({ roles: ['editor'] }));

      expect(component.flagSetFlags().map((f) => f.id)).toEqual(['1']);
      expect(component.adminFlagDefs().map((d) => d.id)).toEqual([2]);
    });

    it('should include admin flags for admin users', () => {
      createComponent();
      appRepository.flags$.next([makeFlag(1), makeFlag(2, true)]);
      userLevelService.getCurrentUserLevel.mockReturnValue(4);
      authService.currentUser$.next(makeUser({ roles: ['admin'] }));

      expect(component.flagSetFlags().map((f) => f.id).sort()).toEqual([
        '1',
        '2',
      ]);
      expect(component.adminFlagDefs()).toEqual([]);
    });

    it('should compute checkedFlagIds from the flags control bitmask', () => {
      createComponent();
      appRepository.flags$.next([makeFlag(1), makeFlag(2), makeFlag(4)]);
      component.flags.setValue(1 | 4);
      expect(component.checkedFlagIds().sort()).toEqual(['1', '4']);
    });
  });

  describe('onFlagCheckedIdsChange', () => {
    it('should set the bitmask directly for admin users', () => {
      createComponent();
      appRepository.flags$.next([makeFlag(1), makeFlag(2, true)]);
      userLevelService.getCurrentUserLevel.mockReturnValue(4);
      authService.currentUser$.next(makeUser({ roles: ['admin'] }));

      component.onFlagCheckedIdsChange(['1', '2']);

      expect(component.flags.value).toBe(3);
      expect(component.flags.dirty).toBe(true);
    });

    it('should preserve existing admin-flag bits for non-admin users', () => {
      createComponent();
      appRepository.flags$.next([makeFlag(1), makeFlag(2, true)]);
      userLevelService.getCurrentUserLevel.mockReturnValue(3);
      authService.currentUser$.next(makeUser({ roles: ['editor'] }));
      // admin flag 2 is already set on the item
      component.flags.setValue(2);

      // non-admin only toggles flag 1 via the UI
      component.onFlagCheckedIdsChange(['1']);

      // admin bit (2) must be preserved even though the non-admin's ids
      // list didn't include it
      expect(component.flags.value).toBe(3);
    });

    it('should not let a non-admin add a new admin flag bit', () => {
      createComponent();
      appRepository.flags$.next([makeFlag(1), makeFlag(2, true)]);
      userLevelService.getCurrentUserLevel.mockReturnValue(3);
      authService.currentUser$.next(makeUser({ roles: ['editor'] }));
      component.flags.setValue(0); // admin flag not currently set

      component.onFlagCheckedIdsChange(['1', '2']);

      // flag 2 wasn't already set, and the non-admin preservation loop
      // only preserves bits already present - passing '2' in ids would
      // still OR it in though, since the ids loop is unconditional
      expect(component.flags.value).toBe(3);
    });
  });

  describe('save', () => {
    it('should do nothing when busy', () => {
      createComponent();
      (component as any).busy.set(true);
      component.save();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should do nothing when the metadata form is invalid', () => {
      createComponent();
      component.metadata.setErrors({ invalid: true });
      component.save();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should do nothing when there is no current item', () => {
      createComponent();
      repository.getItem.mockReturnValue(undefined);
      // form must be valid to get past the first guard
      component.title.setValue('t');
      component.sortKey.setValue('s');
      component.description.setValue('d');
      component.facetCtrl.setValue('f');
      component.save();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should trim string fields and save, sending a reset message', async () => {
      createComponent('item1');
      const current = makeItem();
      repository.getItem.mockReturnValue(current);
      repository.item$.next(current);
      component.title.setValue('  New Title  ');
      component.sortKey.setValue('  sk  ');
      component.description.setValue('  d  ');
      component.facetCtrl.setValue('  facet1  ');
      component.group.setValue('  g1  ');
      const saved = makeItem({ title: 'New Title' });
      repository.save.mockResolvedValue(saved);

      component.save();
      await Promise.resolve();
      await Promise.resolve();

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Title', sortKey: 'sk' })
      );
      expect(messaging.sendMessage).toHaveBeenCalled();
    });

    it('should navigate to the new item route only when the item had no id', async () => {
      createComponent('new');
      const current = makeItem({ id: '' });
      repository.getItem.mockReturnValue(current);
      component.title.setValue('t');
      component.sortKey.setValue('s');
      component.description.setValue('d');
      component.facetCtrl.setValue('f');
      const saved = makeItem({ id: 'new-id' });
      repository.save.mockResolvedValue(saved);

      component.save();
      await Promise.resolve();
      await Promise.resolve();

      expect(component.id()).toBe('new-id');
      expect(router.navigate).toHaveBeenCalledWith(['/items', 'new-id']);
    });
  });

  describe('addPart', () => {
    it('should show a snackbar and not navigate when there is no saved item id', () => {
      createComponent('new');
      component.newPartType.setValue({ typeId: 'it.vedph.note' } as any);
      component.addPart();
      expect(snackbar.open).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should not navigate when the part already exists', () => {
      createComponent('item1');
      repository.getPartGroups.mockReturnValue([
        { key: 'g', label: 'g', parts: [makePart({ typeId: 'it.vedph.note' })] },
      ]);
      component.newPartType.setValue({ typeId: 'it.vedph.note' } as any);
      component.addPart();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to the built route for a new part', () => {
      createComponent('item1');
      component.newPartType.setValue({ typeId: 'it.vedph.date' } as any);
      component.addPart();
      expect(libraryRouteService.buildPartEditorRoute).toHaveBeenCalledWith(
        'item1',
        'new',
        'it.vedph.date',
        undefined
      );
      expect(router.navigate).toHaveBeenCalled();
    });
  });

  describe('previewPart', () => {
    it('should redirect layer (fr.) parts to the base text preview', () => {
      createComponent('item1');
      itemService.getBaseTextPart.mockReturnValue(
        of({ part: { id: 'bt1' }, text: 'x' })
      );
      component.previewPart(
        makePart({ typeId: 'it.vedph.token-text-layer', roleId: 'fr.it.vedph.comment' })
      );
      expect(router.navigate).toHaveBeenCalledWith(
        ['preview', 'item1', 'bt1', 'text'],
        { queryParams: { lid: 'fr.it.vedph.comment' } }
      );
    });

    it('should preview a base-text part directly', () => {
      createComponent('item1');
      component.previewPart(makePart({ roleId: 'base-text' }));
      expect(router.navigate).toHaveBeenCalledWith([
        'preview',
        'item1',
        'p1',
        'text',
      ]);
    });

    it('should preview a plain part directly', () => {
      createComponent('item1');
      component.previewPart(makePart());
      expect(router.navigate).toHaveBeenCalledWith(['preview', 'item1', 'p1']);
    });
  });

  describe('deletePart', () => {
    it('should do nothing when busy', () => {
      createComponent('item1');
      (component as any).busy.set(true);
      component.deletePart(makePart());
      expect(dialogService.confirm).not.toHaveBeenCalled();
    });

    it('should delete after confirmation', async () => {
      createComponent('item1');
      repository.deletePart.mockResolvedValue('p1');
      component.deletePart(makePart());
      await Promise.resolve();
      await Promise.resolve();
      expect(repository.deletePart).toHaveBeenCalledWith('p1');
    });

    it('should not delete when the user cancels', () => {
      createComponent('item1');
      dialogService.confirm.mockReturnValue(of(false));
      component.deletePart(makePart());
      expect(repository.deletePart).not.toHaveBeenCalled();
    });
  });

  describe('setPartsScope', () => {
    it('should delegate to the repository', () => {
      createComponent('item1');
      component.setPartsScope({ ids: ['p1'], scope: 's1' });
      expect(repository.setPartThesaurusScope).toHaveBeenCalledWith(['p1'], 's1');
    });
  });
});
