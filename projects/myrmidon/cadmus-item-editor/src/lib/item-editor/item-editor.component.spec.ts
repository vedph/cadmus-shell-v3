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

  function createComponent(
    routeId = 'new',
    env: Record<string, unknown> = {}
  ) {
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
    envService = { get: vi.fn((key: string) => env[key]) };
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

  describe('hasMetadataBuilders', () => {
    it('should be false when not set in env', () => {
      createComponent();
      expect(component.hasMetadataBuilders()).toBe(false);
    });

    it('should be true when set to boolean true in env', () => {
      createComponent('new', { hasMetadataBuilders: true });
      expect(component.hasMetadataBuilders()).toBe(true);
    });

    it('should be true when set to string "true" in env', () => {
      createComponent('new', { hasMetadataBuilders: 'true' });
      expect(component.hasMetadataBuilders()).toBe(true);
    });

    it('should be false when set to false in env', () => {
      createComponent('new', { hasMetadataBuilders: false });
      expect(component.hasMetadataBuilders()).toBe(false);
    });
  });

  describe('canDeactivate', () => {
    it('should return true when the metadata editor is not dirty', () => {
      createComponent();
      expect(component.canDeactivate()).toBe(true);
    });

    it('should return false when the metadata editor is dirty', () => {
      createComponent();
      component.onMetadataDirtyChange(true);
      expect(component.canDeactivate()).toBe(false);
    });

    it('should track the dirty state of the metadata editor', async () => {
      // 'new' selects the metadata tab (mat-tab renders only the selected one)
      createComponent('new');
      repository.item$.next(makeItem());
      fixture.detectChanges();
      await fixture.whenStable();
      const editor = component.metadataEditor()!;
      expect(editor).toBeTruthy();

      editor.metadata.title().markAsDirty();
      fixture.detectChanges();

      expect(component.canDeactivate()).toBe(false);
    });
  });

  describe('metadata editor', () => {
    it('should bind the loaded item to the metadata editor', async () => {
      createComponent('new');
      repository.item$.next(makeItem());
      fixture.detectChanges();
      await fixture.whenStable();
      const editor = component.metadataEditor()!;
      expect(editor.item()?.id).toBe('item1');
      expect(editor.metadata.title().value()).toBe('Item 1');
      expect(editor.readonly()).toBe(false);
    });
  });

  describe('onMetadataSave', () => {
    const metadata = {
      title: 'New Title',
      sortKey: 'sk',
      description: 'd',
      facetId: 'facet1',
      groupId: 'g1',
      flags: 1,
    };

    it('should do nothing when busy', () => {
      createComponent();
      (component as any).busy.set(true);
      component.onMetadataSave(metadata);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should do nothing when there is no current item', () => {
      createComponent();
      repository.getItem.mockReturnValue(undefined);
      component.onMetadataSave(metadata);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should merge the metadata into the item and save, sending a reset message', async () => {
      createComponent('item1');
      const current = makeItem();
      repository.getItem.mockReturnValue(current);
      repository.save.mockResolvedValue(makeItem({ title: 'New Title' }));
      component.onMetadataDirtyChange(true);

      component.onMetadataSave(metadata);
      await Promise.resolve();
      await Promise.resolve();

      expect(repository.save).toHaveBeenCalledWith({ ...current, ...metadata });
      expect(messaging.sendMessage).toHaveBeenCalled();
      // the guard no more prompts for the item just saved
      expect(component.canDeactivate()).toBe(true);
      expect(component.busy()).toBe(false);
    });

    it('should navigate to the new item route only when the item had no id', async () => {
      createComponent('new');
      repository.getItem.mockReturnValue(makeItem({ id: '' }));
      repository.save.mockResolvedValue(makeItem({ id: 'new-id' }));

      component.onMetadataSave(metadata);
      await Promise.resolve();
      await Promise.resolve();

      expect(component.id()).toBe('new-id');
      expect(router.navigate).toHaveBeenCalledWith(['/items', 'new-id']);
    });

    it('should save when the metadata editor requests it', async () => {
      createComponent('new');
      const current = makeItem();
      repository.getItem.mockReturnValue(current);
      repository.item$.next(current);
      repository.save.mockResolvedValue(current);
      fixture.detectChanges();
      await fixture.whenStable();
      const editor = component.metadataEditor()!;
      editor.metadata.title().value.set('changed');

      editor.save();
      await Promise.resolve();

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'changed' })
      );
    });
  });

  describe('onGenerateMetadata', () => {
    it('should set the generated title into the metadata editor', async () => {
      createComponent('new');
      repository.item$.next(makeItem());
      fixture.detectChanges();
      await fixture.whenStable();
      component.id.set('item1');
      itemService.getItemMetadata.mockReturnValue(of({ T: 'Generated' }));

      component.onGenerateMetadata('T');

      expect(itemService.getItemMetadata).toHaveBeenCalledWith('item1', 'T');
      expect(component.metadataEditor()!.metadata.title().value()).toBe(
        'Generated'
      );
      expect(component.busy()).toBe(false);
    });

    it('should notify when nothing was generated', () => {
      createComponent('item1');
      itemService.getItemMetadata.mockReturnValue(of({}));
      component.onGenerateMetadata('D');
      expect(snackbar.open).toHaveBeenCalledWith(
        'No description generated',
        'OK',
        expect.anything()
      );
    });

    it('should reset busy on error', () => {
      createComponent('item1');
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      itemService.getItemMetadata.mockReturnValue(throwError(() => 'x'));
      component.onGenerateMetadata('T');
      expect(component.busy()).toBe(false);
      err.mockRestore();
    });
  });

  describe('history', () => {
    it('should be disabled unless historyEnabled is true in env', () => {
      createComponent('item1');
      expect(component.historyEnabled()).toBe(false);
    });

    it('should be enabled when historyEnabled is true in env', () => {
      createComponent('item1', { historyEnabled: true });
      expect(component.historyEnabled()).toBe(true);
    });

    it('should navigate to the part editor route with /history', () => {
      createComponent('item1');
      libraryRouteService.buildPartEditorRoute.mockReturnValue({
        route: '/items/item1/general/it.vedph.note/p1',
        rid: 'r',
      });
      component.viewPartHistory(makePart({ roleId: 'r' }));
      expect(libraryRouteService.buildPartEditorRoute).toHaveBeenCalledWith(
        'item1',
        'p1',
        'it.vedph.note',
        'r'
      );
      expect(router.navigate).toHaveBeenCalledWith(
        ['/items/item1/general/it.vedph.note/p1/history'],
        { queryParams: { rid: 'r' } }
      );
    });

    it('should navigate without query parameters when there is no role', () => {
      createComponent('item1');
      libraryRouteService.buildPartEditorRoute.mockReturnValue({
        route: '/items/item1/general/it.vedph.note/p1',
      });
      component.viewPartHistory(makePart());
      expect(router.navigate).toHaveBeenCalledWith(
        ['/items/item1/general/it.vedph.note/p1/history'],
        {}
      );
    });
  });

  describe('addPart', () => {
    it('should show a snackbar and not navigate when there is no saved item id', () => {
      createComponent('new');
      component.newPart.newPartType().value.set({ typeId: 'it.vedph.note' } as any);
      component.addPart();
      expect(snackbar.open).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should not navigate when the part already exists', () => {
      createComponent('item1');
      repository.getPartGroups.mockReturnValue([
        { key: 'g', label: 'g', parts: [makePart({ typeId: 'it.vedph.note' })] },
      ]);
      component.newPart.newPartType().value.set({ typeId: 'it.vedph.note' } as any);
      component.addPart();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to the built route for a new part', () => {
      createComponent('item1');
      component.newPart.newPartType().value.set({ typeId: 'it.vedph.date' } as any);
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
