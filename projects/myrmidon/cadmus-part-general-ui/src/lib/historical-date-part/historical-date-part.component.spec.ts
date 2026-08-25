import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import {
  HistoricalDate,
  HistoricalDateModel,
} from '@myrmidon/cadmus-refs-historical-date';
import {
  EditedObject,
  PartIdentity,
  ThesauriSet,
} from '@myrmidon/cadmus-core';

import { HistoricalDatePartComponent } from './historical-date-part.component';
import {
  HistoricalDatePart,
  HISTORICAL_DATE_PART_TYPEID,
} from '../historical-date-part';

describe('HistoricalDatePartComponent', () => {
  let component: HistoricalDatePartComponent;
  let fixture: ComponentFixture<HistoricalDatePartComponent>;
  let appRepository: { getSettingFor: ReturnType<typeof vi.fn>; getTypeThesaurus: ReturnType<typeof vi.fn> };
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };

  const IDENTITY: PartIdentity = {
    itemId: 'item1',
    typeId: HISTORICAL_DATE_PART_TYPEID,
    partId: 'part1',
    roleId: null,
  };

  const REF: DocReference = { citation: 'Cic. Att. 1.1' };

  function getPart(overrides?: Partial<HistoricalDatePart>): HistoricalDatePart {
    return {
      id: 'part1',
      itemId: 'item1',
      typeId: HISTORICAL_DATE_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'zeus',
      timeModified: new Date(),
      userId: 'zeus',
      date: new HistoricalDate({ a: { value: 100 } }),
      references: [REF],
      ...overrides,
    };
  }

  beforeEach(async () => {
    appRepository = {
      getSettingFor: vi.fn().mockResolvedValue(undefined),
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
    };
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      currentUserValue: null,
    };

    await TestBed.configureTestingModule({
      imports: [HistoricalDatePartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AppRepository, useValue: appRepository },
        { provide: AuthJwtService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricalDatePartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default date to a fresh HistoricalDate and references to []', () => {
    expect(component.date.value.a.value).toBe(0);
    expect(component.date.value.b).toBeUndefined();
    expect(component.references.value).toEqual([]);
  });

  it('should have an always-valid form (no validators defined)', () => {
    expect(component.form.valid).toBe(true);
  });

  describe('with identity set', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('identity', IDENTITY);
    });

    it('should populate tagEntries/typeEntries when thesauri present', () => {
      const thesauri: ThesauriSet = {
        'doc-reference-tags': { id: 'doc-reference-tags', entries: [{ id: 't1', value: 'Tag 1' }] },
        'doc-reference-types': { id: 'doc-reference-types', entries: [{ id: 'ty1', value: 'Type 1' }] },
      };
      fixture.componentRef.setInput('data', {
        value: getPart(),
        thesauri,
      } as EditedObject<HistoricalDatePart>);
      fixture.detectChanges();

      expect(component.tagEntries()).toEqual(thesauri['doc-reference-tags'].entries);
      expect(component.typeEntries()).toEqual(thesauri['doc-reference-types'].entries);
    });

    it('should leave tagEntries/typeEntries undefined when thesauri absent', () => {
      fixture.componentRef.setInput('data', {
        value: getPart(),
        thesauri: {},
      } as EditedObject<HistoricalDatePart>);
      fixture.detectChanges();

      expect(component.tagEntries()).toBeUndefined();
      expect(component.typeEntries()).toBeUndefined();
    });

    it('should populate date and references from the part', () => {
      const part = getPart();
      fixture.componentRef.setInput('data', {
        value: part,
        thesauri: {},
      } as EditedObject<HistoricalDatePart>);
      fixture.detectChanges();

      expect(component.date.value).toEqual(part.date);
      expect(component.references.value).toEqual([REF]);
      expect(component.form.pristine).toBe(true);
    });

    it('should default references to [] when the part has none', () => {
      fixture.componentRef.setInput('data', {
        value: getPart({ references: undefined }),
        thesauri: {},
      } as EditedObject<HistoricalDatePart>);
      fixture.detectChanges();

      expect(component.references.value).toEqual([]);
    });

    it('should reset date/references to their defaults when data is unset', () => {
      fixture.componentRef.setInput('data', {
        value: getPart(),
        thesauri: {},
      } as EditedObject<HistoricalDatePart>);
      fixture.detectChanges();

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();

      expect(component.date.value.a.value).toBe(0);
      expect(component.date.value.b).toBeUndefined();
      expect(component.references.value).toEqual([]);
    });

    it('getValue should build a part with references set when non-empty', () => {
      fixture.componentRef.setInput('data', {
        value: getPart(),
        thesauri: {},
      } as EditedObject<HistoricalDatePart>);
      fixture.detectChanges();

      const value = (component as any).getValue() as HistoricalDatePart;
      expect(value.typeId).toBe(HISTORICAL_DATE_PART_TYPEID);
      expect(value.date).toEqual(component.date.value);
      expect(value.references).toEqual([REF]);
    });

    it('getValue should set references to undefined when empty', () => {
      fixture.componentRef.setInput('data', {
        value: getPart({ references: [] }),
        thesauri: {},
      } as EditedObject<HistoricalDatePart>);
      fixture.detectChanges();

      const value = (component as any).getValue() as HistoricalDatePart;
      expect(value.references).toBeUndefined();
    });

    it('onDateChange should update the date control and mark it dirty', () => {
      fixture.componentRef.setInput('data', {
        value: getPart(),
        thesauri: {},
      } as EditedObject<HistoricalDatePart>);
      fixture.detectChanges();

      const newDate: HistoricalDateModel = { a: { value: 200 } };
      component.onDateChange(newDate);

      expect(component.date.value).toEqual(newDate);
      expect(component.date.dirty).toBe(true);
    });

    it('onReferencesChange should update the references control and mark it dirty', () => {
      fixture.componentRef.setInput('data', {
        value: getPart({ references: [] }),
        thesauri: {},
      } as EditedObject<HistoricalDatePart>);
      fixture.detectChanges();

      component.onReferencesChange([REF]);

      expect(component.references.value).toEqual([REF]);
      expect(component.references.dirty).toBe(true);
    });
  });
});
