import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';
import { ProperName } from '@myrmidon/cadmus-refs-proper-name';

import { DistrictLocationPartComponent } from './district-location-part.component';
import { DistrictLocationPart } from '../district-location-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function buildPart(place: ProperName, note?: string): DistrictLocationPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.district-location',
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    place,
    note,
  };
}

describe('DistrictLocationPartComponent', () => {
  let component: DistrictLocationPartComponent;
  let fixture: ComponentFixture<DistrictLocationPartComponent>;
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
      imports: [DistrictLocationPartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DistrictLocationPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region validators
  it('should require place', () => {
    component.form.place().value.set(null);
    expect(!!component.form.place().getError('required')).toBe(true);
    component.form.place().value.set({ language: 'eng', pieces: [] });
    expect(component.form.place().valid()).toBe(true);
  });

  it('should limit note to maxLength(5000)', () => {
    component.form.note().value.set('a'.repeat(5001));
    expect(!!component.form.note().getError('maxLength')).toBe(true);
    component.form.note().value.set('short note');
    expect(component.form.note().valid()).toBe(true);
  });
  //#endregion

  //#region onDataSet
  it('should reset name/form when data has no value', () => {
    component.form.place().value.set({ language: 'eng', pieces: [] });
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(component.name()).toBeUndefined();
    expect(plain(component.form.place().value())).toBeNull();
  });

  it('should populate name/place/note from the part', () => {
    const place: ProperName = {
      language: 'eng',
      pieces: [{ type: 'district', value: 'Downtown' }],
    };
    const data: EditedObject<DistrictLocationPart> = {
      value: buildPart(place, 'a note'),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.name()).toEqual(place);
    expect(plain(component.form.place().value())).toEqual(place);
    expect(plain(component.form.note().value())).toBe('a note');
    expect(component.form().dirty()).toBe(false);
  });

  it('should default note to null when missing', () => {
    const place: ProperName = { language: 'eng', pieces: [] };
    fixture.componentRef.setInput('data', {
      value: buildPart(place),
      thesauri: {},
    });
    fixture.detectChanges();
    expect(component.form.note().value()).toBe('');
  });

  it('should populate thesaurus entry signals only for thesauri present in the data', () => {
    const thesauri: ThesauriSet = {
      'district-name-piece-types': {
        id: 'district-name-piece-types@en',
        entries: [{ id: 'district', value: 'District' }],
      },
    };
    const data: EditedObject<DistrictLocationPart> = {
      value: buildPart({ language: 'eng', pieces: [] }),
      thesauri,
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.typeEntries()).toEqual([{ id: 'district', value: 'District' }]);
    expect(component.langEntries()).toBeUndefined();
  });
  //#endregion

  //#region onNameChange
  it('onNameChange should update and dirty the place control', () => {
    const name: ProperName = { language: 'eng', pieces: [] };
    expect(component.form.place().dirty()).toBe(false);
    component.onNameChange(name);
    expect(plain(component.form.place().value())).toEqual(name);
    expect(component.form.place().dirty()).toBe(true);
  });

  it('onNameChange should set place to null when given undefined', () => {
    component.onNameChange(undefined);
    expect(plain(component.form.place().value())).toBeNull();
  });
  //#endregion

  //#region getValue
  it('getValue should trim the note and set it undefined when blank', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart({ language: 'eng', pieces: [] }),
      thesauri: {},
    });
    fixture.detectChanges();
    component.form.place().value.set({ language: 'eng', pieces: [] });
    component.form.note().value.set('  padded  ');

    let value = (component as any).getValue() as DistrictLocationPart;
    expect(value.note).toBe('padded');

    component.form.note().value.set('   ');
    value = (component as any).getValue() as DistrictLocationPart;
    expect(value.note).toBeUndefined();
  });

  it('getValue should fall back to an empty place when the control is null', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart({ language: 'eng', pieces: [] }),
      thesauri: {},
    });
    fixture.detectChanges();
    component.form.place().value.set(null);

    const value = (component as any).getValue() as DistrictLocationPart;
    expect(value.place).toEqual({ language: '', pieces: [] });
  });
  //#endregion

  it('should render its editor and buttons inside no <form>', () => {
    const buttons: HTMLElement = fixture.nativeElement.querySelector(
      'cadmus-close-save-buttons',
    );
    expect(buttons).toBeTruthy();
    expect(buttons.closest('form')).toBeNull();
  });

  it('should show the note length error once the note is touched', () => {
    component.form.note().value.set('x'.repeat(5001));
    component.form.note().markAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('note too long');
  });

  it('should save the place and the trimmed note', () => {
    const place: ProperName = {
      language: 'ita',
      pieces: [{ type: 'city', value: 'Roma' }],
    };
    fixture.componentRef.setInput('data', {
      value: buildPart(place),
      thesauri: {},
    });
    fixture.detectChanges();
    const textarea: HTMLTextAreaElement =
      fixture.nativeElement.querySelector('textarea');
    textarea.value = ' a note ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.isDirty()).toBe(true);

    component.save();

    expect(component.data()!.value!.note).toBe('a note');
    expect(component.data()!.value!.place).toEqual(place);
    expect(component.isDirty()).toBe(false);
  });
});
