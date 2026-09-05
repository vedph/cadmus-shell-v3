import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ColorService } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { FacetService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';
import { FacetDefinition, Part } from '@myrmidon/cadmus-core';

import { EditedItemRepository } from '../state/edited-item.repository';
import {
  PartsScopeEditorComponent,
  PartScopeSetRequest,
} from './parts-scope-editor.component';

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

describe('PartsScopeEditorComponent', () => {
  let component: PartsScopeEditorComponent;
  let fixture: ComponentFixture<PartsScopeEditorComponent>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let appRepository: {
    load: ReturnType<typeof vi.fn>;
    getTypeThesaurus: ReturnType<typeof vi.fn>;
  };
  let facetService: { getPartColor: ReturnType<typeof vi.fn> };
  let editedItemRepository: { getFacet: ReturnType<typeof vi.fn> };
  let colorService: { getContrastColor: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    appRepository = {
      load: vi.fn().mockResolvedValue(undefined),
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
    };
    facetService = { getPartColor: vi.fn().mockReturnValue('#00ff00') };
    editedItemRepository = { getFacet: vi.fn().mockReturnValue(undefined) };
    colorService = { getContrastColor: vi.fn().mockReturnValue('black') };

    await TestBed.configureTestingModule({
      imports: [PartsScopeEditorComponent],
      providers: [
        { provide: DialogService, useValue: dialogService },
        { provide: FacetService, useValue: facetService },
        { provide: AppRepository, useValue: appRepository },
        { provide: EditedItemRepository, useValue: editedItemRepository },
        { provide: ColorService, useValue: colorService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PartsScopeEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load app data', () => {
    expect(component).toBeTruthy();
    expect(appRepository.load).toHaveBeenCalled();
  });

  it('should build one check control per part', () => {
    fixture.componentRef.setInput('parts', [
      makePart(),
      makePart({ id: 'p2' }),
    ]);
    fixture.detectChanges();
    expect(component.checks.length).toBe(2);
  });

  it('should clear the checks when parts becomes empty', () => {
    fixture.componentRef.setInput('parts', [makePart()]);
    fixture.detectChanges();
    fixture.componentRef.setInput('parts', []);
    fixture.detectChanges();
    expect(component.checks.length).toBe(0);
  });

  describe('submit', () => {
    it('should not emit when the form is invalid (nothing checked)', () => {
      fixture.componentRef.setInput('parts', [makePart()]);
      fixture.detectChanges();
      const spy = vi.fn();
      component.setScopeRequest.subscribe(spy);

      component.submit();

      expect(spy).not.toHaveBeenCalled();
      expect(dialogService.confirm).not.toHaveBeenCalled();
    });

    it('should confirm and emit the checked part IDs with the scope', () => {
      const parts = [makePart({ id: 'p1' }), makePart({ id: 'p2' })];
      fixture.componentRef.setInput('parts', parts);
      fixture.detectChanges();
      component.checks.at(0).setValue(true);
      component.scope.setValue('myscope');

      const spy = vi.fn();
      component.setScopeRequest.subscribe(spy);
      component.submit();

      expect(dialogService.confirm).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith({
        ids: ['p1'],
        scope: 'myscope',
      } as PartScopeSetRequest);
    });

    it('should not emit when the user cancels the confirmation', () => {
      dialogService.confirm.mockReturnValue(of(false));
      fixture.componentRef.setInput('parts', [makePart()]);
      fixture.detectChanges();
      component.checks.at(0).setValue(true);

      const spy = vi.fn();
      component.setScopeRequest.subscribe(spy);
      component.submit();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getPartColor / getContrastColor', () => {
    it('should delegate to FacetService and ColorService', () => {
      const facet = {} as FacetDefinition;
      editedItemRepository.getFacet.mockReturnValue(facet);

      const color = component.getPartColor('it.vedph.note', 'r1');
      expect(color).toBe('#00ff00');
      expect(facetService.getPartColor).toHaveBeenCalledWith(
        'it.vedph.note',
        'r1',
        facet,
      );

      const contrast = component.getContrastColor('it.vedph.note', 'r1');
      expect(contrast).toBe('black');
      expect(colorService.getContrastColor).toHaveBeenCalledWith('#00ff00');
    });
  });

  describe('getTypeIdName / getRoleIdName', () => {
    it('should return the raw typeId when there is no thesaurus', () => {
      expect(component.getTypeIdName('it.vedph.note')).toBe('it.vedph.note');
    });

    it('should resolve the name from the thesaurus, stripping :suffix', () => {
      appRepository.getTypeThesaurus.mockReturnValue({
        id: 'model-types@en',
        entries: [{ id: 'it.vedph.note', value: 'Note' }],
      });
      expect(component.getTypeIdName('it.vedph.note:extra')).toBe('Note');
    });

    it('should resolve a fragment roleId through getTypeIdName', () => {
      appRepository.getTypeThesaurus.mockReturnValue({
        id: 'model-types@en',
        entries: [{ id: 'fr.it.vedph.comment', value: 'Comment' }],
      });
      expect(component.getRoleIdName('fr.it.vedph.comment')).toBe('Comment');
    });

    it('should return non-fr roleId as-is', () => {
      expect(component.getRoleIdName('plain')).toBe('plain');
    });
  });
});
