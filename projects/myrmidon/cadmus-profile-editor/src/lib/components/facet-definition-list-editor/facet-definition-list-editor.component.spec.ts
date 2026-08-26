import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { FacetDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings, FacetService } from '@myrmidon/cadmus-api';

import { FacetDefinitionListEditorComponent } from './facet-definition-list-editor.component';
import {
  FacetDefinitionValidatorService,
  FacetValidationResult,
} from '../../services/facet-definition-validator.service';

function makeFacet(overrides?: Partial<FacetDefinition>): FacetDefinition {
  return {
    id: 'f1',
    label: 'Facet 1',
    colorKey: 'ff0000',
    description: 'desc',
    partDefinitions: [{ typeId: 'p1', name: 'Part 1' }],
    ...overrides,
  };
}

function makeValidationResult(
  overrides?: Partial<FacetValidationResult>,
): FacetValidationResult {
  return {
    issues: [],
    hasErrors: false,
    hasWarnings: false,
    hasInfos: false,
    ...overrides,
  };
}

describe('FacetDefinitionListEditorComponent', () => {
  let component: FacetDefinitionListEditorComponent;
  let fixture: ComponentFixture<FacetDefinitionListEditorComponent>;
  let facetService: {
    getFacets: ReturnType<typeof vi.fn>;
    getFacetModelSettings: ReturnType<typeof vi.fn>;
    addFacet: ReturnType<typeof vi.fn>;
  };
  let validator: { validate: ReturnType<typeof vi.fn> };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  async function configure(facets: FacetDefinition[] = [makeFacet()]) {
    TestBed.resetTestingModule();
    facetService = {
      getFacets: vi.fn().mockReturnValue(of(facets)),
      getFacetModelSettings: vi
        .fn()
        .mockReturnValue(of({ parts: {} } as FacetModelSettings)),
      addFacet: vi.fn().mockReturnValue(of({})),
    };
    validator = {
      validate: vi.fn().mockReturnValue(of(makeValidationResult())),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [FacetDefinitionListEditorComponent],
      providers: [
        { provide: FacetService, useValue: facetService },
        { provide: FacetDefinitionValidatorService, useValue: validator },
        { provide: DialogService, useValue: dialogService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FacetDefinitionListEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load facets and settings on init', () => {
      expect(component.facets()).toEqual([makeFacet()]);
      expect(component.facetModelSettings()).toEqual({ parts: {} });
      expect(component.busy()).toBe(false);
    });

    it('should show an error and clear busy when loading facets fails', async () => {
      await configure();
      facetService.getFacets.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [FacetDefinitionListEditorComponent],
        providers: [
          { provide: FacetService, useValue: facetService },
          { provide: FacetDefinitionValidatorService, useValue: validator },
          { provide: DialogService, useValue: dialogService },
          { provide: MatSnackBar, useValue: snackBar },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(FacetDefinitionListEditorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.busy()).toBe(false);
      expect(snackBar.open).toHaveBeenCalledWith('Error loading facets', 'Close');
    });

    it('should show an error when loading facet model settings fails', async () => {
      facetService.getFacetModelSettings.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [FacetDefinitionListEditorComponent],
        providers: [
          { provide: FacetService, useValue: facetService },
          { provide: FacetDefinitionValidatorService, useValue: validator },
          { provide: DialogService, useValue: dialogService },
          { provide: MatSnackBar, useValue: snackBar },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(FacetDefinitionListEditorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(snackBar.open).toHaveBeenCalledWith(
        'Error loading facet model settings',
        'Close',
      );
    });
  });

  describe('facet CRUD', () => {
    it('addFacet should open a blank editor', () => {
      component.addFacet();
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toEqual({
        id: 'new',
        label: 'New facet',
        colorKey: 'default',
        description: '',
        partDefinitions: [],
      });
    });

    it('editFacet should clone the facet and set editedIndex', () => {
      const facet = makeFacet();
      component.editFacet(facet, 0);
      expect(component.editedIndex()).toBe(0);
      expect(component.edited()).toEqual(facet);
      expect(component.edited()).not.toBe(facet);
    });

    it('closeFacet should clear edited state', () => {
      component.editFacet(makeFacet(), 0);
      component.closeFacet();
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('saveFacet should append a new facet and mark dirty', () => {
      component.addFacet();
      const dirtySpy = vi.fn();
      component.dirtyChange.subscribe(dirtySpy);

      component.saveFacet(makeFacet({ id: 'f2' }));

      expect(component.facets().map((f) => f.id)).toEqual(['f1', 'f2']);
      expect(component.dirty()).toBe(true);
      expect(dirtySpy).toHaveBeenCalledWith(true);
      expect(component.edited()).toBeUndefined();
    });

    it('saveFacet should replace the entry at editedIndex when editing', () => {
      component.editFacet(component.facets()[0], 0);
      component.saveFacet(makeFacet({ id: 'f1-edited' }));
      expect(component.facets().map((f) => f.id)).toEqual(['f1-edited']);
    });

    it('deleteFacet should remove the entry after confirmation', () => {
      const dirtySpy = vi.fn();
      component.dirtyChange.subscribe(dirtySpy);

      component.deleteFacet(0);

      expect(dialogService.confirm).toHaveBeenCalled();
      expect(component.facets()).toEqual([]);
      expect(component.dirty()).toBe(true);
      expect(dirtySpy).toHaveBeenCalledWith(true);
    });

    it('deleteFacet should do nothing when not confirmed', () => {
      dialogService.confirm.mockReturnValue(of(false));
      component.deleteFacet(0);
      expect(component.facets().length).toBe(1);
    });

    it('deleteFacet should close the editor when deleting the currently edited entry', () => {
      component.editFacet(component.facets()[0], 0);
      component.deleteFacet(0);
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    describe('moveFacetUp / moveFacetDown', () => {
      beforeEach(async () => {
        await configure([makeFacet({ id: 'a' }), makeFacet({ id: 'b' })]);
      });

      it('moveFacetUp should do nothing at index 0', () => {
        component.moveFacetUp(0);
        expect(component.facets().map((f) => f.id)).toEqual(['a', 'b']);
        expect(component.dirty()).toBe(false);
      });

      it('moveFacetUp should swap with the predecessor and track editedIndex', () => {
        component.editFacet(component.facets()[1], 1);
        component.moveFacetUp(1);
        expect(component.facets().map((f) => f.id)).toEqual(['b', 'a']);
        expect(component.editedIndex()).toBe(0);
        expect(component.dirty()).toBe(true);
      });

      it('moveFacetDown should do nothing at the last index', () => {
        component.moveFacetDown(1);
        expect(component.facets().map((f) => f.id)).toEqual(['a', 'b']);
        expect(component.dirty()).toBe(false);
      });

      it('moveFacetDown should swap with the successor and track editedIndex', () => {
        component.editFacet(component.facets()[0], 0);
        component.moveFacetDown(0);
        expect(component.facets().map((f) => f.id)).toEqual(['b', 'a']);
        expect(component.editedIndex()).toBe(1);
      });
    });
  });

  describe('validate', () => {
    it('should call the validator and set validationResult', () => {
      const result = makeValidationResult({ hasWarnings: true, issues: [{ severity: 'warning', message: 'm' }] });
      validator.validate.mockReturnValue(of(result));

      component.validate();

      expect(validator.validate).toHaveBeenCalledWith(
        component.facets(),
        component.facetModelSettings(),
      );
      expect(component.validationResult()).toEqual(result);
      expect(component.validationResultHasIssues()).toBe(true);
    });
  });

  describe('reloadApp / close', () => {
    it('reloadApp should set window.location.href to root', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { href: 'http://old/' };

      component.reloadApp();

      expect(window.location.href).toBe('/');
      (window as any).location = originalLocation;
    });

    it('close should emit editorClose', () => {
      const spy = vi.fn();
      component.editorClose.subscribe(spy);
      component.close();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('downloadFacets', () => {
    it('should trigger a download of the current facets as JSON', () => {
      const clickSpy = vi.fn();
      const anchor = { setAttribute: vi.fn(), click: clickSpy } as any;
      const createSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(anchor);

      component.downloadFacets();

      expect(createSpy).toHaveBeenCalledWith('a');
      expect(anchor.setAttribute).toHaveBeenCalledWith(
        'download',
        'facets.json',
      );
      expect(clickSpy).toHaveBeenCalled();
      createSpy.mockRestore();
    });
  });

  describe('save', () => {
    it('should do nothing when there are no facets', async () => {
      await configure([]);
      component.save();
      expect(validator.validate).not.toHaveBeenCalled();
    });

    it('should block saving and not prompt when validation has errors', () => {
      validator.validate.mockReturnValue(
        of(makeValidationResult({ hasErrors: true })),
      );

      component.save();

      expect(dialogService.confirm).not.toHaveBeenCalled();
      expect(facetService.addFacet).not.toHaveBeenCalled();
    });

    it('should ask for confirmation on warnings, then confirm-and-save when accepted', () => {
      validator.validate.mockReturnValue(
        of(
          makeValidationResult({
            hasWarnings: true,
            issues: [{ severity: 'warning', message: 'w' }],
          }),
        ),
      );
      // first confirm() call is the warnings dialog, second is the final gate
      dialogService.confirm.mockReturnValue(of(true));

      component.save();

      expect(dialogService.confirm).toHaveBeenCalledTimes(2);
      expect(facetService.addFacet).toHaveBeenCalledWith(component.facets()[0]);
    });

    it('should not save when the warnings confirmation is declined', () => {
      validator.validate.mockReturnValue(
        of(
          makeValidationResult({
            hasWarnings: true,
            issues: [{ severity: 'warning', message: 'w' }],
          }),
        ),
      );
      dialogService.confirm.mockReturnValue(of(false));

      component.save();

      expect(dialogService.confirm).toHaveBeenCalledTimes(1);
      expect(facetService.addFacet).not.toHaveBeenCalled();
    });

    it('should go straight to the final confirmation when there are no warnings or errors', () => {
      component.save();

      expect(dialogService.confirm).toHaveBeenCalledTimes(1);
      expect(facetService.addFacet).toHaveBeenCalled();
    });

    it('should not save when the final confirmation is declined', () => {
      dialogService.confirm.mockReturnValue(of(false));

      component.save();

      expect(facetService.addFacet).not.toHaveBeenCalled();
    });

    it('should record saved and failed facets and set reloadNeeded/dirty accordingly', async () => {
      await configure([makeFacet({ id: 'ok' }), makeFacet({ id: 'bad' })]);
      facetService.addFacet.mockImplementation((f: FacetDefinition) =>
        f.id === 'ok' ? of({}) : throwError(() => new Error('fail')),
      );

      component.save();

      expect(component.busy()).toBe(false);
      expect(component.reloadNeeded()).toBe(true);
      expect(component.dirty()).toBe(true);
      expect(component.saveResult()).toBe('Saved: ok | Failed: bad');
    });

    it('should not set reloadNeeded when every facet fails to save', async () => {
      await configure([makeFacet({ id: 'bad' })]);
      facetService.addFacet.mockReturnValue(throwError(() => new Error('fail')));

      component.save();

      expect(component.reloadNeeded()).toBe(false);
      expect(component.dirty()).toBe(true);
      expect(component.saveResult()).toBe('Failed: bad');
    });
  });
});
