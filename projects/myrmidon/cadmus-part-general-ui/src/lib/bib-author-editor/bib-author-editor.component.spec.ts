import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BibAuthorEditorComponent } from './bib-author-editor.component';
import { BibAuthor } from '../bibliography-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

describe('BibAuthorEditorComponent', () => {
  let component: BibAuthorEditorComponent;
  let fixture: ComponentFixture<BibAuthorEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BibAuthorEditorComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(BibAuthorEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets the form when author is undefined', () => {
    fixture.componentRef.setInput('author', undefined);
    fixture.detectChanges();
    // lastName is nonNullable and defaults to '', which fails required
    expect(plain(component.form.lastName().value())).toBe('');
    expect(component.form().invalid()).toBe(true);
  });

  it('updates the form when author is set', () => {
    const author: BibAuthor = {
      lastName: 'Doe',
      firstName: 'John',
      roleId: 'editor',
    };
    fixture.componentRef.setInput('author', author);
    fixture.detectChanges();

    expect(plain(component.form.lastName().value())).toBe('Doe');
    expect(plain(component.form.firstName().value())).toBe('John');
    expect(plain(component.form.role().value())).toBe('editor');
    expect(component.form().dirty()).toBe(false);
  });

  it('sets firstName/role to null when not present in author', () => {
    const author: BibAuthor = { lastName: 'Doe' };
    fixture.componentRef.setInput('author', author);
    fixture.detectChanges();

    expect(component.form.firstName().value()).toBe('');
    expect(component.form.role().value()).toBe('');
  });

  it('marks all as touched and does not save when form invalid', () => {
    fixture.componentRef.setInput('author', undefined);
    fixture.detectChanges();
    const before = component.author();

    component.save();

    expect(component.form.lastName().touched()).toBe(true);
    expect(component.author()).toBe(before);
  });

  it('saves trimmed author and marks form pristine by default', () => {
    component.form.lastName().value.set('  Doe  ');
    component.form.firstName().value.set('  John  ');
    component.form.role().value.set('  editor  ');
    component.form().markAsDirty();

    component.save();

    expect(component.author()).toEqual({
      lastName: 'Doe',
      firstName: 'John',
      roleId: 'editor',
    });
    expect(component.form().dirty()).toBe(false);
  });

  it('sets firstName/roleId to undefined when blank after trim', () => {
    component.form.lastName().value.set('Doe');
    component.form.firstName().value.set('   ');
    component.form.role().value.set('');

    component.save();

    const author = component.author();
    expect(author?.firstName).toBeUndefined();
    expect(author?.roleId).toBeUndefined();
  });

  it('keeps the form dirty when save(false) is called', () => {
    component.form.lastName().value.set('Doe');
    component.form().markAsDirty();

    component.save(false);

    expect(component.form().dirty()).toBe(true);
    expect(component.author()?.lastName).toBe('Doe');
  });

  it('emits cancelEdit on cancel', () => {
    let emitted = false;
    component.cancelEdit.subscribe(() => (emitted = true));
    component.cancel();
    expect(emitted).toBe(true);
  });

  it('should render no <form> of its own, and no submit buttons', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector(':scope > form')).toBeNull();
    expect(root.querySelectorAll('button[type="submit"]').length).toBe(0);
  });

  it('saves on Enter only when the save button would be enabled', () => {
    fixture.componentRef.setInput('author', { lastName: 'Doe' });
    fixture.detectChanges();
    const spy = vi.fn();
    component.author.subscribe(spy);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const enter = () =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          cancelable: true,
          bubbles: true,
        }),
      );

    // pristine: the save button is disabled
    enter();
    expect(spy).not.toHaveBeenCalled();

    input.value = 'Smith';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    enter();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(component.author()?.lastName).toBe('Smith');
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
