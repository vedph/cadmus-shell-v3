import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';
import { AssertedId } from '@myrmidon/cadmus-refs-asserted-ids';

import { ExternalIdsPartComponent } from './external-ids-part.component';
import { ExternalIdsPart, EXTERNAL_IDS_PART_TYPEID } from '../external-ids-part';

function buildPart(ids: AssertedId[]): ExternalIdsPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: EXTERNAL_IDS_PART_TYPEID,
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    ids,
  };
}

describe('ExternalIdsPartComponent', () => {
  let component: ExternalIdsPartComponent;
  let fixture: ComponentFixture<ExternalIdsPartComponent>;
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
      imports: [ExternalIdsPartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExternalIdsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ids control should require at least 1 entry', () => {
    expect(component.ids.value).toEqual([]);
    expect(component.ids.hasError('minlength')).toBe(true);
    component.ids.setValue([{ value: 'x1', scope: 's1' }]);
    expect(component.ids.valid).toBe(true);
  });

  //#region onDataSet
  it('should reset the form when data has no value', () => {
    component.ids.setValue([{ value: 'x1', scope: 's1' }]);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(component.ids.value).toEqual([]);
  });

  it('should populate ids from the part', () => {
    const ids: AssertedId[] = [
      { value: 'x1', scope: 's1' },
      { value: 'x2', scope: 's2' },
    ];
    const data: EditedObject<ExternalIdsPart> = {
      value: buildPart(ids),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.ids.value).toEqual(ids);
    expect(component.form.pristine).toBe(true);
  });

  it('should populate all 5 thesaurus entry signals when all thesauri are present', () => {
    const thesauri: ThesauriSet = {
      'assertion-tags': { id: 'assertion-tags@en', entries: [{ id: 'a', value: 'A' }] },
      'doc-reference-types': { id: 'doc-reference-types@en', entries: [{ id: 'b', value: 'B' }] },
      'doc-reference-tags': { id: 'doc-reference-tags@en', entries: [{ id: 'c', value: 'C' }] },
      'external-id-scopes': { id: 'external-id-scopes@en', entries: [{ id: 'd', value: 'D' }] },
      'external-id-tags': { id: 'external-id-tags@en', entries: [{ id: 'e', value: 'E' }] },
    };
    const data: EditedObject<ExternalIdsPart> = {
      value: buildPart([]),
      thesauri,
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.assTagEntries()).toEqual([{ id: 'a', value: 'A' }]);
    expect(component.refTypeEntries()).toEqual([{ id: 'b', value: 'B' }]);
    expect(component.refTagEntries()).toEqual([{ id: 'c', value: 'C' }]);
    expect(component.idScopeEntries()).toEqual([{ id: 'd', value: 'D' }]);
    expect(component.idTagEntries()).toEqual([{ id: 'e', value: 'E' }]);
  });

  it('should set thesaurus entry signals to undefined when their thesaurus is absent', () => {
    const data: EditedObject<ExternalIdsPart> = {
      value: buildPart([]),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.assTagEntries()).toBeUndefined();
    expect(component.refTypeEntries()).toBeUndefined();
    expect(component.refTagEntries()).toBeUndefined();
    expect(component.idScopeEntries()).toBeUndefined();
    expect(component.idTagEntries()).toBeUndefined();
  });
  //#endregion

  //#region getValue / onIdsChange
  it('getValue should build the part from the ids control', () => {
    const ids: AssertedId[] = [{ value: 'x1', scope: 's1' }];
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.ids.setValue(ids);

    const value = (component as any).getValue() as ExternalIdsPart;
    expect(value.ids).toEqual(ids);
  });

  it('onIdsChange should update, dirty and revalidate the control', () => {
    const ids: AssertedId[] = [{ value: 'x1', scope: 's1' }];
    expect(component.ids.dirty).toBe(false);
    component.onIdsChange(ids);
    expect(component.ids.value).toEqual(ids);
    expect(component.ids.dirty).toBe(true);
    expect(component.ids.valid).toBe(true);
  });
  //#endregion
});
