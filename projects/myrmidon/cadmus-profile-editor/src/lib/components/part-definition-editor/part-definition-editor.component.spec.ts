import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings } from '@myrmidon/cadmus-api';

import { PartDefinitionEditorComponent } from './part-definition-editor.component';

function makeSettings(): FacetModelSettings {
  return {
    parts: {
      base_text: { baseText: true },
      note: { baseText: false },
    },
    fragments: {
      comment: {},
      orthography: {},
    },
  };
}

function makePartDefinition(
  overrides?: Partial<PartDefinition>,
): PartDefinition {
  return {
    typeId: 'note',
    name: 'Note',
    ...overrides,
  };
}

describe('PartDefinitionEditorComponent', () => {
  let component: PartDefinitionEditorComponent;
  let fixture: ComponentFixture<PartDefinitionEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartDefinitionEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PartDefinitionEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('availablePartTypeIds / availableFragmentIds', () => {
    it('should be empty when no facetModelSettings is provided', () => {
      expect(component.availablePartTypeIds()).toEqual([]);
      expect(component.availableFragmentIds()).toEqual([]);
    });

    it('should list the keys from the settings when provided', () => {
      fixture.componentRef.setInput('facetModelSettings', makeSettings());
      expect(component.availablePartTypeIds()).toEqual(['base_text', 'note']);
      expect(component.availableFragmentIds()).toEqual(['comment', 'orthography']);
    });
  });

  describe('isBaseTextPart', () => {
    it('should be false when no settings are provided', () => {
      expect(component.isBaseTextPart()).toBe(false);
    });

    it('should be true when the current typeId is a base text part', () => {
      fixture.componentRef.setInput('facetModelSettings', makeSettings());
      component.typeId.setValue('base_text');
      expect(component.isBaseTextPart()).toBe(true);
    });

    it('should be false when the current typeId is not a base text part', () => {
      fixture.componentRef.setInput('facetModelSettings', makeSettings());
      component.typeId.setValue('note');
      expect(component.isBaseTextPart()).toBe(false);
    });
  });

  describe('updateForm (via definition model)', () => {
    it('should populate the form from the given definition', () => {
      fixture.componentRef.setInput(
        'definition',
        makePartDefinition({
          roleId: 'r1',
          isRequired: true,
          description: 'd',
          colorKey: 'aabbcc',
          groupKey: 'g',
          sortKey: '01',
        }),
      );
      fixture.detectChanges();

      expect(component.typeId.value).toBe('note');
      expect(component.roleId.value).toBe('r1');
      expect(component.name.value).toBe('Note');
      expect(component.required.value).toBe(true);
      expect(component.description.value).toBe('d');
      expect(component.colorKey.value).toBe('aabbcc');
      expect(component.groupKey.value).toBe('g');
      expect(component.sortKey.value).toBe('01');
      expect(component.form.pristine).toBe(true);
    });

    it('should reset the form when the definition becomes undefined', () => {
      fixture.componentRef.setInput('definition', makePartDefinition());
      fixture.detectChanges();
      expect(component.typeId.value).toBe('note');

      fixture.componentRef.setInput('definition', undefined);
      fixture.detectChanges();

      expect(component.typeId.value).toBe('');
      expect(component.name.value).toBe('');
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
      const spy = vi.fn();
      // definition is a model(); subscribe via effect not directly possible,
      // assert via reading the signal after save() instead
      component.save();
      expect(component.typeId.touched).toBe(true);
      expect(component.definition()).toBeUndefined();
    });

    it('should update the definition model with trimmed values when valid', () => {
      component.typeId.setValue('  note  ');
      component.name.setValue('  Note  ');
      component.roleId.setValue('  r1  ');
      component.description.setValue('  d  ');
      component.colorKey.setValue('aabbcc');
      component.groupKey.setValue('  g  ');
      component.sortKey.setValue('  01  ');

      component.save();

      expect(component.definition()).toEqual({
        typeId: 'note',
        roleId: 'r1',
        name: 'Note',
        isRequired: false,
        description: 'd',
        colorKey: 'aabbcc',
        groupKey: 'g',
        sortKey: '01',
      });
      expect(component.form.pristine).toBe(true);
    });

    it('should keep the form dirty when pristine=false', () => {
      component.typeId.setValue('note');
      component.name.setValue('Note');
      component.form.markAsDirty();

      component.save(false);

      expect(component.form.pristine).toBe(false);
    });

    it('should map empty optional strings to undefined', () => {
      component.typeId.setValue('note');
      component.name.setValue('Note');

      component.save();

      const data = component.definition()!;
      expect(data.roleId).toBeUndefined();
      expect(data.description).toBeUndefined();
      expect(data.colorKey).toBeUndefined();
      expect(data.groupKey).toBeUndefined();
      expect(data.sortKey).toBeUndefined();
    });
  });
});
