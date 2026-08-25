import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { IndexKeywordComponent } from './index-keyword.component';
import { IndexKeyword } from '../index-keywords-part';

describe('IndexKeywordComponent', () => {
  let component: IndexKeywordComponent;
  let fixture: ComponentFixture<IndexKeywordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, IndexKeywordComponent],
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
    expect(component.value.value).toBeFalsy();
    expect(component.form.invalid).toBe(true);
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

    expect(component.indexId.value).toBe('idx1');
    expect(component.language.value).toBe('eng');
    expect(component.value.value).toBe('hello');
    expect(component.note.value).toBe('a note');
    expect(component.tag.value).toBe('tag1');
    expect(component.form.pristine).toBe(true);
  });

  it('defaults indexId to null when keyword has no indexId', () => {
    const keyword: IndexKeyword = {
      language: 'eng',
      value: 'hello',
    };
    fixture.componentRef.setInput('keyword', keyword);
    fixture.detectChanges();

    expect(component.indexId.value).toBeNull();
    expect(component.note.value).toBeNull();
    expect(component.tag.value).toBeNull();
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
    component.indexId.setValue('idx1');
    component.language.setValue('  eng  ');
    component.value.setValue('  hello  ');
    component.note.setValue('  note  ');
    component.tag.setValue('  tag1  ');

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
    component.indexId.setValue(null);
    component.language.setValue('eng');
    component.value.setValue('hello');
    component.note.setValue(null);
    component.tag.setValue(null);

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
});
