import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { DecoratedCount } from '@myrmidon/cadmus-refs-decorated-counts';
import { EditedObject, PartIdentity } from '@myrmidon/cadmus-core';

import { DecoratedCountsPartComponent } from './decorated-counts-part.component';
import {
  DecoratedCountsPart,
  DECORATED_COUNTS_PART_TYPEID,
} from '../decorated-counts-part';

describe('DecoratedCountsPartComponent', () => {
  let component: DecoratedCountsPartComponent;
  let fixture: ComponentFixture<DecoratedCountsPartComponent>;
  let currentUser$: BehaviorSubject<User | null>;

  const identity: PartIdentity = {
    itemId: 'item1',
    typeId: DECORATED_COUNTS_PART_TYPEID,
    partId: null,
    roleId: null,
  };

  beforeEach(async () => {
    currentUser$ = new BehaviorSubject<User | null>(null);

    await TestBed.configureTestingModule({
      imports: [DecoratedCountsPartComponent],
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DecoratedCountsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds a form with a counts control requiring at least 1 item', () => {
    expect(component.form.get('counts')).toBeTruthy();
    expect(component.counts.value).toEqual([]);
    expect(component.counts.invalid).toBe(true);
  });

  it('resets the form when data has no value', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    expect(component.counts.value).toEqual([]);
  });

  it('populates thesauri signals from data and clears missing ones', () => {
    const data: EditedObject<DecoratedCountsPart> = {
      value: null,
      thesauri: {
        'decorated-count-ids': {
          id: 'decorated-count-ids',
          entries: [{ id: 'c1', value: 'Count 1' }],
        },
        // decorated-count-tags intentionally missing
      },
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.idEntries()).toEqual([{ id: 'c1', value: 'Count 1' }]);
    expect(component.tagEntries()).toBeUndefined();
  });

  it('updates the counts form control from part data', () => {
    const counts: DecoratedCount[] = [{ id: 'c1', value: 3 }];
    const part: DecoratedCountsPart = {
      id: 'p1',
      itemId: 'item1',
      typeId: DECORATED_COUNTS_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'c',
      timeModified: new Date(),
      userId: 'u',
      counts,
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: part, thesauri: {} });
    fixture.detectChanges();

    expect(component.counts.value).toEqual(counts);
    expect(component.form.pristine).toBe(true);
  });

  it('getValue returns a part with the current counts', () => {
    const part: DecoratedCountsPart = {
      id: 'p1',
      itemId: 'item1',
      typeId: DECORATED_COUNTS_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'c',
      timeModified: new Date(),
      userId: 'u',
      counts: [{ id: 'c1', value: 1 }],
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: part, thesauri: {} });
    fixture.detectChanges();

    component.onCountsChange([{ id: 'c2', value: 5 }]);

    const value = (component as any).getValue() as DecoratedCountsPart;
    expect(value.id).toBe('p1');
    expect(value.counts).toEqual([{ id: 'c2', value: 5 }]);
  });

  it('onCountsChange updates the control and marks it dirty', () => {
    const counts: DecoratedCount[] = [{ id: 'c1', value: 2 }];
    component.onCountsChange(counts);

    expect(component.counts.value).toEqual(counts);
    expect(component.counts.dirty).toBe(true);
  });

  it('getValue defaults counts to an empty array when control value is falsy', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.detectChanges();
    component.counts.setValue(undefined as any);

    const value = (component as any).getValue() as DecoratedCountsPart;
    expect(value.counts).toEqual([]);
  });
});
