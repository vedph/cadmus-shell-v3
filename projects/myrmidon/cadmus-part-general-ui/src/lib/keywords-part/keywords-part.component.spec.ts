import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';

import { KeywordsPartComponent } from './keywords-part.component';
import { KeywordsPart, Keyword, KEYWORDS_PART_TYPEID } from '../keywords-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function makePart(overrides?: Partial<KeywordsPart>): KeywordsPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: KEYWORDS_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    keywords: [],
    ...overrides,
  };
}

describe('KeywordsPartComponent', () => {
  let component: KeywordsPartComponent;
  let fixture: ComponentFixture<KeywordsPartComponent>;
  let authUser$: BehaviorSubject<User | null>;

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

    await TestBed.configureTestingModule({
      imports: [KeywordsPartComponent],
      providers: [
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KeywordsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onDataSet / updateThesauri / updateForm', () => {
    it('should reset the form when data is undefined', () => {
      const data: EditedObject<KeywordsPart> = {
        value: makePart({ keywords: [{ language: 'eng', value: 'x' }] }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(plain(component.form.keywords().value())).toEqual([{ language: 'eng', value: 'x' }]);

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();
      expect(plain(component.form.keywords().value())).toEqual([]);
    });

    it('should sort keywords by language then value on load', () => {
      const data: EditedObject<KeywordsPart> = {
        value: makePart({
          keywords: [
            { language: 'ita', value: 'b' },
            { language: 'eng', value: 'z' },
            { language: 'eng', value: 'a' },
          ],
        }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(plain(component.form.keywords().value())).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'z' },
        { language: 'ita', value: 'b' },
      ]);
      expect(component.form().dirty()).toBe(false);
    });

    it('should populate langEntries when the languages thesaurus is present', () => {
      const thesauri: ThesauriSet = {
        languages: {
          id: 'languages@en',
          entries: [
            { id: 'eng', value: 'English' },
            { id: 'ita', value: 'Italian' },
          ],
        },
      };
      const data: EditedObject<KeywordsPart> = {
        value: makePart(),
        thesauri,
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.langEntries()).toEqual(thesauri['languages'].entries);
    });

    it('should clear langEntries when the languages thesaurus is absent', () => {
      const data: EditedObject<KeywordsPart> = {
        value: makePart(),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.langEntries()).toBeUndefined();
    });
  });

  describe('getValue', () => {
    it('should build a KeywordsPart with the current keywords', () => {
      const data: EditedObject<KeywordsPart> = {
        value: makePart({
          keywords: [{ language: 'eng', value: 'a' }],
        }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      const part = (component as any).getValue() as KeywordsPart;
      expect(part.keywords).toEqual([{ language: 'eng', value: 'a' }]);
      expect(part.typeId).toBe(KEYWORDS_PART_TYPEID);
    });
  });

  describe('addKeyword', () => {
    it('should do nothing when the new-keyword form is invalid', () => {
      component.newForm.language().value.set(null);
      component.newForm.text().value.set('');
      component.addKeyword();
      expect(plain(component.form.keywords().value())).toEqual([]);
    });

    it('should insert the new keyword in sorted order (by language then value)', () => {
      component.form.keywords().value.set([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'z' },
      ]);

      component.newForm.language().value.set('eng');
      component.newForm.text().value.set('m');
      component.addKeyword();

      expect(plain(component.form.keywords().value())).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'm' },
        { language: 'eng', value: 'z' },
      ]);
    });

    it('should append the new keyword at the end when it sorts after all existing ones', () => {
      component.form.keywords().value.set([{ language: 'eng', value: 'a' }]);

      component.newForm.language().value.set('ita');
      component.newForm.text().value.set('b');
      component.addKeyword();

      expect(plain(component.form.keywords().value())).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'ita', value: 'b' },
      ]);
    });

    it('should prepend the new keyword when it sorts before all existing ones', () => {
      component.form.keywords().value.set([{ language: 'ita', value: 'b' }]);

      component.newForm.language().value.set('eng');
      component.newForm.text().value.set('a');
      component.addKeyword();

      expect(plain(component.form.keywords().value())).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'ita', value: 'b' },
      ]);
    });

    it('should not add a duplicate keyword (same language and value)', () => {
      component.form.keywords().value.set([{ language: 'eng', value: 'a' }]);

      component.newForm.language().value.set('eng');
      component.newForm.text().value.set('a');
      component.addKeyword();

      expect(plain(component.form.keywords().value())).toEqual([
        { language: 'eng', value: 'a' },
      ]);
    });

    it('should mark the keywords control dirty after a successful add', () => {
      component.newForm.language().value.set('eng');
      component.newForm.text().value.set('a');
      component.addKeyword();
      expect(component.form.keywords().dirty()).toBe(true);
    });
  });

  describe('new keyword input', () => {
    it('should add the keyword on Enter, with no form submission', () => {
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input#value');
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      const enter = new KeyboardEvent('keydown', {
        key: 'Enter',
        cancelable: true,
      });
      input.dispatchEvent(enter);
      fixture.detectChanges();

      expect(plain(component.form.keywords().value())).toEqual([
        { language: 'eng', value: 'typed' },
      ]);
      expect(enter.defaultPrevented).toBe(true);
    });

    it('should save the added keywords', () => {
      fixture.componentRef.setInput('data', {
        value: makePart({ keywords: [] }),
        thesauri: {},
      } as EditedObject<KeywordsPart>);
      fixture.detectChanges();
      component.newForm.text().value.set('k');
      component.addKeyword();
      component.save();
      expect(component.data()!.value!.keywords).toEqual([
        { language: 'eng', value: 'k' },
      ]);
      expect(component.isDirty()).toBe(false);
    });
  });

  describe('deleteKeyword', () => {
    it('should remove the given keyword instance from the list', () => {
      const k1: Keyword = { language: 'eng', value: 'a' };
      const k2: Keyword = { language: 'ita', value: 'b' };
      component.form.keywords().value.set([k1, k2]);

      component.deleteKeyword(k1);

      expect(plain(component.form.keywords().value())).toEqual([k2]);
    });
  });

  it('should render its editor and buttons inside no <form>', () => {
    const buttons: HTMLElement = fixture.nativeElement.querySelector(
      'cadmus-close-save-buttons',
    );
    expect(buttons).toBeTruthy();
    expect(buttons.closest('form')).toBeNull();
  });
});
