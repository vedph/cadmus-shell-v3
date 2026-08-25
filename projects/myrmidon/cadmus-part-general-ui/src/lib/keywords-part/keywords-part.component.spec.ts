import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';

import { KeywordsPartComponent } from './keywords-part.component';
import { KeywordsPart, Keyword, KEYWORDS_PART_TYPEID } from '../keywords-part';

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
      expect(component.keywords.value).toEqual([{ language: 'eng', value: 'x' }]);

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();
      expect(component.keywords.value).toEqual([]);
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

      expect(component.keywords.value).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'z' },
        { language: 'ita', value: 'b' },
      ]);
      expect(component.form.pristine).toBe(true);
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
      component.newLanguage.setValue(null);
      component.newValue.setValue(null);
      component.addKeyword();
      expect(component.keywords.value).toEqual([]);
    });

    it('should insert the new keyword in sorted order (by language then value)', () => {
      component.keywords.setValue([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'z' },
      ]);

      component.newLanguage.setValue('eng');
      component.newValue.setValue('m');
      component.addKeyword();

      expect(component.keywords.value).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'eng', value: 'm' },
        { language: 'eng', value: 'z' },
      ]);
    });

    it('should append the new keyword at the end when it sorts after all existing ones', () => {
      component.keywords.setValue([{ language: 'eng', value: 'a' }]);

      component.newLanguage.setValue('ita');
      component.newValue.setValue('b');
      component.addKeyword();

      expect(component.keywords.value).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'ita', value: 'b' },
      ]);
    });

    it('should prepend the new keyword when it sorts before all existing ones', () => {
      component.keywords.setValue([{ language: 'ita', value: 'b' }]);

      component.newLanguage.setValue('eng');
      component.newValue.setValue('a');
      component.addKeyword();

      expect(component.keywords.value).toEqual([
        { language: 'eng', value: 'a' },
        { language: 'ita', value: 'b' },
      ]);
    });

    it('should not add a duplicate keyword (same language and value)', () => {
      component.keywords.setValue([{ language: 'eng', value: 'a' }]);

      component.newLanguage.setValue('eng');
      component.newValue.setValue('a');
      component.addKeyword();

      expect(component.keywords.value).toEqual([
        { language: 'eng', value: 'a' },
      ]);
    });

    it('should mark the keywords control dirty after a successful add', () => {
      component.newLanguage.setValue('eng');
      component.newValue.setValue('a');
      component.addKeyword();
      expect(component.keywords.dirty).toBe(true);
    });
  });

  describe('deleteKeyword', () => {
    it('should remove the given keyword instance from the list', () => {
      const k1: Keyword = { language: 'eng', value: 'a' };
      const k2: Keyword = { language: 'ita', value: 'b' };
      component.keywords.setValue([k1, k2]);

      component.deleteKeyword(k1);

      expect(component.keywords.value).toEqual([k2]);
    });
  });
});
