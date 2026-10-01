import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { vi } from 'vitest';

import { BibliographyEntryComponent } from './bibliography-entry.component';
import { FormField } from '@angular/forms/signals';
import { BibAuthorsEditorComponent } from '../bib-authors-editor/bib-authors-editor.component';
import { BibEntry, BibAuthor } from '../bibliography-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

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
        FormField,
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

  it('should start with empty defaults when entry is initially unset', () => {
    expect(component.form.key().value()).toBe('');
    expect(component.form.title().value()).toBe('');
    expect(component.form.accessDate().value()).toBeNull();
  });

  it('should populate form controls when entry is set', () => {
    const entry = getEntry();
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();

    expect(plain(component.form.key().value())).toBe('doe2020');
    expect(plain(component.form.type().value())).toBe('book');
    expect(plain(component.form.tag().value())).toBe('primary');
    expect(plain(component.form.language().value())).toBe('eng');
    expect(plain(component.form.authors().value())).toEqual([AUTHOR]);
    expect(plain(component.form.title().value())).toBe('A great title');
    expect(plain(component.form.note().value())).toBe('a note');
    expect(plain(component.form.contributors().value())).toEqual([{ lastName: 'Smith' }]);
    expect(plain(component.form.container().value())).toBe('A container');
    expect(plain(component.form.edition().value())).toBe(2);
    expect(plain(component.form.number().value())).toBe('12');
    expect(plain(component.form.publisher().value())).toBe('Acme');
    expect(plain(component.form.placePub().value())).toBe('Rome');
    expect(plain(component.form.yearPub().value())).toBe(2020);
    expect(plain(component.form.location().value())).toBe('shelf 1');
    expect(plain(component.form.accessDate().value())).toEqual(new Date(2021, 0, 1));
    expect(plain(component.form.firstPage().value())).toBe(10);
    expect(plain(component.form.lastPage().value())).toBe(20);
    expect(plain(component.form.keywords().value())).toEqual([{ language: 'eng', value: 'test' }]);
    expect(component.form().dirty()).toBe(false);
  });

  it('should reset the form when entry is set to undefined', () => {
    fixture.componentRef.setInput('entry', getEntry());
    fixture.detectChanges();

    fixture.componentRef.setInput('entry', undefined);
    fixture.detectChanges();

    expect(component.form.key().value()).toBe('');
    expect(component.form.title().value()).toBe('');
  });

  it('should set accessDate to null when the entry has no accessDate', () => {
    fixture.componentRef.setInput('entry', getEntry({ accessDate: undefined }));
    fixture.detectChanges();

    expect(plain(component.form.accessDate().value())).toBeNull();
  });

  it('should not save when the form is invalid (missing required title)', () => {
    fixture.componentRef.setInput('entry', getEntry());
    fixture.detectChanges();

    component.form.title().value.set('');
    fixture.detectChanges();
    expect(component.form().invalid()).toBe(true);

    component.save();

    // entry model must remain unchanged (still the original title)
    expect(component.entry()?.title).toBe('A great title');
  });

  it('should save trimmed values into the entry model', () => {
    fixture.componentRef.setInput('entry', getEntry());
    fixture.detectChanges();

    component.form.key().value.set('  doe2021  ');
    component.form.title().value.set('  New title  ');
    component.form.note().value.set('  ');
    fixture.detectChanges();

    component.save();

    const saved = component.entry();
    expect(saved?.key).toBe('doe2021');
    expect(saved?.title).toBe('New title');
    // note is only whitespace -> trimmed, and empty optional values are omitted
    expect(saved?.note).toBeUndefined();
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

    expect(plain(component.form.authors().value())).toEqual([AUTHOR]);
    expect(component.form.authors().dirty()).toBe(true);
  });

  it('onContributorsChange should update the contributors control and mark it dirty', () => {
    fixture.componentRef.setInput('entry', getEntry({ contributors: [] }));
    fixture.detectChanges();

    component.onContributorsChange([{ lastName: 'Verdi' }]);

    expect(plain(component.form.contributors().value())).toEqual([{ lastName: 'Verdi' }]);
    expect(component.form.contributors().dirty()).toBe(true);
  });

  describe('keywords management', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('entry', getEntry({ keywords: [] }));
      fixture.detectChanges();
    });

    it('should not add a keyword when the keyword form is invalid', () => {
      component.keyForm.language().value.set('');
      component.keyForm.text().value.set('');
      component.addKeyword();

      expect(component.form.keywords().value().length).toBe(0);
    });

    it('should add a keyword and reset keyValue', () => {
      component.keyForm.language().value.set('eng');
      component.keyForm.text().value.set('foo');
      component.addKeyword();

      expect(plain(component.form.keywords().value())).toEqual([{ language: 'eng', value: 'foo' }]);
      expect(component.keyForm.text().value()).toBe('');
      expect(component.form().dirty()).toBe(true);
    });

    it('should not add a duplicate keyword (same language and value)', () => {
      component.keyForm.language().value.set('eng');
      component.keyForm.text().value.set('foo');
      component.addKeyword();
      component.keyForm.language().value.set('eng');
      component.keyForm.text().value.set('foo');
      component.addKeyword();

      expect(component.form.keywords().value().length).toBe(1);
    });

    it('should delete a keyword by index', () => {
      component.form.keywords().value.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.deleteKeyword(0);

      expect(plain(component.form.keywords().value())).toEqual([{ language: 'eng', value: 'b' }]);
    });

    it('should not move the first keyword up', () => {
      component.form.keywords().value.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.moveKeywordUp(0);

      expect(plain(component.form.keywords().value())).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);
    });

    it('should move a keyword up', () => {
      component.form.keywords().value.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.moveKeywordUp(1);

      expect(plain(component.form.keywords().value())).toEqual([
        { language: 'eng', value: 'b' },
        { language: 'eng', value: 'a' },
      ]);
    });

    it('should not move the last keyword down', () => {
      component.form.keywords().value.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.moveKeywordDown(1);

      expect(plain(component.form.keywords().value())).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);
    });

    it('should move a keyword down', () => {
      component.form.keywords().value.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'b' },
      ]);

      component.moveKeywordDown(0);

      expect(plain(component.form.keywords().value())).toEqual([
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
      component.form.lastPage().value.set(5);
      component.form.firstPage().value.set(10);
      // the sync is an effect: it runs with change detection
      fixture.detectChanges();

      expect(component.form.lastPage().value()).toBe(10);
    });

    it('should not change lastPage when it is already >= firstPage', () => {
      component.form.lastPage().value.set(30);
      component.form.firstPage().value.set(10);
      fixture.detectChanges();

      expect(component.form.lastPage().value()).toBe(30);
    });

    it('should not change lastPage when lastPage is not set', () => {
      component.form.firstPage().value.set(10);
      fixture.detectChanges();

      expect(component.form.lastPage().value()).toBeNull();
    });
  });

  it('should stop the first/last page sync when destroyed', () => {
    fixture.componentRef.setInput('entry', getEntry({ firstPage: undefined, lastPage: undefined }));
    fixture.detectChanges();

    component.form.lastPage().value.set(5);
    fixture.destroy();
    component.form.firstPage().value.set(10);
    TestBed.tick();

    // after destroy, the auto-sync logic must no longer run
    expect(component.form.lastPage().value()).toBe(5);
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
