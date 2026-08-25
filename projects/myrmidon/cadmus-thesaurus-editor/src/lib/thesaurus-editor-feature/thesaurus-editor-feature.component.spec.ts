import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { ThesaurusEditorFeatureComponent } from './thesaurus-editor-feature.component';
import { AppRepository } from '@myrmidon/cadmus-state';
import { ThesaurusService, UserLevelService } from '@myrmidon/cadmus-api';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { Thesaurus } from '@myrmidon/cadmus-core';

function makeThesaurus(overrides?: Partial<Thesaurus>): Thesaurus {
  return {
    id: 'colors@en',
    entries: [
      { id: 'r', value: 'red' },
      { id: 'g', value: 'green' },
    ],
    ...overrides,
  };
}

describe('ThesaurusEditorFeatureComponent', () => {
  let component: ThesaurusEditorFeatureComponent;
  let fixture: ComponentFixture<ThesaurusEditorFeatureComponent>;
  let appRepository: { load: ReturnType<typeof vi.fn>; loadThesauri: ReturnType<typeof vi.fn> };
  let thesService: {
    getThesaurus: ReturnType<typeof vi.fn>;
    addThesaurus: ReturnType<typeof vi.fn>;
  };
  let userLevelService: { getCurrentUserLevel: ReturnType<typeof vi.fn> };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let snackbar: { open: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  function createComponent(
    routeId = 'colors@en',
    getThesaurusReturn = of(makeThesaurus())
  ) {
    appRepository = { load: vi.fn(), loadThesauri: vi.fn() };
    thesService = {
      getThesaurus: vi.fn().mockReturnValue(getThesaurusReturn),
      addThesaurus: vi.fn().mockReturnValue(of(undefined)),
    };
    userLevelService = { getCurrentUserLevel: vi.fn().mockReturnValue(0) };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    snackbar = { open: vi.fn() };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ThesaurusEditorFeatureComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: routeId } } },
        },
        { provide: Router, useValue: router },
        { provide: AppRepository, useValue: appRepository },
        { provide: UserLevelService, useValue: userLevelService },
        { provide: ThesaurusService, useValue: thesService },
        { provide: DialogService, useValue: dialogService },
        { provide: MatSnackBar, useValue: snackbar },
      ],
    });
    fixture = TestBed.createComponent(ThesaurusEditorFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('id parsing', () => {
    it('should keep a real route id', () => {
      createComponent('colors@en');
      expect(component.id()).toBe('colors@en');
    });

    it('should treat route id "new" as undefined', () => {
      createComponent('new');
      expect(component.id()).toBeUndefined();
    });
  });

  describe('ngOnInit', () => {
    it('should load the thesaurus and its entries when an id is present', () => {
      createComponent('colors@en');
      expect(thesService.getThesaurus).toHaveBeenCalledWith('colors@en', true);
      expect(component.thesaurus()).toEqual(makeThesaurus());
      expect(component.entries()).toEqual(makeThesaurus().entries);
      expect(component.busy()).toBe(false);
    });

    it('should show a snackbar and navigate away on load error', () => {
      createComponent('colors@en', throwError(() => new Error('boom')));
      expect(snackbar.open).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/thesauri']);
      expect(component.busy()).toBe(false);
    });

    it('should not fetch anything for a "new" thesaurus (no id)', () => {
      // documents current (unfixed) behavior: navigating to a literal
      // "new" id is not reachable through the app's actual add-thesaurus
      // flow (cadmus-thesaurus-list creates the thesaurus server-side
      // first, then always navigates with a real id), so this path is
      // effectively dead in practice - included here for completeness
      createComponent('new');
      expect(thesService.getThesaurus).not.toHaveBeenCalled();
      expect(component.thesaurus()).toBeUndefined();
      expect(component.busy()).toBe(false);
    });
  });

  describe('canDeactivate', () => {
    it('should return true when there are no changes', () => {
      createComponent();
      expect(component.canDeactivate()).toBe(true);
    });

    it('should return false when there are changes', () => {
      createComponent();
      component.onChangesStateChange(true);
      expect(component.canDeactivate()).toBe(false);
    });
  });

  describe('onReset', () => {
    it('should do nothing when there is no loaded thesaurus', () => {
      createComponent('new');
      component.onReset();
      expect(snackbar.open).not.toHaveBeenCalled();
    });

    it('should restore entries from the loaded thesaurus and clear hasChanges', () => {
      createComponent('colors@en');
      component.entries.set([]);
      component.onChangesStateChange(true);

      component.onReset();

      expect(component.entries()).toEqual(makeThesaurus().entries);
      expect(component.hasChanges()).toBe(false);
      expect(snackbar.open).toHaveBeenCalled();
    });
  });

  describe('onClearChanges', () => {
    it('should clear hasChanges and notify without throwing', () => {
      createComponent('colors@en');
      component.onChangesStateChange(true);

      expect(() => component.onClearChanges()).not.toThrow();

      expect(component.hasChanges()).toBe(false);
      expect(snackbar.open).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should navigate to /thesauri when confirmed', () => {
      createComponent();
      component.cancel();
      expect(router.navigate).toHaveBeenCalledWith(['/thesauri']);
    });

    it('should not navigate when cancelled', () => {
      createComponent();
      dialogService.confirm.mockReturnValue(of(false));
      component.cancel();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should do nothing when userLevel is below 3', () => {
      createComponent();
      component.onChangesStateChange(true);
      component.save();
      expect(thesService.addThesaurus).not.toHaveBeenCalled();
    });

    it('should do nothing when there are no changes, even for a privileged user', () => {
      createComponent();
      component.userLevel.set(4);
      component.save();
      expect(thesService.addThesaurus).not.toHaveBeenCalled();
    });

    it('should do nothing when there is no loaded thesaurus (new)', () => {
      createComponent('new');
      component.userLevel.set(4);
      component.onChangesStateChange(true);
      component.save();
      expect(thesService.addThesaurus).not.toHaveBeenCalled();
    });

    it('should save, reset hasChanges, reload thesauri and navigate away on success', () => {
      createComponent('colors@en');
      component.userLevel.set(4);
      component.onChangesStateChange(true);

      component.save();

      expect(thesService.addThesaurus).toHaveBeenCalledTimes(1);
      const saved = thesService.addThesaurus.mock.calls[0][0] as Thesaurus;
      expect(saved.id).toBe('colors@en');
      expect(Array.isArray(saved.entries)).toBe(true);
      expect(component.hasChanges()).toBe(false);
      expect(appRepository.loadThesauri).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/thesauri']);
    });

    it('should show a snackbar and not navigate on save error', () => {
      createComponent('colors@en');
      component.userLevel.set(4);
      component.onChangesStateChange(true);
      thesService.addThesaurus.mockReturnValue(
        throwError(() => new Error('boom'))
      );
      router.navigate.mockClear();

      component.save();

      expect(snackbar.open).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
