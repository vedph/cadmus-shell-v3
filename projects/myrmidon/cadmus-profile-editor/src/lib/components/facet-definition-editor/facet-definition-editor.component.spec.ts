import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { FacetDefinition, PartDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings } from '@myrmidon/cadmus-api';

import { FacetDefinitionEditorComponent } from './facet-definition-editor.component';

function makeFacet(overrides?: Partial<FacetDefinition>): FacetDefinition {
  return {
    id: 'f1',
    label: 'Facet 1',
    colorKey: 'ff0000',
    description: 'desc',
    partDefinitions: [],
    ...overrides,
  };
}

function makePart(overrides?: Partial<PartDefinition>): PartDefinition {
  return { typeId: 'p1', name: 'Part 1', ...overrides };
}

describe('FacetDefinitionEditorComponent', () => {
  let component: FacetDefinitionEditorComponent;
  let fixture: ComponentFixture<FacetDefinitionEditorComponent>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [FacetDefinitionEditorComponent],
      providers: [{ provide: DialogService, useValue: dialogService }],
    }).compileComponents();

    fixture = TestBed.createComponent(FacetDefinitionEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('availablePartTypeIds', () => {
    it('should be empty when no facetModelSettings is provided', () => {
      expect(component.availablePartTypeIds()).toEqual([]);
    });

    it('should list the keys from the settings when provided', () => {
      const settings: FacetModelSettings = { parts: { p1: {}, p2: {} } };
      fixture.componentRef.setInput('facetModelSettings', settings);
      expect(component.availablePartTypeIds()).toEqual(['p1', 'p2']);
    });
  });

  describe('updateForm (via definition model)', () => {
    it('should populate the form and sort part definitions by sortKey', () => {
      fixture.componentRef.setInput(
        'definition',
        makeFacet({
          partDefinitions: [
            makePart({ typeId: 'b', sortKey: '02' }),
            makePart({ typeId: 'a', sortKey: '01' }),
          ],
        }),
      );
      fixture.detectChanges();

      expect(component.id.value).toBe('f1');
      expect(component.label.value).toBe('Facet 1');
      expect(component.colorKey.value).toBe('ff0000');
      expect(component.description.value).toBe('desc');
      expect(component.partDefinitions.value.map((p) => p.typeId)).toEqual([
        'a',
        'b',
      ]);
      expect(component.form.pristine).toBe(true);
    });

    it('should reset the form when the definition becomes undefined', () => {
      fixture.componentRef.setInput('definition', makeFacet());
      fixture.detectChanges();
      expect(component.id.value).toBe('f1');

      fixture.componentRef.setInput('definition', undefined);
      fixture.detectChanges();

      expect(component.id.value).toBe('');
    });
  });

  describe('part definition CRUD', () => {
    it('addPartDefinition should open a new blank part editor using the first available type', () => {
      const settings: FacetModelSettings = { parts: { p1: {}, p2: {} } };
      fixture.componentRef.setInput('facetModelSettings', settings);

      component.addPartDefinition();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toEqual({ typeId: 'p1', name: 'new' });
    });

    it('addPartDefinition should use an empty typeId when no settings are available', () => {
      component.addPartDefinition();
      expect(component.edited()).toEqual({ typeId: '', name: 'new' });
    });

    it('editPartDefinition should clone the entry and set editedIndex', () => {
      const part = makePart({ typeId: 'p1' });
      component.editPartDefinition(part, 2);
      expect(component.editedIndex()).toBe(2);
      expect(component.edited()).toEqual(part);
      expect(component.edited()).not.toBe(part);
    });

    it('closePartDefinition should clear edited state', () => {
      component.editPartDefinition(makePart(), 0);
      component.closePartDefinition();
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('savePartDefinition should append a new entry, assign sort keys and close the editor', () => {
      component.addPartDefinition();
      component.savePartDefinition(makePart({ typeId: 'p1' }));

      expect(component.partDefinitions.value).toEqual([
        expect.objectContaining({ typeId: 'p1', sortKey: '01' }),
      ]);
      expect(component.partDefinitions.dirty).toBe(true);
      expect(component.edited()).toBeUndefined();
    });

    it('savePartDefinition should replace the entry at editedIndex when editing', () => {
      component.partDefinitions.setValue([
        makePart({ typeId: 'a' }),
        makePart({ typeId: 'b' }),
      ]);
      component.editPartDefinition(component.partDefinitions.value[1], 1);

      component.savePartDefinition(makePart({ typeId: 'b2' }));

      expect(component.partDefinitions.value.map((p) => p.typeId)).toEqual([
        'a',
        'b2',
      ]);
    });

    it('deletePartDefinition should remove the entry after confirmation', () => {
      component.partDefinitions.setValue([
        makePart({ typeId: 'a' }),
        makePart({ typeId: 'b' }),
      ]);

      component.deletePartDefinition(0);

      expect(dialogService.confirm).toHaveBeenCalled();
      expect(component.partDefinitions.value.map((p) => p.typeId)).toEqual([
        'b',
      ]);
      expect(component.partDefinitions.dirty).toBe(true);
    });

    it('deletePartDefinition should do nothing when not confirmed', () => {
      dialogService.confirm.mockReturnValue(of(false));
      component.partDefinitions.setValue([makePart({ typeId: 'a' })]);

      component.deletePartDefinition(0);

      expect(component.partDefinitions.value.length).toBe(1);
    });

    it('deletePartDefinition should close the editor when deleting the currently edited entry', () => {
      component.partDefinitions.setValue([makePart({ typeId: 'a' })]);
      component.editPartDefinition(component.partDefinitions.value[0], 0);

      component.deletePartDefinition(0);

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    describe('movePartDefinitionUp', () => {
      it('should do nothing at index 0', () => {
        component.partDefinitions.setValue([
          makePart({ typeId: 'a' }),
          makePart({ typeId: 'b' }),
        ]);
        component.movePartDefinitionUp(0);
        expect(component.partDefinitions.value.map((p) => p.typeId)).toEqual([
          'a',
          'b',
        ]);
        expect(component.partDefinitions.dirty).toBe(false);
      });

      it('should swap the entry with its predecessor and re-key sort order', () => {
        component.partDefinitions.setValue([
          makePart({ typeId: 'a' }),
          makePart({ typeId: 'b' }),
        ]);
        component.movePartDefinitionUp(1);
        expect(component.partDefinitions.value.map((p) => p.typeId)).toEqual([
          'b',
          'a',
        ]);
        expect(component.partDefinitions.value[0].sortKey).toBe('01');
        expect(component.partDefinitions.value[1].sortKey).toBe('02');
      });

      it('should keep editedIndex tracking the moved entry', () => {
        component.partDefinitions.setValue([
          makePart({ typeId: 'a' }),
          makePart({ typeId: 'b' }),
        ]);
        component.editPartDefinition(component.partDefinitions.value[1], 1);
        component.movePartDefinitionUp(1);
        expect(component.editedIndex()).toBe(0);
      });
    });

    describe('movePartDefinitionDown', () => {
      it('should do nothing at the last index', () => {
        component.partDefinitions.setValue([makePart({ typeId: 'a' })]);
        component.movePartDefinitionDown(0);
        expect(component.partDefinitions.dirty).toBe(false);
      });

      it('should swap the entry with its successor', () => {
        component.partDefinitions.setValue([
          makePart({ typeId: 'a' }),
          makePart({ typeId: 'b' }),
        ]);
        component.movePartDefinitionDown(0);
        expect(component.partDefinitions.value.map((p) => p.typeId)).toEqual([
          'b',
          'a',
        ]);
      });

      it('should keep editedIndex tracking the moved entry', () => {
        component.partDefinitions.setValue([
          makePart({ typeId: 'a' }),
          makePart({ typeId: 'b' }),
        ]);
        component.editPartDefinition(component.partDefinitions.value[0], 0);
        component.movePartDefinitionDown(0);
        expect(component.editedIndex()).toBe(1);
      });
    });
  });

  describe('onColorPick', () => {
    it('should strip the leading # and mark the control dirty', () => {
      component.onColorPick('#aabbcc');
      expect(component.colorKey.value).toBe('aabbcc');
      expect(component.colorKey.dirty).toBe(true);
    });
  });

  describe('cancel', () => {
    it('should emit cancelEdit', () => {
      const spy = vi.fn();
      component.cancelEdit.subscribe(spy);
      component.cancel();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should mark all as touched and not update the model when the form is invalid', () => {
      component.save();
      expect(component.id.touched).toBe(true);
      expect(component.definition()).toBeUndefined();
    });

    it('should update the definition model with trimmed values when valid', () => {
      component.id.setValue('  f1  ');
      component.label.setValue('  Label  ');
      component.colorKey.setValue('aabbcc');
      component.description.setValue('  d  ');
      component.partDefinitions.setValue([makePart()]);

      component.save();

      expect(component.definition()).toEqual({
        id: 'f1',
        label: 'Label',
        colorKey: 'aabbcc',
        description: 'd',
        partDefinitions: [makePart()],
      });
      expect(component.form.pristine).toBe(true);
    });

    it('should keep the form dirty when pristine=false', () => {
      component.id.setValue('f1');
      component.label.setValue('Label');
      component.partDefinitions.setValue([makePart()]);
      component.form.markAsDirty();

      component.save(false);

      expect(component.form.pristine).toBe(false);
    });
  });
});
