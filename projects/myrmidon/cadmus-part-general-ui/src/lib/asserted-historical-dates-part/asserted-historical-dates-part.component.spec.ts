import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';
import { AssertedHistoricalDate } from '@myrmidon/cadmus-refs-asserted-chronotope';

import { AssertedHistoricalDatesPartComponent } from './asserted-historical-dates-part.component';
import {
  AssertedHistoricalDatesPart,
  ASSERTED_HISTORICAL_DATES_PART_TYPEID,
} from '../asserted-historical-dates-part';

function makePart(
  overrides?: Partial<AssertedHistoricalDatesPart>,
): AssertedHistoricalDatesPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: ASSERTED_HISTORICAL_DATES_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    dates: [],
    ...overrides,
  };
}

function makeDate(value: number): AssertedHistoricalDate {
  return { a: { value } };
}

describe('AssertedHistoricalDatesPartComponent', () => {
  let component: AssertedHistoricalDatesPartComponent;
  let fixture: ComponentFixture<AssertedHistoricalDatesPartComponent>;
  let authUser$: BehaviorSubject<User | null>;
  let appRepository: {
    getTypeThesaurus: ReturnType<typeof vi.fn>;
    getSettingFor: ReturnType<typeof vi.fn>;
  };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authUser$ = new BehaviorSubject<User | null>(null);
    const authService = {
      currentUser$: authUser$,
      get currentUserValue() {
        return authUser$.value;
      },
    };
    appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(undefined),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [AssertedHistoricalDatesPartComponent],
      providers: [
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
        { provide: DialogService, useValue: dialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssertedHistoricalDatesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onDataSet / updateForm', () => {
    it('should reset the form when data is undefined', () => {
      const data: EditedObject<AssertedHistoricalDatesPart> = {
        value: makePart({ dates: [makeDate(100)] }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.dates.value).toEqual([makeDate(100)]);

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();
      expect(component.dates.value).toEqual([]);
    });

    it('should populate the dates control from the part', () => {
      const dates = [makeDate(100), makeDate(200)];
      const data: EditedObject<AssertedHistoricalDatesPart> = {
        value: makePart({ dates }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.dates.value).toEqual(dates);
      expect(component.form.pristine).toBe(true);
    });

    it('should populate all thesaurus-driven entry signals when present', () => {
      const thesauri: ThesauriSet = {
        'asserted-historical-dates-tags': { id: 'x', entries: [{ id: 't1', value: 'T1' }] },
        'assertion-tags': { id: 'x', entries: [{ id: 'a1', value: 'A1' }] },
        'doc-reference-types': { id: 'x', entries: [{ id: 'r1', value: 'R1' }] },
        'doc-reference-tags': { id: 'x', entries: [{ id: 'g1', value: 'G1' }] },
      };
      const data: EditedObject<AssertedHistoricalDatesPart> = {
        value: makePart(),
        thesauri,
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(component.tagEntries()).toEqual(
        thesauri['asserted-historical-dates-tags'].entries,
      );
      expect(component.assertionTagEntries()).toEqual(
        thesauri['assertion-tags'].entries,
      );
      expect(component.docReferenceTypeEntries()).toEqual(
        thesauri['doc-reference-types'].entries,
      );
      expect(component.docReferenceTagEntries()).toEqual(
        thesauri['doc-reference-tags'].entries,
      );
    });

    it('should clear all thesaurus-driven entry signals when their keys are absent', () => {
      const data: EditedObject<AssertedHistoricalDatesPart> = {
        value: makePart(),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(component.tagEntries()).toBeUndefined();
      expect(component.assertionTagEntries()).toBeUndefined();
      expect(component.docReferenceTypeEntries()).toBeUndefined();
      expect(component.docReferenceTagEntries()).toBeUndefined();
    });
  });

  describe('maxDateCount (settings via initSettings)', () => {
    it('should default to -1 (unlimited) when no settings are found', async () => {
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: ASSERTED_HISTORICAL_DATES_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();
      expect(component.maxDateCount()).toBe(-1);
    });

    it('should adopt the maxDateCount from settings when present', async () => {
      appRepository.getSettingFor.mockResolvedValue({ maxDateCount: 2 });
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: ASSERTED_HISTORICAL_DATES_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();
      expect(component.maxDateCount()).toBe(2);
    });
  });

  describe('getValue', () => {
    it('should build an AssertedHistoricalDatesPart from the current dates control', () => {
      const dates = [makeDate(100)];
      const data: EditedObject<AssertedHistoricalDatesPart> = {
        value: makePart(),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      component.dates.setValue(dates);

      const part = (component as any).getValue() as AssertedHistoricalDatesPart;
      expect(part.dates).toEqual(dates);
      expect(part.typeId).toBe(ASSERTED_HISTORICAL_DATES_PART_TYPEID);
    });

    it('should default dates to an empty array when the control value is falsy', () => {
      const data: EditedObject<AssertedHistoricalDatesPart> = {
        value: makePart(),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      component.dates.setValue(null as any);

      const part = (component as any).getValue() as AssertedHistoricalDatesPart;
      expect(part.dates).toEqual([]);
    });
  });

  describe('addDate', () => {
    it('should open a new blank date for editing when under the limit', () => {
      component.addDate();
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toEqual({ a: { value: 0 } });
    });

    it('should refuse to open a new date when at/over the configured maxDateCount', async () => {
      appRepository.getSettingFor.mockResolvedValue({ maxDateCount: 1 });
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: ASSERTED_HISTORICAL_DATES_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();
      expect(component.maxDateCount()).toBe(1);

      component.dates.setValue([makeDate(100)]);
      component.addDate();

      expect(component.edited()).toBeUndefined();
      expect(component.editedIndex()).toBe(-1);
    });

    it('should still allow opening a new date when under the configured maxDateCount', async () => {
      appRepository.getSettingFor.mockResolvedValue({ maxDateCount: 2 });
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: ASSERTED_HISTORICAL_DATES_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      component.dates.setValue([makeDate(100)]);
      component.addDate();

      expect(component.edited()).toEqual({ a: { value: 0 } });
    });
  });

  describe('editDate / closeDate', () => {
    it('should clone the given date for editing', () => {
      const d = makeDate(100);
      component.editDate(d, 2);
      expect(component.editedIndex()).toBe(2);
      expect(component.edited()).toEqual(d);
      expect(component.edited()).not.toBe(d);
    });

    it('should reset state on closeDate', () => {
      component.editDate(makeDate(100), 0);
      component.closeDate();
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });
  });

  describe('saveDate', () => {
    it('should append a new date when editedIndex is -1', () => {
      component.dates.setValue([makeDate(100)]);
      component.addDate();

      component.saveDate(makeDate(200));

      expect(component.dates.value).toEqual([makeDate(100), makeDate(200)]);
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('should replace the date at editedIndex when editing an existing one', () => {
      const original = [makeDate(100), makeDate(200)];
      component.dates.setValue(original);
      component.editDate(original[1], 1);

      component.saveDate(makeDate(300));

      expect(component.dates.value).toEqual([makeDate(100), makeDate(300)]);
    });

    it('should reject a date whose sort value duplicates an existing one', () => {
      component.dates.setValue([makeDate(100)]);
      component.addDate();

      component.saveDate(makeDate(100));

      // unchanged: the duplicate was silently rejected
      expect(component.dates.value).toEqual([makeDate(100)]);
      // the editor stays open since closeDate() is only reached past the
      // duplicate check
      expect(component.editedIndex()).toBe(-1);
    });

    it('should mark the dates control dirty after a successful save', () => {
      component.addDate();
      component.saveDate(makeDate(100));
      expect(component.dates.dirty).toBe(true);
    });
  });

  describe('deleteDate', () => {
    it('should not remove the date when the user cancels the confirmation', () => {
      dialogService.confirm.mockReturnValue(of(false));
      const dates = [makeDate(100)];
      component.dates.setValue(dates);

      component.deleteDate(0);

      expect(component.dates.value).toEqual(dates);
    });

    it('should remove the date at the given index when confirmed', () => {
      dialogService.confirm.mockReturnValue(of(true));
      const dates = [makeDate(100), makeDate(200)];
      component.dates.setValue(dates);

      component.deleteDate(0);

      expect(component.dates.value).toEqual([dates[1]]);
    });

    it('should close the editor if the deleted date was the one being edited', () => {
      dialogService.confirm.mockReturnValue(of(true));
      const dates = [makeDate(100), makeDate(200)];
      component.dates.setValue(dates);
      component.editDate(dates[0], 0);

      component.deleteDate(0);

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });
  });

  describe('moveDateUp / moveDateDown', () => {
    it('should do nothing when moving the first date up', () => {
      const dates = [makeDate(100), makeDate(200)];
      component.dates.setValue(dates);
      component.moveDateUp(0);
      expect(component.dates.value).toEqual(dates);
    });

    it('should swap with the previous date when moving up', () => {
      const dates = [makeDate(100), makeDate(200)];
      component.dates.setValue(dates);
      component.moveDateUp(1);
      expect(component.dates.value).toEqual([dates[1], dates[0]]);
    });

    it('should do nothing when moving the last date down', () => {
      const dates = [makeDate(100), makeDate(200)];
      component.dates.setValue(dates);
      component.moveDateDown(1);
      expect(component.dates.value).toEqual(dates);
    });

    it('should swap with the next date when moving down', () => {
      const dates = [makeDate(100), makeDate(200)];
      component.dates.setValue(dates);
      component.moveDateDown(0);
      expect(component.dates.value).toEqual([dates[1], dates[0]]);
    });
  });
});
