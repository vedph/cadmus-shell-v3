import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlagDefinitionEditorComponent } from './flag-definition-editor.component';
import { FlagDefinition } from '@myrmidon/cadmus-core';

function makeFlag(overrides?: Partial<FlagDefinition>): FlagDefinition {
  return {
    id: 1,
    label: 'admin',
    description: 'admin flag',
    colorKey: 'f00000',
    isAdmin: true,
    ...overrides,
  };
}

describe('FlagDefinitionEditorComponent', () => {
  let component: FlagDefinitionEditorComponent;
  let fixture: ComponentFixture<FlagDefinitionEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagDefinitionEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FlagDefinitionEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build a form with 32 flag numbers and default id 1', () => {
    expect(component.flagNumbers).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
    expect(component.id.value).toBe(1);
  });

  describe('id validators', () => {
    it('should require id between 1 and 32', () => {
      component.id.setValue(0);
      expect(component.id.hasError('min')).toBe(true);
      component.id.setValue(33);
      expect(component.id.hasError('max')).toBe(true);
      component.id.setValue(16);
      expect(component.id.valid).toBe(true);
    });
  });

  describe('label/description validators', () => {
    it('should require label and limit its length', () => {
      component.label.setValue(null);
      expect(component.label.hasError('required')).toBe(true);
      component.label.setValue('a'.repeat(51));
      expect(component.label.hasError('maxlength')).toBe(true);
      component.label.setValue('ok');
      expect(component.label.valid).toBe(true);
    });

    it('should require description and limit its length', () => {
      component.description.setValue(null);
      expect(component.description.hasError('required')).toBe(true);
      component.description.setValue('a'.repeat(101));
      expect(component.description.hasError('maxlength')).toBe(true);
      component.description.setValue('ok');
      expect(component.description.valid).toBe(true);
    });
  });

  describe('updateForm (via flag model input)', () => {
    it('should reset the form when flag becomes undefined', () => {
      fixture.componentRef.setInput('flag', makeFlag());
      fixture.detectChanges();
      expect(component.label.value).toBe('admin');

      fixture.componentRef.setInput('flag', undefined);
      fixture.detectChanges();

      expect(component.label.value).toBeNull();
    });

    it('should populate the form from the flag, converting id to its 1-based bit index', () => {
      fixture.componentRef.setInput('flag', makeFlag({ id: 1 << 3 })); // bit 4
      fixture.detectChanges();

      expect(component.id.value).toBe(4);
      expect(component.label.value).toBe('admin');
      expect(component.colorKey.value).toBe('#f00000');
      expect(component.description.value).toBe('admin flag');
      expect(component.isAdmin.value).toBe(true);
      expect(component.form.pristine).toBe(true);
    });

    it('should set colorKey to null when the flag has no colorKey', () => {
      fixture.componentRef.setInput('flag', makeFlag({ colorKey: undefined as any }));
      fixture.detectChanges();
      expect(component.colorKey.value).toBeNull();
    });

    it('should default isAdmin to false when not explicitly true', () => {
      fixture.componentRef.setInput('flag', makeFlag({ isAdmin: undefined }));
      fixture.detectChanges();
      expect(component.isAdmin.value).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should emit editorClose', () => {
      const spy = vi.fn();
      component.editorClose.subscribe(spy);
      component.cancel();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should not update the flag when the form is invalid', () => {
      component.label.setValue(null);
      const before = component.flag();
      component.save();
      expect(component.flag()).toBe(before);
    });

    it('should build a flag from the form, converting the 1-based bit index back to a bitmask', () => {
      component.id.setValue(4); // bit index 4 -> 1 << 3 = 8
      component.label.setValue('  Admin  ');
      component.colorKey.setValue('#00ff00');
      component.description.setValue('  desc  ');
      component.isAdmin.setValue(true);

      component.save();

      expect(component.flag()).toEqual({
        id: 8,
        label: 'Admin',
        colorKey: '00ff00',
        description: 'desc',
        isAdmin: true,
      });
    });

    it('should strip the leading # from colorKey', () => {
      component.id.setValue(1);
      component.label.setValue('x');
      component.colorKey.setValue('#abcdef');
      component.description.setValue('y');
      component.isAdmin.setValue(false);

      component.save();

      expect(component.flag()?.colorKey).toBe('abcdef');
    });
  });
});
