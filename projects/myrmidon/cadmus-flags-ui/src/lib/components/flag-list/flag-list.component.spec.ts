import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AppRepository } from '@myrmidon/cadmus-state';
import { FlagDefinition } from '@myrmidon/cadmus-core';

import { FlagListComponent } from './flag-list.component';
import { FlagListRepository } from './flag-list.repository';

function makeFlag(overrides?: Partial<FlagDefinition>): FlagDefinition {
  return {
    id: 1,
    label: 'admin',
    description: 'admin flag',
    colorKey: 'f00000',
    ...overrides,
  };
}

describe('FlagListComponent', () => {
  let component: FlagListComponent;
  let fixture: ComponentFixture<FlagListComponent>;
  let repository: {
    flags$: BehaviorSubject<FlagDefinition[]>;
    activeFlag$: BehaviorSubject<FlagDefinition | null>;
    loading$: BehaviorSubject<boolean>;
    addNewFlag: ReturnType<typeof vi.fn>;
    deleteFlag: ReturnType<typeof vi.fn>;
    setActive: ReturnType<typeof vi.fn>;
    addFlag: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let appRepository: { load: ReturnType<typeof vi.fn>; loadFlags: ReturnType<typeof vi.fn> };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let snackbar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repository = {
      flags$: new BehaviorSubject<FlagDefinition[]>([makeFlag()]),
      activeFlag$: new BehaviorSubject<FlagDefinition | null>(null),
      loading$: new BehaviorSubject<boolean>(false),
      addNewFlag: vi.fn().mockReturnValue(2),
      deleteFlag: vi.fn(),
      setActive: vi.fn(),
      addFlag: vi.fn(),
      reset: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    appRepository = { load: vi.fn(), loadFlags: vi.fn() };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    snackbar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [FlagListComponent],
      providers: [
        { provide: FlagListRepository, useValue: repository },
        { provide: AppRepository, useValue: appRepository },
        { provide: DialogService, useValue: dialogService },
        { provide: MatSnackBar, useValue: snackbar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FlagListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should ensure app data is loaded on construction', () => {
    expect(appRepository.load).toHaveBeenCalled();
  });

  it('addFlag should delegate to the repository', () => {
    component.addFlag();
    expect(repository.addNewFlag).toHaveBeenCalled();
  });

  describe('deleteFlag', () => {
    it('should delete after confirmation', () => {
      component.deleteFlag(makeFlag());
      expect(dialogService.confirm).toHaveBeenCalled();
      expect(repository.deleteFlag).toHaveBeenCalledWith(1);
    });

    it('should not delete when the user declines', () => {
      dialogService.confirm.mockReturnValue(of(false));
      component.deleteFlag(makeFlag());
      expect(repository.deleteFlag).not.toHaveBeenCalled();
    });
  });

  it('editFlag should set the repository active flag', () => {
    component.editFlag(makeFlag({ id: 2 }));
    expect(repository.setActive).toHaveBeenCalledWith(2);
  });

  it('onFlagEditorClose should clear the active flag', () => {
    component.onFlagEditorClose();
    expect(repository.setActive).toHaveBeenCalledWith(null);
  });

  it('onFlagChange should save the flag and clear the active flag', () => {
    const flag = makeFlag({ id: 4 });
    component.onFlagChange(flag);
    expect(repository.addFlag).toHaveBeenCalledWith(flag);
    expect(repository.setActive).toHaveBeenCalledWith(null);
  });

  it('reset should delegate to the repository', () => {
    component.reset();
    expect(repository.reset).toHaveBeenCalled();
  });

  it('save should persist via the repository, notify, and reload app flags', async () => {
    component.save();
    await Promise.resolve();

    expect(repository.save).toHaveBeenCalled();
    expect(snackbar.open).toHaveBeenCalledWith('Flags saved', 'OK', { duration: 1500 });
    expect(appRepository.loadFlags).toHaveBeenCalled();
  });
});
