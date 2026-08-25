import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';
import { PhysicalMeasurement } from '@myrmidon/cadmus-mat-physical-size';

import { PhysicalMeasurementsPartComponent } from './physical-measurements-part.component';
import { PhysicalMeasurementsPart } from '../physical-measurements-part';

function buildPart(measurements: PhysicalMeasurement[]): PhysicalMeasurementsPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: 'it.vedph.physical-measurements',
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    measurements,
  };
}

describe('PhysicalMeasurementsPartComponent', () => {
  let component: PhysicalMeasurementsPartComponent;
  let fixture: ComponentFixture<PhysicalMeasurementsPartComponent>;
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
      imports: [PhysicalMeasurementsPartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhysicalMeasurementsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('measurements control should require at least 1 entry', () => {
    expect(component.measurements.value).toEqual([]);
    expect(component.measurements.hasError('minlength')).toBe(true);

    component.measurements.setValue([{ name: 'height', value: 10, unit: 'cm' }]);
    expect(component.measurements.valid).toBe(true);
  });

  //#region onDataSet
  it('should reset the form when data has no value', () => {
    component.measurements.setValue([{ name: 'height', value: 10, unit: 'cm' }]);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(component.measurements.value).toEqual([]);
  });

  it('should populate measurements from the part', () => {
    const measurements: PhysicalMeasurement[] = [
      { name: 'height', value: 10, unit: 'cm' },
      { name: 'width', value: 5, unit: 'cm' },
    ];
    const data: EditedObject<PhysicalMeasurementsPart> = {
      value: buildPart(measurements),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.measurements.value).toEqual(measurements);
    expect(component.form.pristine).toBe(true);
  });

  it('should populate thesaurus entry signals only for thesauri present in the data', () => {
    const thesauri: ThesauriSet = {
      'physical-size-units': {
        id: 'physical-size-units@en',
        entries: [{ id: 'cm', value: 'centimeters' }],
      },
      // dim-tags and set-names intentionally absent
    };
    const data: EditedObject<PhysicalMeasurementsPart> = {
      value: buildPart([]),
      thesauri,
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.unitEntries()).toEqual([{ id: 'cm', value: 'centimeters' }]);
    expect(component.dimTagEntries()).toBeUndefined();
    expect(component.nameEntries()).toBeUndefined();
  });

  it('should clear thesaurus entry signals when a previously present thesaurus disappears', () => {
    const withThesauri: EditedObject<PhysicalMeasurementsPart> = {
      value: buildPart([]),
      thesauri: {
        'physical-size-units': {
          id: 'physical-size-units@en',
          entries: [{ id: 'cm', value: 'centimeters' }],
        },
      },
    };
    fixture.componentRef.setInput('data', withThesauri);
    fixture.detectChanges();
    expect(component.unitEntries()).toBeTruthy();

    const withoutThesauri: EditedObject<PhysicalMeasurementsPart> = {
      value: buildPart([]),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', withoutThesauri);
    fixture.detectChanges();
    expect(component.unitEntries()).toBeUndefined();
  });
  //#endregion

  //#region getValue
  it('getValue should build the part from the measurements control', () => {
    const measurements: PhysicalMeasurement[] = [
      { name: 'height', value: 10, unit: 'cm' },
    ];
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.measurements.setValue(measurements);

    const value = (component as any).getValue() as PhysicalMeasurementsPart;
    expect(value.measurements).toEqual(measurements);
  });
  //#endregion

  it('onMeasurementsChange should update, dirty and revalidate the control', () => {
    const measurements: PhysicalMeasurement[] = [
      { name: 'height', value: 10, unit: 'cm' },
    ];
    expect(component.measurements.dirty).toBe(false);
    component.onMeasurementsChange(measurements);
    expect(component.measurements.value).toEqual(measurements);
    expect(component.measurements.dirty).toBe(true);
    expect(component.measurements.valid).toBe(true);
  });

  it('onMeasurementsChange should tolerate a falsy argument by using an empty array', () => {
    component.onMeasurementsChange(undefined as any);
    expect(component.measurements.value).toEqual([]);
  });
});
