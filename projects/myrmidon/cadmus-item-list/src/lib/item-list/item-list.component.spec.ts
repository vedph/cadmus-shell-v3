import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ItemListComponent } from './item-list.component';
import { ItemListRepository } from '../state/item-list.repository';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { ItemService, UserLevelService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';
import { UserRefLookupService } from '@myrmidon/cadmus-ui';
import { ItemInfo } from '@myrmidon/cadmus-core';

function makeItem(overrides?: Partial<ItemInfo>): ItemInfo {
  return {
    id: 'item1',
    title: 'Item 1',
    description: '',
    facetId: 'facet1',
    groupId: '',
    sortKey: '',
    flags: 0,
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

describe('ItemListComponent', () => {
  let component: ItemListComponent;
  let fixture: ComponentFixture<ItemListComponent>;
  let repository: {
    loading$: Subject<boolean | undefined>;
    page$: Subject<any>;
    // ItemListComponent's template always renders <cadmus-item-filter />,
    // which also injects ItemListRepository and reads filter$ in its own
    // ngOnInit, so the shared mock must satisfy that surface too
    filter$: Subject<any>;
    setPage: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
    deleteItem: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authService: { currentUser$: BehaviorSubject<User | null> };
  let userLevelService: { getCurrentUserLevel: ReturnType<typeof vi.fn> };
  let appRepository: {
    load: ReturnType<typeof vi.fn>;
    facets$: Subject<any>;
    flags$: Subject<any>;
  };
  let itemService: {
    downloadItem: ReturnType<typeof vi.fn>;
    uploadItem: ReturnType<typeof vi.fn>;
  };
  let snackbar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repository = {
      loading$: new Subject(),
      page$: new Subject(),
      filter$: new Subject(),
      setPage: vi.fn(),
      setFilter: vi.fn(),
      deleteItem: vi.fn(),
      reset: vi.fn(),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    router = { navigate: vi.fn() };
    authService = { currentUser$: new BehaviorSubject<User | null>(null) };
    userLevelService = { getCurrentUserLevel: vi.fn().mockReturnValue(0) };
    appRepository = {
      load: vi.fn().mockResolvedValue(undefined),
      facets$: new Subject(),
      flags$: new Subject(),
    };
    itemService = { downloadItem: vi.fn(), uploadItem: vi.fn() };
    snackbar = {
      open: vi.fn().mockReturnValue({ onAction: () => of(undefined) }),
    };

    await TestBed.configureTestingModule({
      imports: [ItemListComponent],
      providers: [
        provideNativeDateAdapter(),
        { provide: ItemListRepository, useValue: repository },
        { provide: DialogService, useValue: dialogService },
        { provide: Router, useValue: router },
        { provide: AuthJwtService, useValue: authService },
        { provide: UserLevelService, useValue: userLevelService },
        { provide: AppRepository, useValue: appRepository },
        { provide: UserRefLookupService, useValue: {} },
        { provide: ItemService, useValue: itemService },
        { provide: MatSnackBar, useValue: snackbar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load app data on init', async () => {
    await fixture.whenStable();
    expect(component).toBeTruthy();
    expect(appRepository.load).toHaveBeenCalled();
  });

  it('should track the current user and level from the auth service', async () => {
    await fixture.whenStable();
    authService.currentUser$.next(makeUser());
    userLevelService.getCurrentUserLevel.mockReturnValue(3);
    authService.currentUser$.next(makeUser());

    expect(component.user()?.userName).toBe('bob');
    expect(component.userLevel()).toBe(3);
  });

  it('should reset user/userLevel when the user logs out', async () => {
    await fixture.whenStable();
    authService.currentUser$.next(makeUser());
    authService.currentUser$.next(null);
    expect(component.user()).toBeUndefined();
  });

  it('should forward page changes to the repository as a 1-based page number', () => {
    component.onPageChange({ pageIndex: 2, pageSize: 10, length: 100 } as any);
    expect(repository.setPage).toHaveBeenCalledWith(3, 10);
  });

  it('should navigate to /items/new on addItem', () => {
    component.addItem();
    expect(router.navigate).toHaveBeenCalledWith(['/items', 'new']);
  });

  it('should navigate to /items/:id on editItem', () => {
    component.editItem(makeItem({ id: 'x1' }));
    expect(router.navigate).toHaveBeenCalledWith(['/items', 'x1']);
  });

  it('should call repository.reset on reset()', () => {
    component.reset();
    expect(repository.reset).toHaveBeenCalled();
  });

  describe('deleteItem', () => {
    it('should do nothing when the user has neither admin nor editor role', async () => {
      await fixture.whenStable();
      authService.currentUser$.next(makeUser({ roles: ['visitor'] }));

      component.deleteItem(makeItem());

      expect(dialogService.confirm).not.toHaveBeenCalled();
    });

    it('should confirm and delete when the user is an editor', async () => {
      await fixture.whenStable();
      authService.currentUser$.next(makeUser({ roles: ['editor'] }));

      component.deleteItem(makeItem({ id: 'x1' }));

      expect(dialogService.confirm).toHaveBeenCalled();
      expect(repository.deleteItem).toHaveBeenCalledWith('x1');
    });

    it('should not delete when the user cancels the confirmation', async () => {
      await fixture.whenStable();
      authService.currentUser$.next(makeUser({ roles: ['admin'] }));
      dialogService.confirm.mockReturnValue(of(false));

      component.deleteItem(makeItem());

      expect(repository.deleteItem).not.toHaveBeenCalled();
    });

    it('should allow deletion when there is no current user yet (no roles checked)', () => {
      // user() is still undefined at this point: `undefined?.roles.every(...)`
      // is undefined, which is falsy, so the guard does not return early
      component.deleteItem(makeItem());
      expect(dialogService.confirm).toHaveBeenCalled();
    });
  });

  describe('downloadItem', () => {
    afterEach(() => vi.restoreAllMocks());

    it('should save the downloaded file named after the item ID', () => {
      const blob = new Blob(['{}'], { type: 'application/json' });
      itemService.downloadItem.mockReturnValue(of(blob));
      const createUrl = vi.fn().mockReturnValue('blob:x');
      const revokeUrl = vi.fn();
      Object.assign(URL, {
        createObjectURL: createUrl,
        revokeObjectURL: revokeUrl,
      });
      let downloadName: string | undefined;
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
        function (this: HTMLAnchorElement) {
          downloadName = this.download;
        },
      );

      component.downloadItem(makeItem({ id: 'x1' }));

      expect(itemService.downloadItem).toHaveBeenCalledWith('x1');
      expect(createUrl).toHaveBeenCalledWith(blob);
      expect(downloadName).toBe('x1.json');
      expect(revokeUrl).toHaveBeenCalledWith('blob:x');
      expect(component.busy()).toBe(false);
    });

    it('should notify errors', () => {
      itemService.downloadItem.mockReturnValue(throwError(() => 'boom'));

      component.downloadItem(makeItem());

      expect(snackbar.open).toHaveBeenCalledWith(
        'Error downloading item: boom',
        'OK',
      );
      expect(component.busy()).toBe(false);
    });
  });

  describe('onUploadFileChange', () => {
    function makeEvent(file?: File): Event {
      const input = { files: file ? [file] : [], value: 'x' };
      return { target: input } as unknown as Event;
    }

    it('should do nothing when no file was picked', () => {
      component.onUploadFileChange(makeEvent());
      expect(itemService.uploadItem).not.toHaveBeenCalled();
    });

    it('should upload the file, refresh the list, and notify', () => {
      const file = new File(['{}'], 'item.json');
      itemService.uploadItem.mockReturnValue(
        of({ id: 'new1', title: 'New' }),
      );
      const event = makeEvent(file);

      component.onUploadFileChange(event);

      expect(itemService.uploadItem).toHaveBeenCalledWith(file);
      expect((event.target as HTMLInputElement).value).toBe('');
      expect(repository.reset).toHaveBeenCalled();
      expect(snackbar.open).toHaveBeenCalledWith(
        'Item "New" uploaded',
        'Open',
        { duration: 5000 },
      );
      // the mocked snackbar action fires at once, opening the new item
      expect(router.navigate).toHaveBeenCalledWith(['/items', 'new1']);
      expect(component.busy()).toBe(false);
    });

    it('should notify errors', () => {
      itemService.uploadItem.mockReturnValue(
        throwError(() => 'Item x already exists'),
      );

      component.onUploadFileChange(makeEvent(new File(['{}'], 'item.json')));

      expect(repository.reset).not.toHaveBeenCalled();
      expect(snackbar.open).toHaveBeenCalledWith(
        'Error uploading item: Item x already exists',
        'OK',
      );
      expect(component.busy()).toBe(false);
    });
  });
});
