import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, PartIdentity, ThesauriSet } from '@myrmidon/cadmus-core';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';

import { DocReferencesPartComponent } from './doc-references-part.component';
import {
  DocReferencesPart,
  DOC_REFERENCES_PART_TYPEID,
} from '../doc-references-part';

// the form tags the draft's array items with an identity Symbol (and
// structuredClone drops Symbol keys): compare their plain data only
function plain<T>(value: T): T {
  return structuredClone(value);
}

function buildPart(references: DocReference[]): DocReferencesPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: DOC_REFERENCES_PART_TYPEID,
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    references,
  };
}

describe('DocReferencesPartComponent', () => {
  let component: DocReferencesPartComponent;
  let fixture: ComponentFixture<DocReferencesPartComponent>;
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
      imports: [DocReferencesPartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocReferencesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('references control should require at least 1 entry', () => {
    expect(plain(component.form.references().value())).toEqual([]);
    expect(!!component.form.references().getError('strictMinLength')).toBe(true);
    component.form.references().value.set([{ citation: 'cit1' }]);
    expect(component.form.references().valid()).toBe(true);
  });

  //#region onDataSet
  it('should reset the form when data has no value', () => {
    component.form.references().value.set([{ citation: 'cit1' }]);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();
    expect(plain(component.form.references().value())).toEqual([]);
  });

  it('should populate references from the part', () => {
    const references: DocReference[] = [{ citation: 'cit1' }, { citation: 'cit2' }];
    const data: EditedObject<DocReferencesPart> = {
      value: buildPart(references),
      thesauri: {},
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(plain(component.form.references().value())).toEqual(references);
    expect(component.form().dirty()).toBe(false);
  });

  it('should populate thesaurus entry signals only for thesauri present in the data', () => {
    const thesauri: ThesauriSet = {
      'doc-reference-tags': {
        id: 'doc-reference-tags@en',
        entries: [{ id: 'tag1', value: 'Tag 1' }],
      },
    };
    const data: EditedObject<DocReferencesPart> = {
      value: buildPart([]),
      thesauri,
    };
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    expect(component.tagEntries()).toEqual([{ id: 'tag1', value: 'Tag 1' }]);
    expect(component.typeEntries()).toBeUndefined();
  });
  //#endregion

  //#region getValue / onReferencesChange
  it('getValue should build the part from the references control', () => {
    const references: DocReference[] = [{ citation: 'cit1' }];
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    component.form.references().value.set(references);

    const value = (component as any).getValue() as DocReferencesPart;
    expect(value.references).toEqual(references);
  });

  it('should keep the form identity Symbol out of emitted and saved objects', () => {
    fixture.componentRef.setInput('data', {
      value: buildPart([]),
      thesauri: {},
    });
    fixture.detectChanges();
    const references: DocReference[] = [
      { type: 'book', tag: 't', citation: 'Hom. Il. 1.1' } as DocReference,
    ];
    component.onReferencesChange(references);
    fixture.detectChanges();
    component.save();

    // the child's objects were not adopted by the form
    expect(Object.getOwnPropertySymbols(references[0])).toEqual([]);
    // the saved objects carry no Symbol either
    const saved = component.data()!.value!.references;
    expect(saved).toEqual(references);
    expect(Object.getOwnPropertySymbols(saved[0])).toEqual([]);
    // while the form's own copies are tagged
    expect(
      Object.getOwnPropertySymbols(component.form.references().value()[0])
        .length,
    ).toBeGreaterThan(0);
  });

  it('onReferencesChange should update, dirty and revalidate the control', () => {
    const references: DocReference[] = [{ citation: 'cit1' }];
    expect(component.form.references().dirty()).toBe(false);
    component.onReferencesChange(references);
    expect(plain(component.form.references().value())).toEqual(references);
    expect(component.form.references().dirty()).toBe(true);
    expect(component.form.references().valid()).toBe(true);
  });
  //#endregion

  //#region initSettings
  it('should load settings keyed by type ID alone when identity has no roleId', async () => {
    appRepository.getSettingFor.mockResolvedValue({
      noLookup: true,
      noCitation: false,
      defaultPicker: 'citation',
    });
    const identity: PartIdentity = {
      itemId: 'item1',
      typeId: DOC_REFERENCES_PART_TYPEID,
      partId: null,
      roleId: null,
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(appRepository.getSettingFor).toHaveBeenCalledWith(
      DOC_REFERENCES_PART_TYPEID,
      undefined,
    );
    expect(component.settings()).toEqual({
      noLookup: true,
      noCitation: false,
      defaultPicker: 'citation',
    });
  });

  it('should pass the roleId to getSettingFor when present', async () => {
    appRepository.getSettingFor.mockResolvedValue(undefined);
    const identity: PartIdentity = {
      itemId: 'item1',
      typeId: DOC_REFERENCES_PART_TYPEID,
      partId: null,
      roleId: 'scholarly',
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(appRepository.getSettingFor).toHaveBeenCalledWith(
      DOC_REFERENCES_PART_TYPEID,
      'scholarly',
    );
  });

  it('should set settings to undefined if loading fails', async () => {
    appRepository.getSettingFor.mockRejectedValue(new Error('boom'));
    const identity: PartIdentity = {
      itemId: 'item1',
      typeId: DOC_REFERENCES_PART_TYPEID,
      partId: null,
      roleId: null,
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.settings()).toBeUndefined();
  });
  //#endregion

  it('should render its editor and buttons inside no <form>', () => {
    const buttons: HTMLElement = fixture.nativeElement.querySelector(
      'cadmus-close-save-buttons',
    );
    expect(buttons).toBeTruthy();
    expect(buttons.closest('form')).toBeNull();
  });
});
