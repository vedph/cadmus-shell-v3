import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { provideNativeDateAdapter } from '@angular/material/core';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';

import { BibliographyPartComponent } from './bibliography-part.component';
import {
  BibliographyPart,
  BibEntry,
  BibAuthor,
  BIBLIOGRAPHY_PART_TYPEID,
} from '../bibliography-part';

function makePart(overrides?: Partial<BibliographyPart>): BibliographyPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: BIBLIOGRAPHY_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    entries: [],
    ...overrides,
  };
}

function makeEntry(overrides?: Partial<BibEntry>): BibEntry {
  return { typeId: 'book', title: 'A title', ...overrides };
}

describe('BibliographyPartComponent', () => {
  let component: BibliographyPartComponent;
  let fixture: ComponentFixture<BibliographyPartComponent>;
  let authUser$: BehaviorSubject<User | null>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authUser$ = new BehaviorSubject<User | null>(null);
    const authService = {
      currentUser$: authUser$,
      get currentUserValue() {
        return authUser$.value;
      },
    };
    const appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(undefined),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [BibliographyPartComponent],
      providers: [
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
        { provide: DialogService, useValue: dialogService },
        // BibliographyEntryComponent (rendered unconditionally by this
        // component's template) uses MatDatepicker for the access date,
        // which requires a DateAdapter to be provided.
        provideNativeDateAdapter(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BibliographyPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onDataSet / updateForm', () => {
    it('should reset the form when data is undefined', () => {
      const data: EditedObject<BibliographyPart> = {
        value: makePart({ entries: [makeEntry()] }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.entries.value).toEqual([makeEntry()]);

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();
      expect(component.entries.value).toEqual([]);
    });

    it('should populate the entries control with a copy of the part entries', () => {
      const entries = [makeEntry({ title: 'A' }), makeEntry({ title: 'B' })];
      const data: EditedObject<BibliographyPart> = {
        value: makePart({ entries }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.entries.value).toEqual(entries);
      expect(component.form.pristine).toBe(true);
    });

    it('should populate all thesaurus-driven entry signals when present', () => {
      const thesauri: ThesauriSet = {
        'bibliography-languages': { id: 'x', entries: [{ id: 'eng', value: 'English' }] },
        'bibliography-types': { id: 'x', entries: [{ id: 'book', value: 'Book' }] },
        'bibliography-tags': { id: 'x', entries: [{ id: 'tag1', value: 'Tag1' }] },
        'bibliography-author-roles': { id: 'x', entries: [{ id: 'editor', value: 'Editor' }] },
      };
      const data: EditedObject<BibliographyPart> = { value: makePart(), thesauri };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(component.langEntries()).toEqual(thesauri['bibliography-languages'].entries);
      expect(component.typeEntries()).toEqual(thesauri['bibliography-types'].entries);
      expect(component.tagEntries()).toEqual(thesauri['bibliography-tags'].entries);
      expect(component.roleEntries()).toEqual(thesauri['bibliography-author-roles'].entries);
    });

    it('should clear all thesaurus-driven entry signals when their keys are absent', () => {
      const data: EditedObject<BibliographyPart> = { value: makePart(), thesauri: {} };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(component.langEntries()).toBeUndefined();
      expect(component.typeEntries()).toBeUndefined();
      expect(component.tagEntries()).toBeUndefined();
      expect(component.roleEntries()).toBeUndefined();
    });
  });

  describe('getValue', () => {
    it('should build a BibliographyPart from the current entries control', () => {
      const entries = [makeEntry()];
      const data: EditedObject<BibliographyPart> = { value: makePart(), thesauri: {} };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      component.entries.setValue(entries);

      const part = (component as any).getValue() as BibliographyPart;
      expect(part.entries).toEqual(entries);
      expect(part.typeId).toBe(BIBLIOGRAPHY_PART_TYPEID);
    });
  });

  describe('addEntry / editEntry / closeEntry', () => {
    it('should open a new entry defaulting typeId/language to the first thesaurus entry', () => {
      const thesauri: ThesauriSet = {
        'bibliography-types': { id: 'x', entries: [{ id: 'book', value: 'Book' }] },
        'bibliography-languages': { id: 'x', entries: [{ id: 'eng', value: 'English' }] },
      };
      const data: EditedObject<BibliographyPart> = { value: makePart(), thesauri };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      component.addEntry();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toEqual({
        typeId: 'book',
        title: '',
        language: 'eng',
      });
    });

    it('should default typeId/language to empty strings when no thesaurus entries exist', () => {
      component.addEntry();
      expect(component.edited()).toEqual({ typeId: '', title: '', language: '' });
    });

    it('should clone the given entry for editing', () => {
      const entry = makeEntry();
      component.editEntry(entry, 2);
      expect(component.editedIndex()).toBe(2);
      expect(component.edited()).toEqual(entry);
      expect(component.edited()).not.toBe(entry);
    });

    it('should reset state on closeEntry', () => {
      component.editEntry(makeEntry(), 0);
      component.closeEntry();
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });
  });

  describe('saveEntry', () => {
    it('should append a new entry when editedIndex is -1', () => {
      component.entries.setValue([makeEntry({ title: 'A' })]);
      component.addEntry();

      component.saveEntry(makeEntry({ title: 'B' }));

      expect(component.entries.value).toEqual([
        makeEntry({ title: 'A' }),
        makeEntry({ title: 'B' }),
      ]);
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('should replace the entry at editedIndex when editing an existing one', () => {
      const original = [makeEntry({ title: 'A' }), makeEntry({ title: 'B' })];
      component.entries.setValue(original);
      component.editEntry(original[1], 1);

      component.saveEntry(makeEntry({ title: 'B2' }));

      expect(component.entries.value).toEqual([original[0], makeEntry({ title: 'B2' })]);
    });

    it('should mark the entries control dirty after saving', () => {
      component.addEntry();
      component.saveEntry(makeEntry());
      expect(component.entries.dirty).toBe(true);
    });

    it('should do nothing when no edit session was opened first', () => {
      component.entries.setValue([]);
      component.saveEntry(makeEntry({ title: 'Unsolicited' }));
      expect(component.entries.value).toEqual([]);
    });
  });

  describe('removeEntry', () => {
    it('should not remove the entry when the user cancels the confirmation', () => {
      dialogService.confirm.mockReturnValue(of(false));
      const entries = [makeEntry()];
      component.entries.setValue(entries);

      component.removeEntry(0);

      expect(component.entries.value).toEqual(entries);
    });

    it('should remove the entry at the given index when confirmed', () => {
      dialogService.confirm.mockReturnValue(of(true));
      const entries = [makeEntry({ title: 'A' }), makeEntry({ title: 'B' })];
      component.entries.setValue(entries);

      component.removeEntry(0);

      expect(component.entries.value).toEqual([entries[1]]);
    });
  });

  describe('moveEntryUp / moveEntryDown', () => {
    it('should do nothing when moving the first entry up', () => {
      const entries = [makeEntry({ title: 'A' }), makeEntry({ title: 'B' })];
      component.entries.setValue(entries);
      component.moveEntryUp(0);
      expect(component.entries.value).toEqual(entries);
    });

    it('should swap with the previous entry when moving up', () => {
      const entries = [makeEntry({ title: 'A' }), makeEntry({ title: 'B' })];
      component.entries.setValue(entries);
      component.moveEntryUp(1);
      expect(component.entries.value).toEqual([entries[1], entries[0]]);
    });

    it('should do nothing when moving the last entry down', () => {
      const entries = [makeEntry({ title: 'A' }), makeEntry({ title: 'B' })];
      component.entries.setValue(entries);
      component.moveEntryDown(1);
      expect(component.entries.value).toEqual(entries);
    });

    it('should swap with the next entry when moving down', () => {
      const entries = [makeEntry({ title: 'A' }), makeEntry({ title: 'B' })];
      component.entries.setValue(entries);
      component.moveEntryDown(0);
      expect(component.entries.value).toEqual([entries[1], entries[0]]);
    });
  });

  describe('getAuthors', () => {
    it('should return an empty string for an empty author list', () => {
      expect(component.getAuthors([])).toBe('');
    });

    it('should render a single author with only a last name', () => {
      const authors: BibAuthor[] = [{ lastName: 'Smith' }];
      expect(component.getAuthors(authors)).toBe('Smith');
    });

    it('should append the first name after a comma when present', () => {
      const authors: BibAuthor[] = [{ lastName: 'Smith', firstName: 'John' }];
      expect(component.getAuthors(authors)).toBe('Smith, John');
    });

    it('should append the role in parentheses when present', () => {
      const authors: BibAuthor[] = [{ lastName: 'Smith', roleId: 'editor' }];
      expect(component.getAuthors(authors)).toBe('Smith (editor)');
    });

    it('should combine first name and role', () => {
      const authors: BibAuthor[] = [
        { lastName: 'Smith', firstName: 'John', roleId: 'editor' },
      ];
      expect(component.getAuthors(authors)).toBe('Smith, John (editor)');
    });

    it('should separate multiple authors with "; "', () => {
      const authors: BibAuthor[] = [
        { lastName: 'Smith' },
        { lastName: 'Jones', firstName: 'Amy' },
      ];
      expect(component.getAuthors(authors)).toBe('Smith; Jones, Amy');
    });
  });
});
