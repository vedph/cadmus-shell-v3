import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { ThesaurusListComponent } from './thesaurus-list.component';
import { ThesaurusListRepository } from '../state/thesaurus-list.repository';
import { ThesaurusService, UserLevelService } from '@myrmidon/cadmus-api';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { EnvService } from '@myrmidon/ngx-tools';
import { Thesaurus } from '@myrmidon/cadmus-core';

function makeThesaurus(overrides?: Partial<Thesaurus>): Thesaurus {
  return { id: 'colors@en', entries: [{ id: 'r', value: 'red' }], ...overrides };
}

function makeUser(overrides?: Partial<User>): User {
  return { userName: 'bob', email: 'bob@x.com', roles: [], ...overrides };
}

describe('ThesaurusListComponent', () => {
  let component: ThesaurusListComponent;
  let fixture: ComponentFixture<ThesaurusListComponent>;
  let repository: {
    loading$: Subject<any>;
    page$: Subject<any>;
    setPage: ReturnType<typeof vi.fn>;
    deleteThesaurus: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let thesaurusService: {
    getThesaurus: ReturnType<typeof vi.fn>;
    addThesaurus: ReturnType<typeof vi.fn>;
  };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authService: {
    currentUser$: BehaviorSubject<User | null>;
    isCurrentUserInRole: ReturnType<typeof vi.fn>;
  };
  let userLevelService: { getCurrentUserLevel: ReturnType<typeof vi.fn> };
  let snackbar: { open: ReturnType<typeof vi.fn> };
  let envService: { get: ReturnType<typeof vi.fn> };

  function createComponent(options?: { isAdmin?: boolean; envFlag?: string }) {
    repository = {
      loading$: new Subject(),
      page$: new Subject(),
      setPage: vi.fn(),
      deleteThesaurus: vi.fn(),
      reset: vi.fn(),
    };
    thesaurusService = {
      getThesaurus: vi.fn(),
      addThesaurus: vi.fn(),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    router = { navigate: vi.fn() };
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      isCurrentUserInRole: vi.fn().mockReturnValue(options?.isAdmin ?? false),
    };
    userLevelService = { getCurrentUserLevel: vi.fn().mockReturnValue(0) };
    snackbar = { open: vi.fn() };
    envService = { get: vi.fn().mockReturnValue(options?.envFlag) };

    TestBed.configureTestingModule({
      imports: [ThesaurusListComponent],
      providers: [
        { provide: ThesaurusListRepository, useValue: repository },
        { provide: ThesaurusService, useValue: thesaurusService },
        { provide: DialogService, useValue: dialogService },
        { provide: Router, useValue: router },
        { provide: AuthJwtService, useValue: authService },
        { provide: UserLevelService, useValue: userLevelService },
        { provide: MatSnackBar, useValue: snackbar },
        { provide: EnvService, useValue: envService },
      ],
    });
    fixture = TestBed.createComponent(ThesaurusListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('importEnabled', () => {
    it('should be false when the user is not an admin', () => {
      createComponent({ isAdmin: false, envFlag: 'true' });
      expect(component.importEnabled()).toBe(false);
    });

    it('should be false when the env flag is not set even for an admin', () => {
      createComponent({ isAdmin: true, envFlag: undefined });
      expect(component.importEnabled()).toBe(false);
    });

    it('should be true when the user is an admin and the env flag is set', () => {
      createComponent({ isAdmin: true, envFlag: 'true' });
      expect(component.importEnabled()).toBe(true);
    });
  });

  it('should track userLevel from the auth service', () => {
    createComponent();
    userLevelService.getCurrentUserLevel.mockReturnValue(3);
    authService.currentUser$.next(makeUser());
    expect(component.userLevel()).toBe(3);
  });

  describe('newThesaurusForm cross-field validator', () => {
    it('should flag sameTargetId when targetId equals id', () => {
      createComponent();
      component.newThesaurusId.setValue('x@en');
      component.newThesaurusTargetId.setValue('x@en');
      expect(component.newThesaurusForm.hasError('sameTargetId')).toBe(true);
    });

    it('should be valid when targetId differs from id', () => {
      createComponent();
      component.newThesaurusId.setValue('x@en');
      component.newThesaurusTargetId.setValue('y@en');
      expect(component.newThesaurusForm.hasError('sameTargetId')).toBe(false);
    });

    it('should be valid with no targetId at all', () => {
      createComponent();
      component.newThesaurusId.setValue('x@en');
      expect(component.newThesaurusForm.valid).toBe(true);
    });
  });

  describe('onPageChange', () => {
    it('should forward as a 1-based page number', () => {
      createComponent();
      component.onPageChange({ pageIndex: 2, pageSize: 10 } as any);
      expect(repository.setPage).toHaveBeenCalledWith(3, 10);
    });
  });

  describe('editThesaurus', () => {
    it('should navigate to /thesauri/:id', () => {
      createComponent();
      component.editThesaurus(makeThesaurus({ id: 'x1' }));
      expect(router.navigate).toHaveBeenCalledWith(['/thesauri', 'x1']);
    });
  });

  describe('deleteThesaurus', () => {
    it('should do nothing when userLevel is below 3', () => {
      createComponent();
      component.deleteThesaurus(makeThesaurus());
      expect(dialogService.confirm).not.toHaveBeenCalled();
    });

    it('should confirm and delete when userLevel is 3+', () => {
      createComponent();
      component.userLevel.set(3);
      component.deleteThesaurus(makeThesaurus({ id: 'x1' }));
      expect(dialogService.confirm).toHaveBeenCalled();
      expect(repository.deleteThesaurus).toHaveBeenCalledWith('x1');
    });

    it('should not delete when the user cancels', () => {
      createComponent();
      component.userLevel.set(3);
      dialogService.confirm.mockReturnValue(of(false));
      component.deleteThesaurus(makeThesaurus());
      expect(repository.deleteThesaurus).not.toHaveBeenCalled();
    });
  });

  describe('downloadThesaurus', () => {
    it('should do nothing when already downloading', () => {
      createComponent();
      component.downloading.set(true);
      component.downloadThesaurus('x1');
      expect(thesaurusService.getThesaurus).not.toHaveBeenCalled();
    });

    it('should fetch, build a blob download link, click it, and reset downloading', () => {
      createComponent();
      thesaurusService.getThesaurus.mockReturnValue(of(makeThesaurus({ id: 'x1' })));
      const createUrlSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:mock');
      const revokeUrlSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => {});
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});

      component.downloadThesaurus('x1');

      expect(thesaurusService.getThesaurus).toHaveBeenCalledWith('x1');
      expect(createUrlSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock');
      expect(component.downloading()).toBe(false);

      createUrlSpy.mockRestore();
      revokeUrlSpy.mockRestore();
      clickSpy.mockRestore();
    });

    it('should reset downloading and show a snackbar on error', () => {
      createComponent();
      thesaurusService.getThesaurus.mockReturnValue(
        throwError(() => new Error('boom'))
      );
      component.downloadThesaurus('x1');
      expect(component.downloading()).toBe(false);
      expect(snackbar.open).toHaveBeenCalled();
    });
  });

  describe('onUploadEnd', () => {
    it('should reset the repository', () => {
      createComponent();
      component.onUploadEnd();
      expect(repository.reset).toHaveBeenCalled();
    });
  });

  describe('addThesaurus', () => {
    function setValidForm(id = 'new1@en', targetId: string | null = null) {
      component.newThesaurusId.setValue(id);
      component.newThesaurusTargetId.setValue(targetId);
    }

    it('should do nothing when the form is invalid', () => {
      createComponent();
      component.addThesaurus();
      expect(thesaurusService.getThesaurus).not.toHaveBeenCalled();
    });

    it('should abort and notify when the thesaurus already has entries', () => {
      createComponent();
      setValidForm();
      thesaurusService.getThesaurus.mockReturnValue(
        of(makeThesaurus({ id: 'new1@en', entries: [{ id: 'a', value: 'A' }] }))
      );

      component.addThesaurus();

      expect(snackbar.open).toHaveBeenCalledWith(
        expect.stringContaining('already exists'),
        'OK'
      );
      expect(thesaurusService.addThesaurus).not.toHaveBeenCalled();
      expect(component.adding()).toBe(false);
    });

    it('should abort and notify when the thesaurus already has a targetId', () => {
      createComponent();
      setValidForm();
      thesaurusService.getThesaurus.mockReturnValue(
        of(makeThesaurus({ id: 'new1@en', entries: [], targetId: 'x@en' }))
      );

      component.addThesaurus();

      expect(snackbar.open).toHaveBeenCalledWith(
        expect.stringContaining('already exists'),
        'OK'
      );
      expect(thesaurusService.addThesaurus).not.toHaveBeenCalled();
    });

    it('should create a plain (non-alias) thesaurus and navigate to it', () => {
      createComponent();
      setValidForm('new1@en');
      thesaurusService.getThesaurus.mockReturnValue(
        of(makeThesaurus({ id: 'new1@en', entries: [] }))
      );
      thesaurusService.addThesaurus.mockReturnValue(of(undefined));

      component.addThesaurus();

      expect(thesaurusService.addThesaurus).toHaveBeenCalledWith({
        id: 'new1@en',
        entries: [],
        targetId: undefined,
      });
      expect(repository.reset).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/thesauri', 'new1@en']);
      expect(component.adding()).toBe(false);
    });

    it('should abort when the alias target does not exist', () => {
      createComponent();
      setValidForm('alias1@en', 'missing@en');
      thesaurusService.getThesaurus.mockImplementation((id: string) => {
        if (id === 'alias1@en') {
          return of(makeThesaurus({ id: 'alias1@en', entries: [] }));
        }
        // target: empty, no entries, no targetId -> "does not exist"
        return of({ id: 'missing@en', entries: [] } as Thesaurus);
      });

      component.addThesaurus();

      expect(snackbar.open).toHaveBeenCalledWith(
        expect.stringContaining('does not exist'),
        'OK'
      );
      expect(thesaurusService.addThesaurus).not.toHaveBeenCalled();
    });

    it('should create an alias thesaurus when the target exists', () => {
      createComponent();
      setValidForm('alias1@en', 'target1@en');
      thesaurusService.getThesaurus.mockImplementation((id: string) => {
        if (id === 'alias1@en') {
          return of(makeThesaurus({ id: 'alias1@en', entries: [] }));
        }
        return of(
          makeThesaurus({ id: 'target1@en', entries: [{ id: 'a', value: 'A' }] })
        );
      });
      thesaurusService.addThesaurus.mockReturnValue(of(undefined));

      component.addThesaurus();

      expect(thesaurusService.addThesaurus).toHaveBeenCalledWith({
        id: 'alias1@en',
        entries: [],
        targetId: 'target1@en',
      });
    });

    it('should show a snackbar and not add when checking the target errors', () => {
      createComponent();
      setValidForm('alias1@en', 'target1@en');
      thesaurusService.getThesaurus.mockImplementation((id: string) => {
        if (id === 'alias1@en') {
          return of(makeThesaurus({ id: 'alias1@en', entries: [] }));
        }
        return throwError(() => new Error('boom'));
      });

      component.addThesaurus();

      expect(snackbar.open).toHaveBeenCalledWith(
        expect.stringContaining('Error checking target thesaurus'),
        'OK'
      );
      expect(thesaurusService.addThesaurus).not.toHaveBeenCalled();
    });

    it('should show a snackbar when saving the new thesaurus fails', () => {
      createComponent();
      setValidForm('new1@en');
      thesaurusService.getThesaurus.mockReturnValue(
        of(makeThesaurus({ id: 'new1@en', entries: [] }))
      );
      thesaurusService.addThesaurus.mockReturnValue(
        throwError(() => new Error('boom'))
      );

      component.addThesaurus();

      expect(snackbar.open).toHaveBeenCalledWith(
        expect.stringContaining('Error adding thesaurus'),
        'OK'
      );
      expect(router.navigate).not.toHaveBeenCalled();
      expect(component.adding()).toBe(false);
    });
  });
});
