import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';

import { CloseSaveButtonsComponent } from './close-save-buttons.component';

describe('CloseSaveButtonsComponent', () => {
  let component: CloseSaveButtonsComponent;
  let fixture: ComponentFixture<CloseSaveButtonsComponent>;
  const fb = new FormBuilder();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CloseSaveButtonsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CloseSaveButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default invalid to false when there is no form', () => {
    expect(component.invalid()).toBe(false);
  });

  it('should reflect the initial validity of the bound form', () => {
    const form = fb.group({ name: ['', () => ({ required: true })] });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    expect(component.invalid()).toBe(true);
  });

  it('should track form validity changes over time', () => {
    const form = fb.group({ name: ['', () => ({ required: true })] });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    expect(component.invalid()).toBe(true);

    // the group's own validity also depends on its children, so the
    // always-failing validator on "name" must be cleared too
    form.get('name')!.setValidators(null);
    form.get('name')!.updateValueAndValidity();
    expect(component.invalid()).toBe(false);
  });

  it('should reset invalid to false when the form input is cleared', () => {
    const form = fb.group({ name: ['', () => ({ required: true })] });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();

    fixture.componentRef.setInput('form', undefined);
    fixture.detectChanges();
    expect(component.invalid()).toBe(false);
  });

  it('should unsubscribe from the previous form when a new one is bound', () => {
    const form1 = fb.group({ name: ['', () => ({ required: true })] });
    const form2 = fb.group({ name: ['ok'] });
    fixture.componentRef.setInput('form', form1);
    fixture.detectChanges();
    fixture.componentRef.setInput('form', form2);
    fixture.detectChanges();
    expect(component.invalid()).toBe(false);

    // changes on the old (now detached) form must no longer affect invalid()
    form1.setErrors({ stale: true });
    form1.updateValueAndValidity();
    expect(component.invalid()).toBe(false);
  });

  it('should emit closeRequest when close() is called', () => {
    const spy = vi.fn();
    component.closeRequest.subscribe(spy);
    component.close();
    expect(spy).toHaveBeenCalled();
  });

  it('should not render the buttons row when there is no form', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('button')).toBeNull();
  });

  it('should render both buttons when a form is bound and noSave is false', () => {
    fixture.componentRef.setInput('form', fb.group({}));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('button').length).toBe(2);
  });

  it('should render only the close button when noSave is true', () => {
    fixture.componentRef.setInput('form', fb.group({}));
    fixture.componentRef.setInput('noSave', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('button').length).toBe(1);
  });
});
