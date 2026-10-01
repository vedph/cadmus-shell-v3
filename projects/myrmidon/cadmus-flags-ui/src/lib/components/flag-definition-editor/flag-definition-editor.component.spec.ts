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
    expect(component.form.id().value()).toBe(1);
  });

  describe('id validators', () => {
    it('should require id between 1 and 32', () => {
      component.form.id().value.set(0);
      expect(component.form.id().getError('min')).toBeTruthy();
      component.form.id().value.set(33);
      expect(component.form.id().getError('max')).toBeTruthy();
      component.form.id().value.set(16);
      expect(component.form.id().valid()).toBe(true);
    });
  });

  describe('label/description validators', () => {
    it('should require label and limit its length', () => {
      component.form.label().value.set('');
      expect(component.form.label().getError('required')).toBeTruthy();
      component.form.label().value.set('a'.repeat(51));
      expect(component.form.label().getError('maxLength')).toBeTruthy();
      component.form.label().value.set('ok');
      expect(component.form.label().valid()).toBe(true);
    });

    it('should require description and limit its length', () => {
      component.form.description().value.set('');
      expect(component.form.description().getError('required')).toBeTruthy();
      component.form.description().value.set('a'.repeat(101));
      expect(component.form.description().getError('maxLength')).toBeTruthy();
      component.form.description().value.set('ok');
      expect(component.form.description().valid()).toBe(true);
    });
  });

  describe('updateForm (via flag model input)', () => {
    it('should reset the form when flag becomes undefined', () => {
      fixture.componentRef.setInput('flag', makeFlag());
      fixture.detectChanges();
      expect(component.form.label().value()).toBe('admin');

      fixture.componentRef.setInput('flag', undefined);
      fixture.detectChanges();

      expect(component.form.label().value()).toBe('');
    });

    it('should populate the form from the flag, converting id to its 1-based bit index', () => {
      fixture.componentRef.setInput('flag', makeFlag({ id: 1 << 3 })); // bit 4
      fixture.detectChanges();

      expect(component.form.id().value()).toBe(4);
      expect(component.form.label().value()).toBe('admin');
      expect(component.form.colorKey().value()).toBe('#f00000');
      expect(component.form.description().value()).toBe('admin flag');
      expect(component.form.isAdmin().value()).toBe(true);
      expect(component.form().dirty()).toBe(false);
    });

    it('should set colorKey to empty when the flag has no colorKey', () => {
      fixture.componentRef.setInput('flag', makeFlag({ colorKey: undefined as any }));
      fixture.detectChanges();
      expect(component.form.colorKey().value()).toBe('');
    });

    it('should default isAdmin to false when not explicitly true', () => {
      fixture.componentRef.setInput('flag', makeFlag({ isAdmin: undefined }));
      fixture.detectChanges();
      expect(component.form.isAdmin().value()).toBe(false);
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
      component.form.label().value.set('');
      const before = component.flag();
      component.save();
      expect(component.flag()).toBe(before);
      expect(component.form.label().touched()).toBe(true);
    });

    it('should build a flag from the form, converting the 1-based bit index back to a bitmask', () => {
      component.form.id().value.set(4); // bit index 4 -> 1 << 3 = 8
      component.form.label().value.set('  Admin  ');
      component.form.colorKey().value.set('#00ff00');
      component.form.description().value.set('  desc  ');
      component.form.isAdmin().value.set(true);

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
      component.form.id().value.set(1);
      component.form.label().value.set('x');
      component.form.colorKey().value.set('#abcdef');
      component.form.description().value.set('y');
      component.form.isAdmin().value.set(false);

      component.save();

      expect(component.flag()?.colorKey).toBe('abcdef');
    });
  });

  describe('template', () => {
    function saveButton(): HTMLButtonElement {
      return fixture.nativeElement.querySelector(
        'button[mattooltip="Accept changes"]'
      );
    }

    it('renders no <form> element, so it stays valid at any nesting depth', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      expect(saveButton().type).toBe('button');
    });

    it('disables save while pristine, enables it once a valid edit is made', () => {
      fixture.componentRef.setInput('flag', makeFlag());
      fixture.detectChanges();
      expect(saveButton().disabled).toBe(true);

      const input: HTMLInputElement = fixture.nativeElement.querySelector(
        'input:not([type="color"])'
      );
      input.value = 'changed';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.form.label().value()).toBe('changed');
      expect(saveButton().disabled).toBe(false);
    });

    it('disables save while invalid', () => {
      fixture.componentRef.setInput('flag', makeFlag());
      fixture.detectChanges();
      component.form.label().value.set('');
      component.form.label().markAsDirty();
      fixture.detectChanges();
      expect(saveButton().disabled).toBe(true);
    });

    it('saves the flag when the save button is clicked, and is pristine after', () => {
      fixture.componentRef.setInput('flag', makeFlag());
      fixture.detectChanges();
      component.form.label().value.set('renamed');
      component.form.label().markAsDirty();
      fixture.detectChanges();

      saveButton().click();
      fixture.detectChanges();

      expect(component.flag()?.label).toBe('renamed');
      expect(component.form().dirty()).toBe(false);
      expect(saveButton().disabled).toBe(true);
    });

    it('keeps the typed text when its own save echoes back normalized', () => {
      fixture.componentRef.setInput('flag', makeFlag());
      fixture.detectChanges();
      component.form.label().value.set('abc ');
      component.save();
      fixture.detectChanges();

      expect(component.flag()?.label).toBe('abc');
      expect(component.form.label().value()).toBe('abc ');
    });

    it('rebuilds the draft when a genuinely new flag is bound', () => {
      fixture.componentRef.setInput('flag', makeFlag());
      fixture.detectChanges();
      component.form.label().value.set('edited');
      component.form.label().markAsDirty();
      expect(component.form().dirty()).toBe(true);
      fixture.componentRef.setInput('flag', makeFlag({ label: 'other' }));
      fixture.detectChanges();

      expect(component.form.label().value()).toBe('other');
      expect(component.form().dirty()).toBe(false);
    });
  });
});
