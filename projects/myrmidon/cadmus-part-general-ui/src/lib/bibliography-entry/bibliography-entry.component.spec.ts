import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { vi } from 'vitest';

import { BibliographyEntryComponent } from './bibliography-entry.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BibAuthorsEditorComponent } from '../bib-authors-editor/bib-authors-editor.component';
import { BibEntry, BibAuthor } from '../bibliography-part';

describe('BibliographyEntryComponent', () => {
  let component: BibliographyEntryComponent;
  let fixture: ComponentFixture<BibliographyEntryComponent>;

  const AUTHOR: BibAuthor = { firstName: 'John', lastName: 'Doe' };

  function getEntry(overrides?: Partial<BibEntry>): BibEntry {
    return {
      key: 'doe2020',
      typeId: 'book',
      tag: 'primary',
      language: 'eng',
      authors: [AUTHOR],
      title: 'A great title',
      note: 'a note',
      contributors: [{ lastName: 'Smith' }],
      container: 'A container',
      edition: 2,
      number: '12',
      publisher: 'Acme',
      placePub: 'Rome',
      yearPub: 2020,
      location: 'shelf 1',
      accessDate: new Date(2021, 0, 1),
      firstPage: 10,
      lastPage: 20,
      keywords: [{ language: 'eng', value: 'test' }],
      ...overrides,
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        BibAuthorsEditorComponent,
        BibliographyEntryComponent,
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideNativeDateAdapter(),
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BibliographyEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset the form to null defaults when entry is initially unset', () => {
    // the constructor sets accessDate's initial control value to `new Date()`,
    // but since it is not a nonNullable control, its "defaultValue" used by
    // reset() is null; and since entry() starts undefined, the constructor's
    // effect immediately calls updateForm(undefined) -> form.reset() on the
    // first change detection, nulling out all controls including accessDate.
    expect(component.key.value).toBeNull();
    expect(component.title.value).toBeNull();
    expect(component.accessDate.value).toBeNull();
  });

  it('should populate form controls when entry is set', () => {
    const entry = getEntry();
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();

    expect(component.key.value).toBe('doe2020');
    expect(component.type.value).toBe('book');
    expect(component.tag.value).toBe('primary');
    expect(component.language.value).toBe('eng');
    expect(component.authors.value).toEqual([AUTHOR]);
    expect(component.title.value).toBe('A great title');
    expect(component.note.value).toBe('a note');
    expect(component.contributors.value).toEqual([{ lastName: 'Smith' }]);
    expect(component.container.value).toBe('A container');
    expect(component.edition.value).toBe(2);
    expect(component.number.value).toBe('12');
    expect(component.publisher.value).toBe('Acme');
    expect(component.placePub.value).toBe('Rome');
    expect(component.yearPub.value).toBe(2020);
    expect(component.location.value).toBe('shelf 1');
    expect(component.accessDate.value).toEqual(new Date(2021, 0, 1));
    expect(component.firstPage.value).toBe(10);
    expect(component.lastPage.value).toBe(20);
    expect(component.keywords()).toEqual([{ language: 'eng', value: 'test' }]);
    expect(component.form.pristine).toBe(true);
  });

  it('should reset the form when entry is set to undefined', () => {
    fixture.componentRef.setInput('entry', getEntry());
    fixture.detectChanges();

    fixture.componentRef.setInput('entry', undefined);
    fixture.detectChanges();

    expect(component.key.value).toBeNull();
    expect(component.title.value).toBeNull();
  });

  it('should set accessDate to null when the entry has no accessDate', () => {
    fixture.componentRef.setInput('entry', getEntry({ accessDate: undefined }));
    fixture.detectChanges();

    expect(component.accessDate.value).toBeNull();
  });

  it('should not save when the form is invalid (missing required title)', () => {
    fixture.componentRef.setInput('entry', getEntry());
    fixture.detectChanges();

    component.title.setValue('');
    fixture.detectChanges();
    expect(component.form.invalid).toBe(true);

    component.save();

    // entry model must remain unchanged (still the original title)
    expect(component.entry()?.title).toBe('A great title');
  });

  it('should save trimmed values into the entry model', () => {
    fixture.componentRef.setInput('entry', getEntry());
    fixture.detectChanges();

    component.key.setValue('  doe2021  ');
    component.title.setValue('  New title  ');
    component.note.setValue('  ');
    fixture.detectChanges();

    component.save();

    const saved = component.entry();
    expect(saved?.key).toBe('doe2021');
    expect(saved?.title).toBe('New title');
    // note is only whitespace -> trimmed to empty string
    expect(saved?.note).toBe('');
  });

  it('should set contributors to undefined in the saved entry when empty', () => {
    fixture.componentRef.setInput('entry', getEntry({ contributors: [] }));
    fixture.detectChanges();

    component.save();

    expect(component.entry()?.contributors).toBeUndefined();
  });

  it('should set keywords to undefined in the saved entry when empty', () => {
    fixture.componentRef.setInput('entry', getEntry({ keywords: [] }));
    fixture.detectChanges();

    component.save();

    expect(component.entry()?.keywords).toBeUndefined();
  });

  it('onAuthorsChange should update the authors control and mark it dirty', () => {
    fixture.componentRef.setInput('entry', getEntry({ authors: [] }));
    fixture.detectChanges();

    component.onAuthorsChange([AUTHOR]);

    expect(component.authors.value).toEqual([AUTHOR]);
    expect(component.authors.dirty).toBe(true);
  });

  it('onContributorsChange should update the contributors control and mark it dirty', () => {
    fixture.componentRef.setInput('entry', getEntry({ contributors: [] }));
    fixture.detectChanges();

    component.onContributorsChange([{ lastName: 'Verdi' }]);

    expect(component.contributors.value).toEqual([{ lastName: 'Verdi' }]);
    expect(component.contributors.dirty).toBe(true);
  });

  describe('keywords management', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('entry', getEntry({ keywords: [] }));
      fixture.detectChanges();
    });

    it('should not add a keyword when the keyword form is invalid', () => {
      component.keyLanguage.setValue('');
      component.keyValue.setValue(null);
      component.addKeyword();

      expect(component.keywords().length).toBe(0);
    });

    it('should add a keyword and reset keyValue', () => {
      component.keyLanguage.setValue('eng');
      component.keyValue.setValue('foo');
      component.addKeyword();

      expect(component.keywords()).toEqual([{ language: 'eng', value: 'foo' }]);
      expect(component.keyValue.value).toBeNull();
      expect(component.form.dirty).toBe(true);
    });

    it('should not add a duplicate keyword (same language and value)', () => {
      component.keyLanguage.setValue('eng');
      component.keyValue.setValue('foo');
      component.addKeyword();
      component.keyLanguage.setValue('eng');
      component.keyValue.setValue('foo');
      component.addKeyword();

      expect(component.keywords().length).toBe(1);
    });

    it('should delete a keyword by index', () => {
      component.keywords.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.deleteKeyword(0);

      expect(component.keywords()).toEqual([{ language: 'eng', value: 'b' }]);
    });

    it('should not move the first keyword up', () => {
      component.keywords.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.moveKeywordUp(0);

      expect(component.keywords()).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);
    });

    it('should move a keyword up', () => {
      component.keywords.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.moveKeywordUp(1);

      expect(component.keywords()).toEqual([
        { language: 'eng', value: 'b' },
        { language: 'eng', value: 'a' },
      ]);
    });

    it('should not move the last keyword down', () => {
      component.keywords.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.moveKeywordDown(1);

      expect(component.keywords()).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);
    });

    it('should move a keyword down', () => {
      component.keywords.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.moveKeywordDown(0);

      expect(component.keywords()).toEqual([
        { language: 'eng', value: 'b' },
        { language: 'eng', value: 'a' },
      ]);
    });
  });

  it('cancel should emit editorClose', () => {
    const spy = vi.fn();
    component.editorClose.subscribe(spy);

    component.cancel();

    expect(spy).toHaveBeenCalled();
  });

  describe('first/last page auto sync', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('entry', getEntry({ firstPage: undefined, lastPage: undefined }));
      fixture.detectChanges();
    });

    it('should bump lastPage up to firstPage when lastPage < firstPage', () => {
      component.lastPage.setValue(5);
      component.firstPage.setValue(10);

      expect(component.lastPage.value).toBe(10);
    });

    it('should not change lastPage when it is already >= firstPage', () => {
      component.lastPage.setValue(30);
      component.firstPage.setValue(10);

      expect(component.lastPage.value).toBe(30);
    });

    it('should not change lastPage when lastPage is not set', () => {
      component.firstPage.setValue(10);

      expect(component.lastPage.value).toBeNull();
    });
  });

  it('ngOnDestroy should unsubscribe the firstPage subscription', () => {
    fixture.componentRef.setInput('entry', getEntry({ firstPage: undefined, lastPage: undefined }));
    fixture.detectChanges();

    component.lastPage.setValue(5);
    component.ngOnDestroy();
    component.firstPage.setValue(10);

    // after destroy, the auto-sync logic must no longer run
    expect(component.lastPage.value).toBe(5);
  });
});
