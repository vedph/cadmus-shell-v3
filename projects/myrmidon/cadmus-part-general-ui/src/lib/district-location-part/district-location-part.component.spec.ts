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
    component.place.setValue(null);
    expect(component.place.hasError('required')).toBe(true);
    component.place.setValue({ language: 'eng', pieces: [] });
    expect(component.place.valid).toBe(true);
  });

  it('should limit note to maxLength(5000)', () => {
    component.note.setValue('a'.repeat(5001));
    expect(component.note.hasError('maxlength')).toBe(true);
    component.note.setValue('short note');
    expect(component.note.valid).toBe(true);
  });
  //#endregion

  //#region onDataSet
  it('should reset name/form when data has no value', () => {
    component.place.setValue({ language: 'eng', pieces: [] });
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(component.name()).toBeUndefined();
    expect(component.place.value).toBeNull();
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
    expect(component.place.value).toEqual(place);
    expect(component.note.value).toBe('a note');
    expect(component.form.pristine).toBe(true);
  });

  it('should default note to null when missing', () => {
    const place: ProperName = { language: 'eng', pieces: [] };
    fixture.componentRef.setInput('data', {
      value: buildPart(place),
      thesauri: {},
    });
    fixture.detectChanges();
    expect(component.note.value).toBeNull();
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
    expect(component.place.dirty).toBe(false);
    component.onNameChange(name);
    expect(component.place.value).toEqual(name);
    expect(component.place.dirty).toBe(true);
  });

  it('onNameChange should set place to null when given undefined', () => {
    component.onNameChange(undefined);
    expect(component.place.value).toBeNull();
  });
  //#endregion

  //#region getValue
  it('getValue should trim the note and set it undefined when blank', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart({ language: 'eng', pieces: [] }),
      thesauri: {},
    });
    fixture.detectChanges();
    component.place.setValue({ language: 'eng', pieces: [] });
    component.note.setValue('  padded  ');

    let value = (component as any).getValue() as DistrictLocationPart;
    expect(value.note).toBe('padded');

    component.note.setValue('   ');
    value = (component as any).getValue() as DistrictLocationPart;
    expect(value.note).toBeUndefined();
  });

  it('getValue should fall back to an empty place when the control is null', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart({ language: 'eng', pieces: [] }),
      thesauri: {},
    });
    fixture.detectChanges();
    component.place.setValue(null);

    const value = (component as any).getValue() as DistrictLocationPart;
    expect(value.place).toEqual({ language: '', pieces: [] });
  });
  //#endregion
});
