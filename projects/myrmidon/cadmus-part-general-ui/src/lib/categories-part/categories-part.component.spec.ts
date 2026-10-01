import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormField } from '@angular/forms/signals';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesaurusEntry } from '@myrmidon/cadmus-core';

import { CategoriesPartComponent } from './categories-part.component';
import { CategoriesPart, CATEGORIES_PART_TYPEID } from '../categories-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function buildPart(categories: string[]): CategoriesPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: CATEGORIES_PART_TYPEID,
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    categories,
  };
}

describe('CategoriesPartComponent', () => {
  let component: CategoriesPartComponent;
  let fixture: ComponentFixture<CategoriesPartComponent>;
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };
  let appRepository: { getTypeThesaurus: ReturnType<typeof vi.fn>; getSettingFor: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      currentUserValue: null,
    };
    appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormField,
        CategoriesPartComponent,
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoriesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('categories control should require at least 1 entry', () => {
    expect(plain(component.form.categories().value())).toEqual([]);
    expect(!!component.form.categories().getError('strictMinLength')).toBe(true);
    component.form.categories().value.set([{ id: 'c1', value: 'Cat 1' }]);
    expect(component.form.categories().valid()).toBe(true);
  });

  //#region onDataSet / updateForm
  it('should reset categories when the data has no value', () => {
    component.form.categories().value.set([{ id: 'c1', value: 'Cat 1' }]);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(plain(component.form.categories().value())).toEqual([]);
  });

  it('should populate the categories thesaurus entries signal from the data', () => {
    const entries: ThesaurusEntry[] = [
      { id: 'animal', value: 'Animal' },
      { id: 'plant', value: 'Plant' },
    ];
    const data: EditedObject<CategoriesPart> = {
      value: buildPart([]),
      thesauri: { categories: { id: 'categories@en', entries } },
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.entries()).toEqual(entries);
  });

  it('should map category IDs to their thesaurus entries and sort by display value', () => {
    const entries: ThesaurusEntry[] = [
      { id: 'animal', value: 'Zebra' },
      { id: 'plant', value: 'Apple tree' },
    ];
    const data: EditedObject<CategoriesPart> = {
      value: buildPart(['animal', 'plant']),
      thesauri: { categories: { id: 'categories@en', entries } },
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    // sorted alphabetically by value: "Apple tree" before "Zebra"
    expect(plain(component.form.categories().value())).toEqual([
      { id: 'plant', value: 'Apple tree' },
      { id: 'animal', value: 'Zebra' },
    ]);
    expect(component.form().dirty()).toBe(false);
  });

  it('should fall back to {id, value: id} for category IDs not found in the thesaurus', () => {
    const entries: ThesaurusEntry[] = [{ id: 'animal', value: 'Animal' }];
    const data: EditedObject<CategoriesPart> = {
      value: buildPart(['animal', 'unknown-id']),
      thesauri: { categories: { id: 'categories@en', entries } },
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    // sorted by value: "Animal" < "unknown-id" (capital A sorts before
    // lowercase u in localeCompare)
    expect(plain(component.form.categories().value())).toEqual([
      { id: 'animal', value: 'Animal' },
      { id: 'unknown-id', value: 'unknown-id' },
    ]);
  });

  it('should clear thesaurus entries when a later data update omits them', () => {
    const entries: ThesaurusEntry[] = [{ id: 'animal', value: 'Animal' }];
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: { categories: { id: 'categories@en', entries } },
    });
    fixture.detectChanges();
    expect(component.entries()).toEqual(entries);

    // a later update with the SAME 'animal' category id, but no
    // 'categories' thesaurus this time
    fixture.componentRef.setInput('data', {
      value: buildPart(['animal']),
      thesauri: {},
    });
    fixture.detectChanges();

    expect(component.entries()).toBeUndefined();
    // falls back to {id: 'animal', value: 'animal'} since the thesaurus
    // entries are no longer available to resolve a display value
    expect(plain(component.form.categories().value())).toEqual([
      { id: 'animal', value: 'animal' },
    ]);
  });
  //#endregion

  //#region getValue
  it('getValue should extract the category IDs from the selected entries', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.form.categories().value.set([
      { id: 'c1', value: 'Cat 1' },
      { id: 'c2', value: 'Cat 2' },
    ]);

    const value = (component as any).getValue() as CategoriesPart;
    expect(value.categories).toEqual(['c1', 'c2']);
  });
  //#endregion

  //#region onEntryChange
  it('onEntryChange should add a new entry and sort by display value', () => {
    component.form.categories().value.set([{ id: 'z', value: 'Zebra' }]);
    component.onEntryChange({ id: 'a', value: 'Apple' });

    expect(plain(component.form.categories().value())).toEqual([
      { id: 'a', value: 'Apple' },
      { id: 'z', value: 'Zebra' },
    ]);
    expect(component.form.categories().dirty()).toBe(true);
  });

  it('onEntryChange should not add a duplicate entry (same id)', () => {
    component.form.categories().value.set([{ id: 'a', value: 'Apple' }]);
    component.onEntryChange({ id: 'a', value: 'Apple (renamed)' });

    // unchanged: the guard returns early before setValue/markAsDirty
    expect(plain(component.form.categories().value())).toEqual([{ id: 'a', value: 'Apple' }]);
    expect(component.form.categories().dirty()).toBe(false);
  });
  //#endregion

  //#region removeCategory
  it('removeCategory should remove the entry at the given index and dirty the control', () => {
    component.form.categories().value.set([
      { id: 'a', value: 'Apple' },
      { id: 'b', value: 'Banana' },
    ]);
    component.removeCategory(0);

    expect(plain(component.form.categories().value())).toEqual([{ id: 'b', value: 'Banana' }]);
    expect(component.form.categories().dirty()).toBe(true);
  });
  //#endregion

  //#region signal form
  it('should not wrap the editor in a <form>', () => {
    // the thesaurus tree renders its own filter form: what matters is
    // that the editor and its buttons are inside no form
    const buttons: HTMLElement = fixture.nativeElement.querySelector(
      'cadmus-close-save-buttons',
    );
    expect(buttons).toBeTruthy();
    expect(buttons.closest('form')).toBeNull();
  });

  it('should save the picked categories as IDs', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.onEntryChange({ id: 'b', value: 'Banana' });
    component.onEntryChange({ id: 'a', value: 'Apple' });
    expect(component.isDirty()).toBe(true);

    component.save();

    expect(component.data()!.value!.categories).toEqual(['a', 'b']);
    expect(component.isDirty()).toBe(false);
  });

  it('should not adopt the picked thesaurus entry objects', () => {
    const entry: ThesaurusEntry = { id: 'a', value: 'Apple' };
    component.onEntryChange(entry);
    fixture.detectChanges();
    expect(Object.getOwnPropertySymbols(entry)).toEqual([]);
  });
  //#endregion

  it('renderLabel should delegate to renderLabelFromLastColon', () => {
    expect(component.renderLabel('a:b:c')).toBe('c');
    expect(component.renderLabel('noColon')).toBe('noColon');
  });
});
