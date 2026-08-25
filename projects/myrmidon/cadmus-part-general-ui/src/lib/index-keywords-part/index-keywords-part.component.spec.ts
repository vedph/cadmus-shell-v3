import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, PartIdentity } from '@myrmidon/cadmus-core';

import { IndexKeywordsPartComponent } from './index-keywords-part.component';
import { IndexKeywordComponent } from '../index-keyword/index-keyword.component';
import {
  IndexKeywordsPart,
  IndexKeyword,
  INDEX_KEYWORDS_PART_TYPEID,
} from '../index-keywords-part';

describe('IndexKeywordsPartComponent', () => {
  let component: IndexKeywordsPartComponent;
  let fixture: ComponentFixture<IndexKeywordsPartComponent>;
  let currentUser$: BehaviorSubject<User | null>;
  let getSettingFor: ReturnType<typeof vi.fn>;

  const identity: PartIdentity = {
    itemId: 'item1',
    typeId: INDEX_KEYWORDS_PART_TYPEID,
    partId: null,
    roleId: null,
  };

  async function setup(settingValue: any = undefined) {
    TestBed.resetTestingModule();
    currentUser$ = new BehaviorSubject<User | null>(null);
    getSettingFor = vi.fn().mockResolvedValue(settingValue);

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        IndexKeywordComponent,
        IndexKeywordsPartComponent,
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: AuthJwtService,
          useValue: { currentUser$, currentUserValue: null },
        },
        {
          provide: AppRepository,
          useValue: {
            getTypeThesaurus: vi.fn(),
            getSettingFor,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IndexKeywordsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setup(undefined);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults noIndexId to false when no setting is found', async () => {
    await fixture.whenStable();
    expect(component.noIndexId()).toBe(false);
  });

  it('sets noIndexId to true when the setting requests it', async () => {
    await setup({ noIndexId: true });
    await fixture.whenStable();
    expect(component.noIndexId()).toBe(true);
  });

  it('builds a form with a keywords control requiring at least 1 item', () => {
    expect(component.form.get('keywords')).toBeTruthy();
    expect(component.keywords.value).toEqual([]);
    expect(component.keywords.invalid).toBe(true);
  });

  it('resets the form when data has no value', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    expect(component.keywords.value).toEqual([]);
  });

  it('populates thesauri signals from data and clears missing ones', () => {
    const data: EditedObject<IndexKeywordsPart> = {
      value: null,
      thesauri: {
        languages: { id: 'languages', entries: [{ id: 'eng', value: 'English' }] },
        // keyword-indexes and keyword-tags intentionally missing
      },
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.langEntries()).toEqual([{ id: 'eng', value: 'English' }]);
    expect(component.idxEntries()).toBeUndefined();
    expect(component.tagEntries()).toBeUndefined();
  });

  it('updates the keywords form control from part data', () => {
    const keywords: IndexKeyword[] = [{ language: 'eng', value: 'hi' }];
    const part: IndexKeywordsPart = {
      id: 'p1',
      itemId: 'item1',
      typeId: INDEX_KEYWORDS_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'c',
      timeModified: new Date(),
      userId: 'u',
      keywords,
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: part, thesauri: {} });
    fixture.detectChanges();

    expect(component.keywords.value).toEqual(keywords);
    expect(component.form.pristine).toBe(true);
  });

  it('getValue returns a part with a copy of the current keywords', () => {
    const part: IndexKeywordsPart = {
      id: 'p1',
      itemId: 'item1',
      typeId: INDEX_KEYWORDS_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'c',
      timeModified: new Date(),
      userId: 'u',
      keywords: [{ language: 'eng', value: 'hi' }],
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: part, thesauri: {} });
    fixture.detectChanges();

    const value = (component as any).getValue() as IndexKeywordsPart;
    expect(value.id).toBe('p1');
    expect(value.keywords).toEqual(part.keywords);
    expect(value.keywords).not.toBe(component.keywords.value);
  });

  it('addKeyword defaults language to the first langEntries id', () => {
    const data: EditedObject<IndexKeywordsPart> = {
      value: null,
      thesauri: {
        languages: {
          id: 'languages',
          entries: [
            { id: 'eng', value: 'English' },
            { id: 'ita', value: 'Italian' },
          ],
        },
      },
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    component.addKeyword();

    expect(component.editedKeywordIndex()).toBe(-1);
    expect(component.editedKeyword()).toEqual({ language: 'eng', value: '' });
  });

  it('addKeyword defaults language to empty string when no langEntries', () => {
    component.addKeyword();
    expect(component.editedKeyword()).toEqual({ language: '', value: '' });
  });

  it('editKeyword clones the entry (deep copy)', () => {
    const entry: IndexKeyword = { language: 'eng', value: 'hi', note: 'n' };
    component.editKeyword(entry, 2);

    expect(component.editedKeywordIndex()).toBe(2);
    expect(component.editedKeyword()).toEqual(entry);
    expect(component.editedKeyword()).not.toBe(entry);

    entry.note = 'changed';
    expect(component.editedKeyword()?.note).toBe('n');
  });

  it('closeKeyword resets editing state', () => {
    component.editKeyword({ language: 'eng', value: 'hi' }, 0);
    component.closeKeyword();
    expect(component.editedKeywordIndex()).toBe(-1);
    expect(component.editedKeyword()).toBeUndefined();
  });

  it('saveKeyword appends a new keyword when editedKeywordIndex is -1', () => {
    component.addKeyword();
    component.saveKeyword({ language: 'eng', value: 'hi' });

    expect(component.keywords.value).toEqual([{ language: 'eng', value: 'hi' }]);
    expect(component.keywords.dirty).toBe(true);
    expect(component.editedKeywordIndex()).toBe(-1);
    expect(component.editedKeyword()).toBeUndefined();
  });

  it('saveKeyword replaces the keyword at the edited index', () => {
    component.keywords.setValue([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b' },
    ]);
    component.editKeyword(component.keywords.value[1], 1);

    component.saveKeyword({ language: 'eng', value: 'b2' });

    expect(component.keywords.value).toEqual([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b2' },
    ]);
  });

  it('deleteKeyword removes the keyword at the given index (no confirmation dialog)', () => {
    component.keywords.setValue([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b' },
    ]);

    component.deleteKeyword(0);

    expect(component.keywords.value).toEqual([{ language: 'eng', value: 'b' }]);
  });

  it('deleteKeyword closes the editor when deleting the currently edited keyword', () => {
    component.keywords.setValue([{ language: 'eng', value: 'a' }]);
    component.editKeyword(component.keywords.value[0], 0);

    component.deleteKeyword(0);

    expect(component.editedKeywordIndex()).toBe(-1);
    expect(component.editedKeyword()).toBeUndefined();
  });

  it('moveKeywordUp does nothing for index 0', () => {
    component.keywords.setValue([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b' },
    ]);
    component.moveKeywordUp(0);
    expect(component.keywords.value).toEqual([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b' },
    ]);
  });

  it('moveKeywordUp swaps entries and tracks the moved edited index', () => {
    component.keywords.setValue([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b' },
    ]);
    component.editedKeywordIndex.set(1); // editing 'b', which moves up

    component.moveKeywordUp(1);

    expect(component.keywords.value).toEqual([
      { language: 'eng', value: 'b' },
      { language: 'eng', value: 'a' },
    ]);
    expect(component.editedKeywordIndex()).toBe(0);
  });

  it('moveKeywordUp tracks the other swapped entry when it was the edited one', () => {
    component.keywords.setValue([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b' },
    ]);
    component.editedKeywordIndex.set(0); // editing 'a', which is displaced to index 1

    component.moveKeywordUp(1);

    expect(component.editedKeywordIndex()).toBe(1);
  });

  it('moveKeywordDown does nothing for the last index', () => {
    component.keywords.setValue([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b' },
    ]);
    component.moveKeywordDown(1);
    expect(component.keywords.value).toEqual([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b' },
    ]);
  });

  it('moveKeywordDown swaps entries and tracks the moved edited index', () => {
    component.keywords.setValue([
      { language: 'eng', value: 'a' },
      { language: 'eng', value: 'b' },
    ]);
    component.editedKeywordIndex.set(0); // editing 'a', which moves down

    component.moveKeywordDown(0);

    expect(component.keywords.value).toEqual([
      { language: 'eng', value: 'b' },
      { language: 'eng', value: 'a' },
    ]);
    expect(component.editedKeywordIndex()).toBe(1);
  });
});
