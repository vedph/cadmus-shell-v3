import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { NoteSet } from '@myrmidon/cadmus-ui-note-set';
import {
  EditedObject,
  PartIdentity,
  ThesauriSet,
} from '@myrmidon/cadmus-core';

import { FlagsPartComponent } from './flags-part.component';
import { FlagsPart, FLAGS_PART_TYPEID } from '../flags-part';

describe('FlagsPartComponent', () => {
  let component: FlagsPartComponent;
  let fixture: ComponentFixture<FlagsPartComponent>;
  let appRepository: { getSettingFor: ReturnType<typeof vi.fn>; getTypeThesaurus: ReturnType<typeof vi.fn> };
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };

  const IDENTITY: PartIdentity = {
    itemId: 'item1',
    typeId: FLAGS_PART_TYPEID,
    partId: 'part1',
    roleId: null,
  };

  const NOTE_SET_SETTING: NoteSet = {
    definitions: [{ key: 'k1', label: 'Note 1' }],
    notes: {},
  };

  function getPart(overrides?: Partial<FlagsPart>): FlagsPart {
    return {
      id: 'part1',
      itemId: 'item1',
      typeId: FLAGS_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'zeus',
      timeModified: new Date(),
      userId: 'zeus',
      flags: ['a'],
      ...overrides,
    };
  }

  async function configure(settingResolution: NoteSet | undefined = undefined) {
    appRepository = {
      getSettingFor: vi.fn().mockResolvedValue(settingResolution),
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
    };
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      currentUserValue: null,
    };

    await TestBed.configureTestingModule({
      imports: [FlagsPartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AppRepository, useValue: appRepository },
        { provide: AuthJwtService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FlagsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('without note settings', () => {
    beforeEach(async () => {
      await configure(undefined);
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should build an initially invalid form (empty flags)', () => {
      expect(component.flags.value).toEqual([]);
      expect(component.form.invalid).toBe(true);
    });

    it('should default notes to empty definitions/notes', () => {
      expect(component.notes.value).toEqual({ definitions: [], notes: {} });
    });

    it('should not call getSettingFor before identity is set', () => {
      expect(appRepository.getSettingFor).not.toHaveBeenCalled();
    });

    it('should compute featureFlags from flagEntries', () => {
      component.flagEntries.set([
        { id: 'a', value: 'Alpha' },
        { id: 'b', value: 'Beta' },
      ]);

      expect(component.featureFlags()).toEqual([
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ]);
    });

    describe('with identity set', () => {
      beforeEach(async () => {
        fixture.componentRef.setInput('identity', IDENTITY);
        fixture.detectChanges();
        await fixture.whenStable();
      });

      it('should request settings using the flags part type id and role id', () => {
        expect(appRepository.getSettingFor).toHaveBeenCalledWith(
          FLAGS_PART_TYPEID,
          undefined,
        );
      });

      it('should leave settings undefined when none is returned', () => {
        expect(component.settings()).toBeUndefined();
      });

      it('should populate flagEntries only when the flags thesaurus is present', () => {
        fixture.componentRef.setInput('data', {
          value: getPart(),
          thesauri: {
            flags: { id: 'flags', entries: [{ id: 'x', value: 'X' }] },
          },
        } as EditedObject<FlagsPart>);
        fixture.detectChanges();

        expect(component.flagEntries()).toEqual([{ id: 'x', value: 'X' }]);
      });

      it('should reset flagEntries to [] when the flags thesaurus is absent', () => {
        fixture.componentRef.setInput('data', {
          value: getPart(),
          thesauri: {},
        } as EditedObject<FlagsPart>);
        fixture.detectChanges();

        expect(component.flagEntries()).toEqual([]);
      });

      it('should populate flags from the part and default notes when no settings', () => {
        fixture.componentRef.setInput('data', {
          value: getPart({ flags: ['a', 'b'], notes: { k1: 'hello' } }),
          thesauri: {},
        } as EditedObject<FlagsPart>);
        fixture.detectChanges();

        expect(component.flags.value).toEqual(['a', 'b']);
        // no settings loaded -> notes are always the empty default, part.notes ignored
        expect(component.notes.value).toEqual({ definitions: [], notes: {} });
        expect(component.form.pristine).toBe(true);
      });

      it('should reset the form when data is unset', () => {
        fixture.componentRef.setInput('data', {
          value: getPart({ flags: ['a', 'b'] }),
          thesauri: {},
        } as EditedObject<FlagsPart>);
        fixture.detectChanges();

        fixture.componentRef.setInput('data', undefined);
        fixture.detectChanges();

        expect(component.flags.value).toEqual([]);
      });

      it('getValue should set flags and omit notes when all values are null', () => {
        fixture.componentRef.setInput('data', {
          value: getPart({ flags: ['a'] }),
          thesauri: {},
        } as EditedObject<FlagsPart>);
        fixture.detectChanges();

        component.notes.setValue({
          definitions: [],
          notes: { k1: null as any, k2: undefined as any },
        });

        const value = (component as any).getValue() as FlagsPart;
        expect(value.flags).toEqual(['a']);
        expect(value.notes).toBeUndefined();
      });

      it('getValue should filter out null/undefined note values but keep the rest', () => {
        fixture.componentRef.setInput('data', {
          value: getPart({ flags: ['a'] }),
          thesauri: {},
        } as EditedObject<FlagsPart>);
        fixture.detectChanges();

        component.notes.setValue({
          definitions: [],
          notes: { k1: 'hello', k2: null as any },
        });

        const value = (component as any).getValue() as FlagsPart;
        expect(value.notes).toEqual({ k1: 'hello' });
      });

      it('onFlagsCheckedIdsChange should update flags and mark dirty', () => {
        component.onFlagsCheckedIdsChange(['x', 'y']);

        expect(component.flags.value).toEqual(['x', 'y']);
        expect(component.flags.dirty).toBe(true);
      });

      it('onSetChange should update the notes control', () => {
        const set: NoteSet = { definitions: [], notes: { k1: 'v' } };

        component.onSetChange(set);

        expect(component.notes.value).toEqual(set);
      });

      it('onNoteChange should not throw', () => {
        expect(() =>
          component.onNoteChange({ key: 'k1', value: 'v' }),
        ).not.toThrow();
      });
    });
  });

  describe('with note settings returned', () => {
    beforeEach(async () => {
      await configure(NOTE_SET_SETTING);
      fixture.componentRef.setInput('identity', IDENTITY);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should store the returned settings', () => {
      expect(component.settings()).toEqual(NOTE_SET_SETTING);
    });

    it('getNoteSet should merge settings definitions with the part notes', () => {
      fixture.componentRef.setInput('data', {
        value: getPart({ notes: { k1: 'hello' } }),
        thesauri: {},
      } as EditedObject<FlagsPart>);
      fixture.detectChanges();

      expect(component.notes.value).toEqual({
        definitions: NOTE_SET_SETTING.definitions,
        notes: { k1: 'hello' },
      });
    });

    it('getNoteSet should default part.notes to {} when the part has none', () => {
      fixture.componentRef.setInput('data', {
        value: getPart({ notes: undefined }),
        thesauri: {},
      } as EditedObject<FlagsPart>);
      fixture.detectChanges();

      expect(component.notes.value).toEqual({
        definitions: NOTE_SET_SETTING.definitions,
        notes: {},
      });
    });
  });
});
