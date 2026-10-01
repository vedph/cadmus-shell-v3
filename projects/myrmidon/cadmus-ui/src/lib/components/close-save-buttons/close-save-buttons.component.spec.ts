import { Injector, runInInjectionContext, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldTree, form, required } from '@angular/forms/signals';

import { CloseSaveButtonsComponent } from './close-save-buttons.component';

describe('CloseSaveButtonsComponent', () => {
  let component: CloseSaveButtonsComponent;
  let fixture: ComponentFixture<CloseSaveButtonsComponent>;

  // a form with a required name, initially empty (invalid)
  function makeForm(name = ''): FieldTree<{ name: string }> {
    return runInInjectionContext(TestBed.inject(Injector), () =>
      form(signal({ name }), (p) => {
        required(p.name);
      }),
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CloseSaveButtonsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CloseSaveButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function buttons(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default invalid to false when there is no form', () => {
    expect(component.invalid()).toBe(false);
  });

  it('should reflect the initial validity of the bound form', () => {
    fixture.componentRef.setInput('form', makeForm());
    fixture.detectChanges();
    expect(component.invalid()).toBe(true);
  });

  it('should track form validity changes over time', () => {
    const f = makeForm();
    fixture.componentRef.setInput('form', f);
    fixture.detectChanges();
    expect(component.invalid()).toBe(true);
    expect(buttons()[1].disabled).toBe(true);

    f.name().value.set('ok');
    fixture.detectChanges();
    expect(component.invalid()).toBe(false);
    expect(buttons()[1].disabled).toBe(false);
  });

  it('should reset invalid to false when the form input is cleared', () => {
    fixture.componentRef.setInput('form', makeForm());
    fixture.detectChanges();

    fixture.componentRef.setInput('form', undefined);
    fixture.detectChanges();
    expect(component.invalid()).toBe(false);
  });

  it('should follow only the currently bound form', () => {
    const form1 = makeForm();
    const form2 = makeForm('ok');
    fixture.componentRef.setInput('form', form1);
    fixture.detectChanges();
    fixture.componentRef.setInput('form', form2);
    fixture.detectChanges();
    expect(component.invalid()).toBe(false);

    // changes on the old form must no longer affect invalid()
    form1.name().value.set('');
    expect(component.invalid()).toBe(false);
  });

  it('should emit closeRequest when close() is called', () => {
    const spy = vi.fn();
    component.closeRequest.subscribe(spy);
    component.close();
    expect(spy).toHaveBeenCalled();
  });

  it('should not render the buttons row when there is no form', () => {
    expect(buttons().length).toBe(0);
  });

  it('should render both buttons when a form is bound and noSave is false', () => {
    fixture.componentRef.setInput('form', makeForm());
    fixture.detectChanges();
    expect(buttons().length).toBe(2);
  });

  it('should render only the close button when noSave is true', () => {
    fixture.componentRef.setInput('form', makeForm());
    fixture.componentRef.setInput('noSave', true);
    fixture.detectChanges();
    expect(buttons().length).toBe(1);
  });

  it('should render plain buttons, so that no enclosing form is needed', () => {
    fixture.componentRef.setInput('form', makeForm('ok'));
    fixture.detectChanges();
    for (const b of buttons()) {
      expect(b.type).toBe('button');
    }
  });

  it('should emit saveRequest when the save button is clicked', () => {
    const closeSpy = vi.fn();
    const saveSpy = vi.fn();
    component.closeRequest.subscribe(closeSpy);
    component.saveRequest.subscribe(saveSpy);
    fixture.componentRef.setInput('form', makeForm('ok'));
    fixture.detectChanges();

    buttons()[1].click();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('should emit closeRequest when the close button is clicked', () => {
    const saveSpy = vi.fn();
    const closeSpy = vi.fn();
    component.saveRequest.subscribe(saveSpy);
    component.closeRequest.subscribe(closeSpy);
    fixture.componentRef.setInput('form', makeForm('ok'));
    fixture.detectChanges();

    buttons()[0].click();

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
