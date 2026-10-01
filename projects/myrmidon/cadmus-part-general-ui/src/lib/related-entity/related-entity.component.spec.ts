import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { RelatedEntityComponent } from './related-entity.component';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';
import { ItemService } from '@myrmidon/cadmus-api';
import { RelatedEntity } from '../historical-events-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

describe('RelatedEntityComponent', () => {
  let component: RelatedEntityComponent;
  let fixture: ComponentFixture<RelatedEntityComponent>;

  const id: AssertedCompositeId = {
    target: {
      gid: 'gid1',
      label: 'label1',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RelatedEntityComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: ItemService,
          useValue: { searchPins: vi.fn().mockReturnValue(of({ value: { items: [] } })) },
        },
        { provide: 'indexLookupDefinitions', useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(RelatedEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets the form when entity is undefined', () => {
    fixture.componentRef.setInput('entity', undefined);
    fixture.detectChanges();
    expect(component.form().invalid()).toBe(true);
  });

  it('updates the form when entity is set', () => {
    const entity: RelatedEntity = {
      relation: 'rel1',
      id,
    };
    fixture.componentRef.setInput('entity', entity);
    fixture.detectChanges();

    expect(plain(component.form.relation().value())).toBe('rel1');
    expect(plain(component.form.id().value())).toEqual(id);
    expect(component.form().dirty()).toBe(false);
  });

  it('updates id control on onIdChange and marks it dirty', () => {
    component.onIdChange(id);
    expect(plain(component.form.id().value())).toEqual(id);
    expect(component.form.id().dirty()).toBe(true);
  });

  it('does not save when form is invalid', () => {
    fixture.componentRef.setInput('entity', undefined);
    fixture.detectChanges();
    const before = component.entity();
    component.save();
    expect(component.entity()).toBe(before);
  });

  it('saves trimmed relation and id when form is valid', () => {
    component.form.relation().value.set('  rel1  ');
    component.form.id().value.set(id);

    component.save();

    expect(component.entity()).toEqual({
      relation: 'rel1',
      id,
    });
  });

  it('marks the form as touched, showing its errors, when saving an invalid form', () => {
    component.save();
    fixture.detectChanges();
    expect(component.form.relation().touched()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('relation required');
  });

  it('saves from the save button', () => {
    component.form.relation().value.set('rel1');
    component.form.id().value.set(id);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[mattooltip="Save entity"]',
    );
    button.click();
    expect(component.entity()).toEqual({ relation: 'rel1', id });
  });

  it('emits editorClose on cancel', () => {
    let emitted = false;
    component.editorClose.subscribe(() => (emitted = true));
    component.cancel();
    expect(emitted).toBe(true);
  });

  it('should render no <form> of its own, and no submit buttons', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector(':scope > form')).toBeNull();
    expect(root.querySelectorAll('button[type="submit"]').length).toBe(0);
  });

  it('saves on Enter in the relation input', () => {
    component.form.id().value.set(id);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'rel1';
    input.dispatchEvent(new Event('input'));
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
      bubbles: true,
    });
    input.dispatchEvent(enter);

    expect(component.entity()).toEqual({ relation: 'rel1', id });
    expect(enter.defaultPrevented).toBe(true);
  });

  it('should keep the dirty state of a user edit across change detection', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input',
    );
    input.value = input.value + 'x';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.detectChanges();
    expect(component.form().dirty()).toBe(true);
  });
});
