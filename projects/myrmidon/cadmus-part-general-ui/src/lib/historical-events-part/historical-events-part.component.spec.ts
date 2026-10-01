import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { ItemService } from '@myrmidon/cadmus-api';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';

import { HistoricalEventsPartComponent } from './historical-events-part.component';
import {
  HistoricalEvent,
  HistoricalEventsPart,
  HISTORICAL_EVENTS_PART_TYPEID,
} from '../historical-events-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function makePart(
  overrides?: Partial<HistoricalEventsPart>,
): HistoricalEventsPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: HISTORICAL_EVENTS_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    events: [],
    ...overrides,
  };
}

function makeEvent(overrides?: Partial<HistoricalEvent>): HistoricalEvent {
  return {
    eid: 'e1',
    type: 'birth',
    ...overrides,
  };
}

describe('HistoricalEventsPartComponent', () => {
  let component: HistoricalEventsPartComponent;
  let fixture: ComponentFixture<HistoricalEventsPartComponent>;
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
      imports: [HistoricalEventsPartComponent],
      providers: [
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
        { provide: DialogService, useValue: dialogService },
        {
          provide: ItemService,
          useValue: { searchPins: vi.fn().mockReturnValue(of({ value: { items: [] } })) },
        },
        { provide: 'indexLookupDefinitions', useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricalEventsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onDataSet / updateForm', () => {
    it('should close the editor and reset the form when data is undefined', () => {
      const data: EditedObject<HistoricalEventsPart> = {
        value: makePart({ events: [makeEvent()] }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      component.editEvent(makeEvent(), 0);
      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();
      expect(component.editedEventIndex()).toBe(-1);
      expect(component.editedEvent()).toBeUndefined();
      expect(plain(component.form.events().value())).toEqual([]);
    });

    it('should populate the events control from the part and close any open editor', () => {
      component.editEvent(makeEvent(), 0);
      const events = [makeEvent({ eid: 'a' }), makeEvent({ eid: 'b' })];
      const data: EditedObject<HistoricalEventsPart> = {
        value: makePart({ events }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(plain(component.form.events().value())).toEqual(events);
      expect(component.editedEventIndex()).toBe(-1);
      expect(component.editedEvent()).toBeUndefined();
      expect(component.form().dirty()).toBe(false);
    });

    it('should populate all thesaurus-driven entry signals when present', () => {
      const thesauri: ThesauriSet = {
        'event-types': { id: 'event-types@en', entries: [{ id: 't1', value: 'T1' }] },
        'event-tags': { id: 'event-tags@en', entries: [{ id: 'g1', value: 'G1' }] },
        'event-relations': { id: 'event-relations@en', entries: [{ id: 'r1', value: 'R1' }] },
        'chronotope-tags': { id: 'chronotope-tags@en', entries: [{ id: 'c1', value: 'C1' }] },
        'assertion-tags': { id: 'assertion-tags@en', entries: [{ id: 'a1', value: 'A1' }] },
        'doc-reference-tags': { id: 'doc-reference-tags@en', entries: [{ id: 'd1', value: 'D1' }] },
        'doc-reference-types': { id: 'doc-reference-types@en', entries: [{ id: 'e1', value: 'E1' }] },
        'pin-link-scopes': { id: 'pin-link-scopes@en', entries: [{ id: 's1', value: 'S1' }] },
        'pin-link-tags': { id: 'pin-link-tags@en', entries: [{ id: 'p1', value: 'P1' }] },
        'asserted-id-features': { id: 'asserted-id-features@en', entries: [{ id: 'f1', value: 'F1' }] },
      };
      const data: EditedObject<HistoricalEventsPart> = {
        value: makePart(),
        thesauri,
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(component.eventTypeEntries()).toEqual(thesauri['event-types'].entries);
      expect(component.eventTagEntries()).toEqual(thesauri['event-tags'].entries);
      expect(component.relationEntries()).toEqual(thesauri['event-relations'].entries);
      expect(component.ctTagEntries()).toEqual(thesauri['chronotope-tags'].entries);
      expect(component.assTagEntries()).toEqual(thesauri['assertion-tags'].entries);
      expect(component.refTagEntries()).toEqual(thesauri['doc-reference-tags'].entries);
      expect(component.refTypeEntries()).toEqual(thesauri['doc-reference-types'].entries);
      expect(component.idScopeEntries()).toEqual(thesauri['pin-link-scopes'].entries);
      expect(component.idTagEntries()).toEqual(thesauri['pin-link-tags'].entries);
      expect(component.idFeatureEntries()).toEqual(thesauri['asserted-id-features'].entries);
    });

    it('should clear all thesaurus-driven entry signals when their keys are absent', () => {
      const data: EditedObject<HistoricalEventsPart> = {
        value: makePart(),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(component.eventTypeEntries()).toBeUndefined();
      expect(component.eventTagEntries()).toBeUndefined();
      expect(component.relationEntries()).toBeUndefined();
      expect(component.ctTagEntries()).toBeUndefined();
      expect(component.assTagEntries()).toBeUndefined();
      expect(component.refTagEntries()).toBeUndefined();
      expect(component.refTypeEntries()).toBeUndefined();
      expect(component.idScopeEntries()).toBeUndefined();
      expect(component.idTagEntries()).toBeUndefined();
      expect(component.idFeatureEntries()).toBeUndefined();
    });
  });

  describe('getValue', () => {
    it('should build a HistoricalEventsPart from the current events control', () => {
      const events = [makeEvent()];
      const data: EditedObject<HistoricalEventsPart> = {
        value: makePart(),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      component.form.events().value.set(events);

      const part = (component as any).getValue() as HistoricalEventsPart;
      expect(part.events).toEqual(events);
      expect(part.typeId).toBe(HISTORICAL_EVENTS_PART_TYPEID);
    });

    it('should default events to an empty array when the part has none', () => {
      const data: EditedObject<HistoricalEventsPart> = {
        value: makePart({ events: undefined as any }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      const part = (component as any).getValue() as HistoricalEventsPart;
      expect(part.events).toEqual([]);
    });
  });

  describe('addEvent / editEvent / closeEvent', () => {
    it('should open a new event with the first event type as default', () => {
      const data: EditedObject<HistoricalEventsPart> = {
        value: makePart(),
        thesauri: {
          'event-types': {
            id: 'event-types@en',
            entries: [{ id: 't1', value: 'T1' }],
          },
        },
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      component.addEvent();

      expect(component.editedEventIndex()).toBe(-1);
      expect(component.editedEvent()).toEqual({ eid: '', type: 't1' });
    });

    it('should default type to empty string when there are no event-type entries', () => {
      component.addEvent();
      expect(component.editedEvent()).toEqual({ eid: '', type: '' });
    });

    it('should set editedEventIndex/editedEvent to a deep clone on editEvent', () => {
      const ev = makeEvent({ eid: 'x' });
      component.editEvent(ev, 2);
      expect(component.editedEventIndex()).toBe(2);
      expect(component.editedEvent()).toEqual(ev);
      expect(component.editedEvent()).not.toBe(ev);
    });

    it('should reset state on closeEvent', () => {
      component.editEvent(makeEvent(), 1);
      component.closeEvent();
      expect(component.editedEventIndex()).toBe(-1);
      expect(component.editedEvent()).toBeUndefined();
    });
  });

  describe('onEventSave', () => {
    it('should append a new event when editedEventIndex is -1', () => {
      component.form.events().value.set([makeEvent({ eid: 'a' })]);
      component.addEvent();
      const newEvent = makeEvent({ eid: 'b' });

      component.onEventSave(newEvent);

      expect(plain(component.form.events().value())).toEqual([
        makeEvent({ eid: 'a' }),
        newEvent,
      ]);
      expect(component.editedEventIndex()).toBe(-1);
      expect(component.editedEvent()).toBeUndefined();
    });

    it('should replace the event at editedEventIndex when editing an existing one', () => {
      const original = [makeEvent({ eid: 'a' }), makeEvent({ eid: 'b' })];
      component.form.events().value.set(original);
      component.editEvent(original[1], 1);
      const updated = makeEvent({ eid: 'b2' });

      component.onEventSave(updated);

      expect(plain(component.form.events().value())).toEqual([original[0], updated]);
    });

    it('should mark the events control dirty after saving', () => {
      component.addEvent();
      component.onEventSave(makeEvent());
      expect(component.form.events().dirty()).toBe(true);
    });
  });

  describe('deleteEvent', () => {
    it('should not remove the event when the user cancels the confirmation', () => {
      dialogService.confirm.mockReturnValue(of(false));
      const events = [makeEvent({ eid: 'a' })];
      component.form.events().value.set(events);

      component.deleteEvent(0);

      expect(plain(component.form.events().value())).toEqual(events);
    });

    it('should remove the event at the given index when confirmed', () => {
      dialogService.confirm.mockReturnValue(of(true));
      const events = [makeEvent({ eid: 'a' }), makeEvent({ eid: 'b' })];
      component.form.events().value.set(events);

      component.deleteEvent(0);

      expect(plain(component.form.events().value())).toEqual([events[1]]);
    });

    it('should close the editor if the deleted event was the one being edited', () => {
      dialogService.confirm.mockReturnValue(of(true));
      const events = [makeEvent({ eid: 'a' }), makeEvent({ eid: 'b' })];
      component.form.events().value.set(events);
      component.editEvent(events[0], 0);

      component.deleteEvent(0);

      expect(component.editedEventIndex()).toBe(-1);
      expect(component.editedEvent()).toBeUndefined();
    });

    it('should keep the editor open if a different event is deleted', () => {
      dialogService.confirm.mockReturnValue(of(true));
      const events = [makeEvent({ eid: 'a' }), makeEvent({ eid: 'b' })];
      component.form.events().value.set(events);
      component.editEvent(events[1], 1);

      component.deleteEvent(0);

      expect(component.editedEventIndex()).toBe(1);
    });
  });

  describe('moveEventUp / moveEventDown', () => {
    it('should do nothing when moving the first event up', () => {
      const events = [makeEvent({ eid: 'a' }), makeEvent({ eid: 'b' })];
      component.form.events().value.set(events);
      component.moveEventUp(0);
      expect(plain(component.form.events().value())).toEqual(events);
    });

    it('should swap with the previous event when moving up', () => {
      const events = [makeEvent({ eid: 'a' }), makeEvent({ eid: 'b' })];
      component.form.events().value.set(events);
      component.moveEventUp(1);
      expect(plain(component.form.events().value())).toEqual([events[1], events[0]]);
    });

    it('should do nothing when moving the last event down', () => {
      const events = [makeEvent({ eid: 'a' }), makeEvent({ eid: 'b' })];
      component.form.events().value.set(events);
      component.moveEventDown(1);
      expect(plain(component.form.events().value())).toEqual(events);
    });

    it('should swap with the next event when moving down', () => {
      const events = [makeEvent({ eid: 'a' }), makeEvent({ eid: 'b' })];
      component.form.events().value.set(events);
      component.moveEventDown(0);
      expect(plain(component.form.events().value())).toEqual([events[1], events[0]]);
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
