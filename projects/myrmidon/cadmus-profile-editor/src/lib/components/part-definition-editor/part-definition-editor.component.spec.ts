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
      component.form.typeId().value.set('base_text');
      expect(component.isBaseTextPart()).toBe(true);
    });

    it('should be false when the current typeId is not a base text part', () => {
      fixture.componentRef.setInput('facetModelSettings', makeSettings());
      component.form.typeId().value.set('note');
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

      expect(component.form.typeId().value()).toBe('note');
      expect(component.form.roleId().value()).toBe('r1');
      expect(component.form.name().value()).toBe('Note');
      expect(component.form.required().value()).toBe(true);
      expect(component.form.description().value()).toBe('d');
      expect(component.form.colorKey().value()).toBe('aabbcc');
      expect(component.form.groupKey().value()).toBe('g');
      expect(component.form.sortKey().value()).toBe('01');
      expect(component.form().dirty()).toBe(false);
    });

    it('should reset the form when the definition becomes undefined', () => {
      fixture.componentRef.setInput('definition', makePartDefinition());
      fixture.detectChanges();
      expect(component.form.typeId().value()).toBe('note');

      fixture.componentRef.setInput('definition', undefined);
      fixture.detectChanges();

      expect(component.form.typeId().value()).toBe('');
      expect(component.form.name().value()).toBe('');
    });
  });

  describe('onColorPick', () => {
    it('should strip the leading # and mark the control dirty', () => {
      component.onColorPick('#aabbcc');
      expect(component.form.colorKey().value()).toBe('aabbcc');
      expect(component.form.colorKey().dirty()).toBe(true);
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
      expect(component.form.typeId().touched()).toBe(true);
      expect(component.definition()).toBeUndefined();
    });

    it('should update the definition model with trimmed values when valid', () => {
      component.form.typeId().value.set('  note  ');
      component.form.name().value.set('  Note  ');
      component.form.roleId().value.set('  r1  ');
      component.form.description().value.set('  d  ');
      component.form.colorKey().value.set('aabbcc');
      component.form.groupKey().value.set('  g  ');
      component.form.sortKey().value.set('  01  ');

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
      expect(component.form().dirty()).toBe(false);
    });

    it('should keep the form dirty when pristine=false', () => {
      component.form.typeId().value.set('note');
      component.form.name().value.set('Note');
      component.form().markAsDirty();

      component.save(false);

      expect(component.form().dirty()).toBe(true);
    });

    it('should map empty optional strings to undefined', () => {
      component.form.typeId().value.set('note');
      component.form.name().value.set('Note');

      component.save();

      const data = component.definition()!;
      expect(data.roleId).toBeUndefined();
      expect(data.description).toBeUndefined();
      expect(data.colorKey).toBeUndefined();
      expect(data.groupKey).toBeUndefined();
      expect(data.sortKey).toBeUndefined();
    });
  });

  describe('signal form', () => {
    it('accepts an empty color key, rejects a malformed one', () => {
      component.form.colorKey().value.set('');
      expect(component.form.colorKey().valid()).toBe(true);
      component.form.colorKey().value.set('zz');
      expect(component.form.colorKey().getError('pattern')).toBeTruthy();
    });

    it('keeps the typed text when its own save echoes back normalized', () => {
      fixture.componentRef.setInput('definition', makePartDefinition());
      fixture.detectChanges();
      component.form.name().value.set('abc ');
      component.save(false);
      fixture.detectChanges();

      expect(component.definition()?.name).toBe('abc');
      expect(component.form.name().value()).toBe('abc ');
    });

    it('rebuilds the draft and clears dirty when a new definition is bound', () => {
      fixture.componentRef.setInput('definition', makePartDefinition());
      fixture.detectChanges();
      component.form.name().value.set('edited');
      component.form.name().markAsDirty();
      fixture.componentRef.setInput(
        'definition',
        makePartDefinition({ name: 'Other' })
      );
      fixture.detectChanges();

      expect(component.form.name().value()).toBe('Other');
      expect(component.form().dirty()).toBe(false);
    });

    it('renders no <form>; save is a type=button click, disabled while pristine', () => {
      fixture.componentRef.setInput('definition', makePartDefinition());
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const save: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[mattooltip="Accept changes"]'
      );
      expect(save.type).toBe('button');
      expect(save.disabled).toBe(true);

      const name: HTMLInputElement = Array.from<HTMLInputElement>(
        fixture.nativeElement.querySelectorAll('input[matinput]')
      ).find((i) => i.value === 'Note')!;
      name.value = 'Renamed';
      name.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(save.disabled).toBe(false);

      save.click();
      expect(component.definition()?.name).toBe('Renamed');
    });
  });
});
