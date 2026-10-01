import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { IndexKeywordComponent } from './index-keyword.component';
import { IndexKeyword } from '../index-keywords-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

describe('IndexKeywordComponent', () => {
  let component: IndexKeywordComponent;
  let fixture: ComponentFixture<IndexKeywordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndexKeywordComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IndexKeywordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets the form when keyword is undefined', () => {
    fixture.componentRef.setInput('keyword', undefined);
    fixture.detectChanges();
    expect(plain(component.form.value().value())).toBeFalsy();
    expect(component.form().invalid()).toBe(true);
  });

  it('updates the form when keyword is set', () => {
    const keyword: IndexKeyword = {
      indexId: 'idx1',
      language: 'eng',
      value: 'hello',
      note: 'a note',
      tag: 'tag1',
    };
    fixture.componentRef.setInput('keyword', keyword);
    fixture.detectChanges();

    expect(plain(component.form.indexId().value())).toBe('idx1');
    expect(plain(component.form.language().value())).toBe('eng');
    expect(plain(component.form.value().value())).toBe('hello');
    expect(plain(component.form.note().value())).toBe('a note');
    expect(plain(component.form.tag().value())).toBe('tag1');
    expect(component.form().dirty()).toBe(false);
  });

  it('defaults indexId to null when keyword has no indexId', () => {
    const keyword: IndexKeyword = {
      language: 'eng',
      value: 'hello',
    };
    fixture.componentRef.setInput('keyword', keyword);
    fixture.detectChanges();

    expect(component.form.indexId().value()).toBe('');
    expect(component.form.note().value()).toBe('');
    expect(component.form.tag().value()).toBe('');
  });

  it('does not emit/set keyword on submit when form is invalid', () => {
    fixture.componentRef.setInput('keyword', undefined);
    fixture.detectChanges();
    // value is required and not set: form invalid
    const before = component.keyword();
    component.submit();
    expect(component.keyword()).toBe(before);
  });

  it('sets keyword with trimmed values on valid submit', () => {
    // indexId has a slug-like pattern validator that rejects whitespace,
    // so it can't be padded like the other fields here
    component.form.indexId().value.set('idx1');
    component.form.language().value.set('  eng  ');
    component.form.value().value.set('  hello  ');
    component.form.note().value.set('  note  ');
    component.form.tag().value.set('  tag1  ');

    component.submit();

    expect(component.keyword()).toEqual({
      indexId: 'idx1',
      language: 'eng',
      value: 'hello',
      note: 'note',
      tag: 'tag1',
    });
  });

  it('sets optional fields to undefined when blank', () => {
    component.form.indexId().value.set('');
    component.form.language().value.set('eng');
    component.form.value().value.set('hello');
    component.form.note().value.set('');
    component.form.tag().value.set('');

    component.submit();

    const result = component.keyword();
    expect(result?.indexId).toBeUndefined();
    expect(result?.note).toBeUndefined();
    expect(result?.tag).toBeUndefined();
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
