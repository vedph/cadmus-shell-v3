import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { HistoricalDateModel } from '@myrmidon/cadmus-refs-historical-date';
import { EditedObject, FragmentIdentity } from '@myrmidon/cadmus-core';

import { ChronologyFragmentComponent } from './chronology-fragment.component';
import {
  ChronologyFragment,
  CHRONOLOGY_FRAGMENT_TYPEID,
} from '../chronology-fragment';

describe('ChronologyFragmentComponent', () => {
  let component: ChronologyFragmentComponent;
  let fixture: ComponentFixture<ChronologyFragmentComponent>;
  let currentUser$: BehaviorSubject<User | null>;

  const identity: FragmentIdentity = {
    itemId: 'item1',
    typeId: 'it.vedph.token-text',
    partId: 'part1',
    roleId: null,
    frTypeId: CHRONOLOGY_FRAGMENT_TYPEID,
    frRoleId: null,
    loc: '1.1',
  };

  const date: HistoricalDateModel = { a: { value: 1200 } };

  beforeEach(async () => {
    currentUser$ = new BehaviorSubject<User | null>(null);

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ChronologyFragmentComponent,
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
            getSettingFor: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChronologyFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds a form with a required date control', () => {
    expect(component.form.get('date')).toBeTruthy();
    expect(component.date.hasError('required')).toBe(true);
  });

  it('resets the form when data has no value', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    expect(component.date.value).toBeNull();
  });

  it('populates the chronology-tags thesaurus and clears it when missing', () => {
    const data: EditedObject<ChronologyFragment> = {
      value: null,
      thesauri: {
        'chronology-tags': {
          id: 'chronology-tags',
          entries: [{ id: 't1', value: 'Tag 1' }],
        },
      },
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    expect(component.tagEntries()).toEqual([{ id: 't1', value: 'Tag 1' }]);

    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(component.tagEntries()).toBeUndefined();
  });

  it('updates the form fields when a fragment with date is set', () => {
    const fragment: ChronologyFragment = {
      location: '1.1',
      date,
      label: 'lbl',
      tag: 'tg',
      eventId: 'ev1',
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: fragment, thesauri: {} });
    fixture.detectChanges();

    expect(component.date.value).toEqual(date);
    expect(component.label.value).toBe('lbl');
    expect(component.tag.value).toBe('tg');
    expect(component.eventId.value).toBe('ev1');
    expect(component.form.pristine).toBe(true);
  });

  it('resets the form when the fragment has no date', () => {
    const fragment: ChronologyFragment = {
      location: '1.1',
      date,
      label: 'lbl',
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: fragment, thesauri: {} });
    fixture.detectChanges();
    expect(component.label.value).toBe('lbl');

    // now push a fragment-like object without a date: form should reset
    fixture.componentRef.setInput('data', {
      value: { location: '1.1', label: 'lbl' } as any,
      thesauri: {},
    });
    fixture.detectChanges();

    expect(component.label.value).toBeNull();
    expect(component.date.value).toBeNull();
  });

  it('onDateChange updates the date control and marks it dirty', () => {
    component.onDateChange(date);
    expect(component.date.value).toEqual(date);
    expect(component.date.dirty).toBe(true);
  });

  it('getValue builds a fragment from the current form and identity', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    component.date.setValue(date);
    component.label.setValue('  lbl  ');
    component.eventId.setValue('  ev1  ');
    component.tag.setValue('  tg  ');

    const value = (component as any).getValue() as ChronologyFragment;

    expect(value.location).toBe(identity.loc);
    expect(value.date).toEqual(date);
    expect(value.label).toBe('lbl');
    expect(value.eventId).toBe('ev1');
    expect(value.tag).toBe('tg');
  });

  it('getValue sets tag to undefined when blank', () => {
    fixture.componentRef.setInput('identity', identity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    component.date.setValue(date);
    component.tag.setValue(null);

    const value = (component as any).getValue() as ChronologyFragment;
    expect(value.tag).toBeUndefined();
  });
});
