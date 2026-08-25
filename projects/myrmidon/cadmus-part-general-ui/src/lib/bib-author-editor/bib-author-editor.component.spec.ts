import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BibAuthorEditorComponent } from './bib-author-editor.component';
import { BibAuthor } from '../bibliography-part';

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
    expect(component.lastName.value).toBe('');
    expect(component.form.invalid).toBe(true);
  });

  it('updates the form when author is set', () => {
    const author: BibAuthor = {
      lastName: 'Doe',
      firstName: 'John',
      roleId: 'editor',
    };
    fixture.componentRef.setInput('author', author);
    fixture.detectChanges();

    expect(component.lastName.value).toBe('Doe');
    expect(component.firstName.value).toBe('John');
    expect(component.role.value).toBe('editor');
    expect(component.form.pristine).toBe(true);
  });

  it('sets firstName/role to null when not present in author', () => {
    const author: BibAuthor = { lastName: 'Doe' };
    fixture.componentRef.setInput('author', author);
    fixture.detectChanges();

    expect(component.firstName.value).toBeNull();
    expect(component.role.value).toBeNull();
  });

  it('marks all as touched and does not save when form invalid', () => {
    fixture.componentRef.setInput('author', undefined);
    fixture.detectChanges();
    const before = component.author();

    component.save();

    expect(component.lastName.touched).toBe(true);
    expect(component.author()).toBe(before);
  });

  it('saves trimmed author and marks form pristine by default', () => {
    component.lastName.setValue('  Doe  ');
    component.firstName.setValue('  John  ');
    component.role.setValue('  editor  ');
    component.form.markAsDirty();

    component.save();

    expect(component.author()).toEqual({
      lastName: 'Doe',
      firstName: 'John',
      roleId: 'editor',
    });
    expect(component.form.pristine).toBe(true);
  });

  it('sets firstName/roleId to undefined when blank after trim', () => {
    component.lastName.setValue('Doe');
    component.firstName.setValue('   ');
    component.role.setValue(null);

    component.save();

    const author = component.author();
    expect(author?.firstName).toBeUndefined();
    expect(author?.roleId).toBeUndefined();
  });

  it('keeps the form dirty when save(false) is called', () => {
    component.lastName.setValue('Doe');
    component.form.markAsDirty();

    component.save(false);

    expect(component.form.dirty).toBe(true);
    expect(component.author()?.lastName).toBe('Doe');
  });

  it('emits cancelEdit on cancel', () => {
    let emitted = false;
    component.cancelEdit.subscribe(() => (emitted = true));
    component.cancel();
    expect(emitted).toBe(true);
  });
});
