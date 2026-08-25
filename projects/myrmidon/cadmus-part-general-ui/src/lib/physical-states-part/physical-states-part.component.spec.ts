import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { PhysicalState } from '@myrmidon/cadmus-mat-physical-state';
import { EditedObject, PartIdentity } from '@myrmidon/cadmus-core';

import { PhysicalStatesPartComponent } from './physical-states-part.component';
import {
  PhysicalStatesPart,
  PHYSICAL_STATES_PART_TYPEID,
} from '../physical-states-part';

describe('PhysicalStatesPartComponent', () => {
  let component: PhysicalStatesPartComponent;
  let fixture: ComponentFixture<PhysicalStatesPartComponent>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let currentUser$: BehaviorSubject<User | null>;

  const identity: PartIdentity = {
    itemId: 'item1',
    typeId: PHYSICAL_STATES_PART_TYPEID,
    partId: null,
    roleId: null,
  };

  beforeEach(async () => {
    currentUser$ = new BehaviorSubject<User | null>(null);
    dialogService = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [PhysicalStatesPartComponent],
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
            getSettingFor: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: DialogService, useValue: dialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhysicalStatesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds a form with an entries control requiring at least 1 item', () => {
    expect(component.form.get('entries')).toBeTruthy();
    expect(component.entries.value).toEqual([]);
    expect(component.entries.invalid).toBe(true);
  });

  it('resets the form when data has no value', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    expect(component.entries.value).toEqual([]);
  });

  it('populates thesauri signals from data and clears missing ones', () => {
    const data: EditedObject<PhysicalStatesPart> = {
      value: null,
      thesauri: {
        'physical-states': { id: 'physical-states', entries: [{ id: 's1', value: 'State 1' }] },
        'physical-state-features': {
          id: 'physical-state-features',
          entries: [{ id: 'f1', value: 'Feature 1' }],
        },
        // physical-state-reporters intentionally missing
      },
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.stateEntries()).toEqual([{ id: 's1', value: 'State 1' }]);
    expect(component.featEntries()).toEqual([{ id: 'f1', value: 'Feature 1' }]);
    expect(component.reporterEntries()).toBeUndefined();
  });

  it('updates the entries form control from part data', () => {
    const states: PhysicalState[] = [{ type: 's1' }, { type: 's2' }];
    const part: PhysicalStatesPart = {
      id: 'p1',
      itemId: 'item1',
      typeId: PHYSICAL_STATES_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'c',
      timeModified: new Date(),
      userId: 'u',
      states,
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: part, thesauri: {} });
    fixture.detectChanges();

    expect(component.entries.value).toEqual(states);
    expect(component.form.pristine).toBe(true);
  });

  it('getValue returns a part with the current entries', () => {
    const part: PhysicalStatesPart = {
      id: 'p1',
      itemId: 'item1',
      typeId: PHYSICAL_STATES_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'c',
      timeModified: new Date(),
      userId: 'u',
      states: [{ type: 's1' }],
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: part, thesauri: {} });
    fixture.detectChanges();

    component.entries.setValue([{ type: 's2' }]);

    const value = (component as any).getValue() as PhysicalStatesPart;
    expect(value.id).toBe('p1');
    expect(value.states).toEqual([{ type: 's2' }]);
  });

  it('addState uses the first stateEntries id when available', () => {
    const data: EditedObject<PhysicalStatesPart> = {
      value: null,
      thesauri: {
        'physical-states': {
          id: 'physical-states',
          entries: [
            { id: 's1', value: 'State 1' },
            { id: 's2', value: 'State 2' },
          ],
        },
      },
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    component.addState();

    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toEqual({ type: 's1' });
  });

  it('addState uses an empty type when no stateEntries are available', () => {
    component.addState();
    expect(component.edited()).toEqual({ type: '' });
  });

  it('editState clones the entry (deep copy)', () => {
    const entry: PhysicalState = { type: 's1', note: 'n' };
    component.editState(entry, 1);

    expect(component.editedIndex()).toBe(1);
    expect(component.edited()).toEqual(entry);
    expect(component.edited()).not.toBe(entry);

    entry.note = 'changed';
    expect(component.edited()?.note).toBe('n');
  });

  it('closeState resets the editing state', () => {
    component.editState({ type: 's1' }, 0);
    component.closeState();
    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toBeUndefined();
  });

  it('saveState appends a new entry when editedIndex is -1', () => {
    component.addState();
    component.saveState({ type: 's1' });

    expect(component.entries.value).toEqual([{ type: 's1' }]);
    expect(component.entries.dirty).toBe(true);
    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toBeUndefined();
  });

  it('saveState replaces the entry at the edited index', () => {
    component.entries.setValue([{ type: 'a' }, { type: 'b' }]);
    component.editState(component.entries.value[1], 1);

    component.saveState({ type: 'b2' });

    expect(component.entries.value).toEqual([{ type: 'a' }, { type: 'b2' }]);
  });

  it('deleteState removes the entry when confirmed', () => {
    component.entries.setValue([{ type: 'a' }, { type: 'b' }]);

    component.deleteState(0);

    expect(dialogService.confirm).toHaveBeenCalled();
    expect(component.entries.value).toEqual([{ type: 'b' }]);
  });

  it('deleteState does not remove the entry when not confirmed', () => {
    dialogService.confirm.mockReturnValue(of(false));
    component.entries.setValue([{ type: 'a' }]);

    component.deleteState(0);

    expect(component.entries.value).toEqual([{ type: 'a' }]);
  });

  it('deleteState closes the editor when deleting the currently edited entry', () => {
    component.entries.setValue([{ type: 'a' }]);
    component.editState(component.entries.value[0], 0);

    component.deleteState(0);

    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toBeUndefined();
  });

  it('moveStateUp does nothing for index 0', () => {
    component.entries.setValue([{ type: 'a' }, { type: 'b' }]);
    component.moveStateUp(0);
    expect(component.entries.value).toEqual([{ type: 'a' }, { type: 'b' }]);
  });

  it('moveStateUp swaps with the previous entry', () => {
    component.entries.setValue([{ type: 'a' }, { type: 'b' }]);
    component.moveStateUp(1);
    expect(component.entries.value).toEqual([{ type: 'b' }, { type: 'a' }]);
  });

  it('moveStateDown does nothing for the last index', () => {
    component.entries.setValue([{ type: 'a' }, { type: 'b' }]);
    component.moveStateDown(1);
    expect(component.entries.value).toEqual([{ type: 'a' }, { type: 'b' }]);
  });

  it('moveStateDown swaps with the next entry', () => {
    component.entries.setValue([{ type: 'a' }, { type: 'b' }]);
    component.moveStateDown(0);
    expect(component.entries.value).toEqual([{ type: 'b' }, { type: 'a' }]);
  });
});
