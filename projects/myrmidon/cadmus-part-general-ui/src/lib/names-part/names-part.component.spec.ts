import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AssertedProperName } from '@myrmidon/cadmus-refs-proper-name';
import {
  EditedObject,
  PartIdentity,
  ThesauriSet,
} from '@myrmidon/cadmus-core';

import { NamesPartComponent } from './names-part.component';
import { NamesPart, NAMES_PART_TYPEID } from '../names-part';

describe('NamesPartComponent', () => {
  let component: NamesPartComponent;
  let fixture: ComponentFixture<NamesPartComponent>;
  let appRepository: { getSettingFor: ReturnType<typeof vi.fn>; getTypeThesaurus: ReturnType<typeof vi.fn> };
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  const IDENTITY: PartIdentity = {
    itemId: 'item1',
    typeId: NAMES_PART_TYPEID,
    partId: 'part1',
    roleId: null,
  };

  const NAME_A: AssertedProperName = {
    language: 'eng',
    pieces: [{ type: 'first', value: 'John' }],
  };
  const NAME_B: AssertedProperName = {
    language: 'eng',
    pieces: [{ type: 'first', value: 'Jane' }],
  };

  function getPart(names: AssertedProperName[] = []): NamesPart {
    return {
      id: 'part1',
      itemId: 'item1',
      typeId: NAMES_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'zeus',
      timeModified: new Date(),
      userId: 'zeus',
      names,
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
    dialogService = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [NamesPartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AppRepository, useValue: appRepository },
        { provide: AuthJwtService, useValue: authService },
        { provide: DialogService, useValue: dialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NamesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build an initially invalid form (empty names array)', () => {
    expect(component.names.value).toEqual([]);
    expect(component.form.invalid).toBe(true);
  });

  describe('with identity set', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('identity', IDENTITY);
    });

    it('should populate all thesaurus entry signals when present', () => {
      const thesauri: ThesauriSet = {
        'name-languages': { id: 'name-languages', entries: [{ id: 'eng', value: 'English' }] },
        'name-tags': { id: 'name-tags', entries: [{ id: 't1', value: 'Tag 1' }] },
        'name-piece-types': { id: 'name-piece-types', entries: [{ id: 'first', value: 'First' }] },
        'assertion-tags': { id: 'assertion-tags', entries: [{ id: 'a1', value: 'A1' }] },
        'doc-reference-types': { id: 'doc-reference-types', entries: [{ id: 'rt1', value: 'RT1' }] },
        'doc-reference-tags': { id: 'doc-reference-tags', entries: [{ id: 'rtag1', value: 'RTag1' }] },
      };
      fixture.componentRef.setInput('data', {
        value: getPart([]),
        thesauri,
      } as EditedObject<NamesPart>);
      fixture.detectChanges();

      expect(component.langEntries()).toEqual(thesauri['name-languages'].entries);
      expect(component.tagEntries()).toEqual(thesauri['name-tags'].entries);
      expect(component.typeEntries()).toEqual(thesauri['name-piece-types'].entries);
      expect(component.assTagEntries()).toEqual(thesauri['assertion-tags'].entries);
      expect(component.refTypeEntries()).toEqual(thesauri['doc-reference-types'].entries);
      expect(component.refTagEntries()).toEqual(thesauri['doc-reference-tags'].entries);
    });

    it('should leave all thesaurus entry signals undefined when absent', () => {
      fixture.componentRef.setInput('data', {
        value: getPart([]),
        thesauri: {},
      } as EditedObject<NamesPart>);
      fixture.detectChanges();

      expect(component.langEntries()).toBeUndefined();
      expect(component.tagEntries()).toBeUndefined();
      expect(component.typeEntries()).toBeUndefined();
      expect(component.assTagEntries()).toBeUndefined();
      expect(component.refTypeEntries()).toBeUndefined();
      expect(component.refTagEntries()).toBeUndefined();
    });

    it('should populate the names control from the part', () => {
      fixture.componentRef.setInput('data', {
        value: getPart([NAME_A, NAME_B]),
        thesauri: {},
      } as EditedObject<NamesPart>);
      fixture.detectChanges();

      expect(component.names.value).toEqual([NAME_A, NAME_B]);
      expect(component.form.pristine).toBe(true);
    });

    it('should reset the names control when data is unset', () => {
      fixture.componentRef.setInput('data', {
        value: getPart([NAME_A]),
        thesauri: {},
      } as EditedObject<NamesPart>);
      fixture.detectChanges();

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();

      expect(component.names.value).toEqual([]);
    });

    it('getValue should return a NamesPart with the current names', () => {
      fixture.componentRef.setInput('data', {
        value: getPart([NAME_A]),
        thesauri: {},
      } as EditedObject<NamesPart>);
      fixture.detectChanges();

      const value = (component as any).getValue() as NamesPart;
      expect(value.typeId).toBe(NAMES_PART_TYPEID);
      expect(value.names).toEqual([NAME_A]);
    });

    describe('addName', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('data', {
          value: getPart([]),
          thesauri: {},
        } as EditedObject<NamesPart>);
        fixture.detectChanges();
      });

      it('should append a new name defaulting language to the first langEntries id', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([]),
          thesauri: {
            'name-languages': { id: 'name-languages', entries: [{ id: 'ita', value: 'Italian' }] },
          },
        } as EditedObject<NamesPart>);
        fixture.detectChanges();

        component.addName();

        expect(component.names.value.length).toBe(1);
        expect(component.names.value[0].language).toBe('ita');
        expect(component.names.value[0].pieces).toEqual([]);
        expect(component.names.dirty).toBe(true);
      });

      it('should default language to empty string when no langEntries thesaurus', () => {
        component.addName();

        expect(component.names.value[0].language).toBe('');
      });

      it('should open the editor on the newly added name', () => {
        component.addName();

        expect(component.editedIndex()).toBe(0);
        expect(component.edited()).toEqual(component.names.value[0]);
      });
    });

    describe('editName', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('data', {
          value: getPart([NAME_A, NAME_B]),
          thesauri: {},
        } as EditedObject<NamesPart>);
        fixture.detectChanges();
      });

      it('should set editedIndex and a clone of the name at the given index', () => {
        component.editName(1);

        expect(component.editedIndex()).toBe(1);
        expect(component.edited()).toEqual(NAME_B);
        // must be a clone, not the same reference
        expect(component.edited()).not.toBe(component.names.value[1]);
      });

      it('should clear editedIndex/edited when index < 0', () => {
        component.editName(0);
        component.editName(-1);

        expect(component.editedIndex()).toBe(-1);
        expect(component.edited()).toBeUndefined();
      });
    });

    describe('onNameChange', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('data', {
          value: getPart([NAME_A, NAME_B]),
          thesauri: {},
        } as EditedObject<NamesPart>);
        fixture.detectChanges();
        component.editName(0);
      });

      it('should replace the name at editedIndex', () => {
        const updated: AssertedProperName = { language: 'fra', pieces: [] };

        component.onNameChange(updated);

        expect(component.names.value[0]).toBe(updated);
        expect(component.names.value[1]).toEqual(NAME_B);
        expect(component.names.dirty).toBe(true);
      });

      it('should do nothing when name is undefined', () => {
        const before = component.names.value;

        component.onNameChange(undefined);

        expect(component.names.value).toBe(before);
      });

      it('should be a no-op while the form is being programmatically updated', () => {
        (component as any)._updatingForm = true;
        const before = component.names.value;

        component.onNameChange({ language: 'fra', pieces: [] });

        expect(component.names.value).toBe(before);
      });
    });

    it('onNameClose should clear the edited name', () => {
      fixture.componentRef.setInput('data', {
        value: getPart([NAME_A]),
        thesauri: {},
      } as EditedObject<NamesPart>);
      fixture.detectChanges();
      component.editName(0);

      component.onNameClose();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    describe('deleteName', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('data', {
          value: getPart([NAME_A, NAME_B]),
          thesauri: {},
        } as EditedObject<NamesPart>);
        fixture.detectChanges();
      });

      it('should remove the name at the given index when confirmed', () => {
        dialogService.confirm.mockReturnValue(of(true));

        component.deleteName(0);

        expect(component.names.value).toEqual([NAME_B]);
        expect(component.names.dirty).toBe(true);
      });

      it('should not remove the name when the user cancels', () => {
        dialogService.confirm.mockReturnValue(of(false));

        component.deleteName(0);

        expect(component.names.value).toEqual([NAME_A, NAME_B]);
      });
    });

    describe('moveNameUp / moveNameDown', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('data', {
          value: getPart([NAME_A, NAME_B]),
          thesauri: {},
        } as EditedObject<NamesPart>);
        fixture.detectChanges();
      });

      it('moveNameUp should be a no-op at index 0', () => {
        component.moveNameUp(0);
        expect(component.names.value).toEqual([NAME_A, NAME_B]);
      });

      it('moveNameUp should swap with the previous entry', () => {
        component.moveNameUp(1);
        expect(component.names.value).toEqual([NAME_B, NAME_A]);
      });

      it('moveNameDown should be a no-op at the last index', () => {
        component.moveNameDown(1);
        expect(component.names.value).toEqual([NAME_A, NAME_B]);
      });

      it('moveNameDown should swap with the next entry', () => {
        component.moveNameDown(0);
        expect(component.names.value).toEqual([NAME_B, NAME_A]);
      });
    });
  });
});
