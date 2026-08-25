import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { Router } from '@angular/router';

import { ItemListComponent } from './item-list.component';
import { ItemListRepository } from '../state/item-list.repository';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { UserLevelService } from '@myrmidon/cadmus-api';
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
});
