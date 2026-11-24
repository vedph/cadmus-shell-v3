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
    deleteFacet: ReturnType<typeof vi.fn>;
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
      deleteFacet: vi.fn().mockReturnValue(of(undefined)),
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
    it('addFacet should open a blank editor with a valid color', () => {
      component.addFacet();
      expect(component.editedKey()).toBe(0);
      expect(component.edited()).toEqual({
        id: 'new',
        label: 'New facet',
        colorKey: 'C0C0C0',
        description: '',
        partDefinitions: [],
      });
    });

    it('editFacet should clone the facet and set editedKey', () => {
      const entry = component.entries()[0];
      component.editFacet(entry);
      expect(component.editedKey()).toBe(entry.key);
      expect(component.edited()).toEqual(entry.facet);
      expect(component.edited()).not.toBe(entry.facet);
    });

    it('closeFacet should clear edited state', () => {
      component.editFacet(component.entries()[0]);
      component.closeFacet();
      expect(component.editedKey()).toBeUndefined();
      expect(component.edited()).toBeUndefined();
    });

    it('a freshly loaded list is not dirty', () => {
      expect(component.dirty()).toBe(false);
      expect(component.getStatus(component.entries()[0])).toBe('saved');
    });

    it('saveFacet should append a new facet and mark dirty', () => {
      const dirtySpy = vi.fn();
      component.dirtyChange.subscribe(dirtySpy);
      component.addFacet();

      component.saveFacet(makeFacet({ id: 'f2', label: 'Facet 2' }));
      fixture.detectChanges();

      expect(component.facets().map((f) => f.id)).toEqual(['f1', 'f2']);
      expect(component.dirty()).toBe(true);
      expect(component.getStatus(component.entries()[1])).toBe('new');
      expect(dirtySpy).toHaveBeenCalledWith(true);
      expect(component.edited()).toBeUndefined();
    });

    it('saveFacet should replace the edited entry', () => {
      component.editFacet(component.entries()[0]);
      component.saveFacet(makeFacet({ label: 'changed' }));
      expect(component.facets().map((f) => f.label)).toEqual(['changed']);
      expect(component.getStatus(component.entries()[0])).toBe('modified');
    });

    it('saving back an unchanged facet should leave the list clean', () => {
      component.editFacet(component.entries()[0]);
      component.saveFacet(makeFacet());
      expect(component.dirty()).toBe(false);
    });

    it('changing the ID should mark the facet as renamed and the old ID for deletion', () => {
      component.editFacet(component.entries()[0]);
      component.saveFacet(makeFacet({ id: 'f1b' }));
      expect(component.getStatus(component.entries()[0])).toBe('renamed');
      expect(component.changes().deletions).toEqual(['f1']);
      expect(component.changes().renames).toEqual([{ from: 'f1', to: 'f1b' }]);
    });

    it('deleteFacet should remove the entry and schedule its deletion', () => {
      const dirtySpy = vi.fn();
      component.dirtyChange.subscribe(dirtySpy);

      component.deleteFacet(component.entries()[0]);
      fixture.detectChanges();

      expect(dialogService.confirm).toHaveBeenCalled();
      expect(dialogService.confirm.mock.calls[0][1]).toContain('Facet 1');
      expect(component.facets()).toEqual([]);
      expect(component.changes().deletions).toEqual(['f1']);
      expect(component.dirty()).toBe(true);
      expect(dirtySpy).toHaveBeenCalledWith(true);
    });

    it('deleting a new facet should not schedule any server deletion', () => {
      component.addFacet();
      component.saveFacet(makeFacet({ id: 'f2' }));
      component.deleteFacet(component.entries()[1]);
      expect(component.dirty()).toBe(false);
    });

    it('deleteFacet should do nothing when not confirmed', () => {
      dialogService.confirm.mockReturnValue(of(false));
      component.deleteFacet(component.entries()[0]);
      expect(component.facets().length).toBe(1);
    });

    it('deleteFacet should close the editor when deleting the edited entry', () => {
      component.editFacet(component.entries()[0]);
      component.deleteFacet(component.entries()[0]);
      expect(component.editedKey()).toBeUndefined();
      expect(component.edited()).toBeUndefined();
    });

    it('deleteFacet should keep editing another entry', async () => {
      await configure([
        makeFacet({ id: 'a', label: 'A' }),
        makeFacet({ id: 'b', label: 'B' }),
      ]);
      const b = component.entries()[1];
      component.editFacet(b);
      component.deleteFacet(component.entries()[0]);
      component.saveFacet(makeFacet({ id: 'b', label: 'B2' }));
      expect(component.facets().map((f) => f.label)).toEqual(['B2']);
    });

    it('discardChanges should reload the facets from the server', () => {
      component.deleteFacet(component.entries()[0]);
      component.discardChanges();
      expect(facetService.getFacets).toHaveBeenCalledTimes(2);
      expect(component.facets()).toEqual([makeFacet()]);
      expect(component.dirty()).toBe(false);
    });
  });

  describe('validate', () => {
    it('should call the validator and set validationResult', () => {
      const result = makeValidationResult({
        hasWarnings: true,
        issues: [{ severity: 'warning', message: 'm' }],
      });
      validator.validate.mockReturnValue(of(result));

      component.validate();

      expect(validator.validate).toHaveBeenCalledWith(
        component.facets(),
        component.facetModelSettings(),
      );
      expect(component.validationResult()).toEqual(result);
      expect(component.validationResultHasIssues()).toBe(true);
      expect(component.validationCounts()).toEqual({
        error: 0,
        warning: 1,
        info: 0,
      });
    });
  });

  describe('reloadApp / close', () => {
    it('reloadApp should navigate to the base URI', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { href: 'http://old/' };

      component.reloadApp();

      expect(window.location.href).toBe(document.baseURI || '/');
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
      const anchor = { click: clickSpy } as any;
      const createSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(anchor);
      const urlSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:x');

      component.downloadFacets();

      expect(createSpy).toHaveBeenCalledWith('a');
      expect(anchor.download).toBe('facets.json');
      expect(anchor.href).toBe('blob:x');
      expect(clickSpy).toHaveBeenCalled();
      createSpy.mockRestore();
      urlSpy.mockRestore();
    });
  });

  describe('save', () => {
    /** Make the list dirty by changing the label of the first facet. */
    function change(id = 'f1', label = 'changed'): void {
      const entry = component.entries().find((e) => e.facet.id === id)!;
      component.editFacet(entry);
      component.saveFacet({ ...entry.facet, label });
    }

    it('should do nothing when there are no changes', () => {
      component.save();
      expect(validator.validate).not.toHaveBeenCalled();
    });

    it('should do nothing while a facet is being edited', () => {
      change();
      component.editFacet(component.entries()[0]);
      component.save();
      expect(validator.validate).not.toHaveBeenCalled();
    });

    it('should do nothing when loading failed', async () => {
      await configure();
      facetService.getFacets.mockReturnValue(throwError(() => new Error('x')));
      component.discardChanges();
      expect(component.loadFailed()).toBe(true);
      component.save();
      expect(validator.validate).not.toHaveBeenCalled();
    });

    it('should block saving and not prompt when validation has errors', () => {
      change();
      validator.validate.mockReturnValue(
        of(makeValidationResult({ hasErrors: true })),
      );

      component.save();

      expect(dialogService.confirm).not.toHaveBeenCalled();
      expect(facetService.addFacet).not.toHaveBeenCalled();
    });

    it('should ask for confirmation on warnings, then confirm-and-save when accepted', () => {
      change();
      validator.validate.mockReturnValue(
        of(
          makeValidationResult({
            hasWarnings: true,
            issues: [{ severity: 'warning', message: 'w' }],
          }),
        ),
      );

      component.save();

      expect(dialogService.confirm).toHaveBeenCalledTimes(2);
      expect(facetService.addFacet).toHaveBeenCalledWith(component.facets()[0]);
    });

    it('should not save when the warnings confirmation is declined', () => {
      change();
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

    it('should not save when the final confirmation is declined', () => {
      change();
      dialogService.confirm.mockReturnValue(of(false));
      component.save();
      expect(facetService.addFacet).not.toHaveBeenCalled();
    });

    it('should send only the changed facets, then mark them saved', async () => {
      await configure([
        makeFacet({ id: 'a', label: 'A' }),
        makeFacet({ id: 'b', label: 'B' }),
      ]);
      change('b', 'B2');

      component.save();

      expect(facetService.addFacet).toHaveBeenCalledTimes(1);
      expect(facetService.addFacet.mock.calls[0][0].id).toBe('b');
      expect(facetService.deleteFacet).not.toHaveBeenCalled();
      expect(component.dirty()).toBe(false);
      expect(component.reloadNeeded()).toBe(true);
      expect(component.saveResult()).toEqual({
        saved: ['b'],
        deleted: [],
        failed: [],
        skipped: [],
      });
    });

    it('should delete the facets removed from the list', async () => {
      await configure([
        makeFacet({ id: 'a', label: 'A' }),
        makeFacet({ id: 'b', label: 'B' }),
      ]);
      component.deleteFacet(component.entries()[0]);
      dialogService.confirm.mockClear();

      component.save();

      expect(dialogService.confirm.mock.calls[0][1]).toContain('Delete: a.');
      expect(facetService.addFacet).not.toHaveBeenCalled();
      expect(facetService.deleteFacet).toHaveBeenCalledWith('a');
      expect(component.dirty()).toBe(false);
      expect(component.saveResult()?.deleted).toEqual(['a']);
    });

    it('should save a renamed facet before deleting its old ID', () => {
      const calls: string[] = [];
      facetService.addFacet.mockImplementation((f: FacetDefinition) => {
        calls.push('add ' + f.id);
        return of({});
      });
      facetService.deleteFacet.mockImplementation((id: string) => {
        calls.push('delete ' + id);
        return of(undefined);
      });
      component.editFacet(component.entries()[0]);
      component.saveFacet(makeFacet({ id: 'f1b' }));
      dialogService.confirm.mockClear();

      component.save();

      expect(dialogService.confirm.mock.calls[0][1]).toContain('Rename: f1 → f1b');
      expect(calls).toEqual(['add f1b', 'delete f1']);
      expect(component.dirty()).toBe(false);
      expect(component.getStatus(component.entries()[0])).toBe('saved');
    });

    it('should not delete anything when some facet fails to save', async () => {
      await configure([
        makeFacet({ id: 'ok', label: 'OK' }),
        makeFacet({ id: 'bad', label: 'BAD' }),
        makeFacet({ id: 'gone', label: 'GONE' }),
      ]);
      change('ok', 'OK2');
      change('bad', 'BAD2');
      component.deleteFacet(component.entries()[2]);
      facetService.addFacet.mockImplementation((f: FacetDefinition) =>
        f.id === 'ok' ? of({}) : throwError(() => new Error('fail')),
      );

      component.save();

      expect(facetService.deleteFacet).not.toHaveBeenCalled();
      expect(component.busy()).toBe(false);
      expect(component.reloadNeeded()).toBe(true);
      expect(component.saveResult()).toEqual({
        saved: ['ok'],
        deleted: [],
        failed: ['bad'],
        skipped: ['gone'],
      });
      // the failed facet and the deletion are still pending
      expect(component.changes().upserts.map((f) => f.id)).toEqual(['bad']);
      expect(component.changes().deletions).toEqual(['gone']);
    });

    it('should not set reloadNeeded when every change fails', () => {
      change();
      facetService.addFacet.mockReturnValue(
        throwError(() => new Error('fail')),
      );

      component.save();

      expect(component.reloadNeeded()).toBe(false);
      expect(component.dirty()).toBe(true);
      expect(component.saveResult()?.failed).toEqual(['f1']);
    });

    it('should report a failed deletion and keep it pending', () => {
      component.deleteFacet(component.entries()[0]);
      facetService.deleteFacet.mockReturnValue(
        throwError(() => new Error('fail')),
      );

      component.save();

      expect(component.saveResult()?.failed).toEqual(['f1']);
      expect(component.changes().deletions).toEqual(['f1']);
    });
  });
});
