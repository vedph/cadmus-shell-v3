import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { Router } from '@angular/router';

import { ItemSearchComponent } from './item-search.component';
import { ItemSearchRepository } from '../state/item-search.repository';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { UserLevelService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';
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

describe('ItemSearchComponent', () => {
  let component: ItemSearchComponent;
  let fixture: ComponentFixture<ItemSearchComponent>;
  let repository: {
    page$: Subject<any>;
    query$: Subject<any>;
    lastQueries$: Subject<any>;
    error$: Subject<any>;
    loading$: Subject<any>;
    setPage: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
    deleteItem: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authService: { currentUser$: BehaviorSubject<User | null> };
  let userLevelService: { getCurrentUserLevel: ReturnType<typeof vi.fn> };
  let appRepository: {
    load: ReturnType<typeof vi.fn>;
    getFacets: ReturnType<typeof vi.fn>;
    getFlags: ReturnType<typeof vi.fn>;
    facets$: Subject<any>;
  };

  beforeEach(async () => {
    repository = {
      page$: new Subject(),
      query$: new Subject(),
      lastQueries$: new Subject(),
      error$: new Subject(),
      loading$: new Subject(),
      setPage: vi.fn(),
      search: vi.fn(),
      deleteItem: vi.fn(),
      reset: vi.fn(),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    router = { navigate: vi.fn() };
    authService = { currentUser$: new BehaviorSubject<User | null>(null) };
    userLevelService = { getCurrentUserLevel: vi.fn().mockReturnValue(0) };
    appRepository = {
      load: vi.fn().mockResolvedValue(undefined),
      getFacets: vi.fn().mockReturnValue([]),
      getFlags: vi.fn().mockReturnValue([]),
      facets$: new Subject(),
    };

    await TestBed.configureTestingModule({
      imports: [ItemSearchComponent],
      providers: [
        { provide: ItemSearchRepository, useValue: repository },
        { provide: DialogService, useValue: dialogService },
        { provide: Router, useValue: router },
        { provide: AuthJwtService, useValue: authService },
        { provide: UserLevelService, useValue: userLevelService },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load app data/facets/flags on init', async () => {
    await fixture.whenStable();
    expect(component).toBeTruthy();
    expect(appRepository.load).toHaveBeenCalled();
    expect(component.facets()).toEqual([]);
  });

  it('should track the current user and level from the auth service', async () => {
    await fixture.whenStable();
    userLevelService.getCurrentUserLevel.mockReturnValue(3);
    authService.currentUser$.next(makeUser());
    expect(component.user()?.userName).toBe('bob');
    expect(component.userLevel()).toBe(3);
  });

  it('should forward page changes to the repository as a 1-based page number', () => {
    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 100 } as any);
    expect(repository.setPage).toHaveBeenCalledWith(2, 10);
  });

  describe('submitQuery', () => {
    it('should do nothing for an empty query', () => {
      component.submitQuery('');
      expect(repository.search).not.toHaveBeenCalled();
    });

    it('should search for a non-empty query', () => {
      component.submitQuery('hello');
      expect(repository.search).toHaveBeenCalledWith('hello');
    });
  });

  it('should navigate to /items/:id on editItem', () => {
    component.editItem(makeItem({ id: 'x1' }));
    expect(router.navigate).toHaveBeenCalledWith(['/items', 'x1']);
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
  });

  it('should call repository.reset on reset()', () => {
    component.reset();
    expect(repository.reset).toHaveBeenCalled();
  });
});
