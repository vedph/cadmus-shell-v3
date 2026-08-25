import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { RamStorageService } from '@myrmidon/ngx-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject, ThesauriSet } from '@myrmidon/cadmus-core';
import { AssertedChronotope } from '@myrmidon/cadmus-refs-asserted-chronotope';
import { LOOKUP_CONFIGS_KEY, RefLookupConfig } from '@myrmidon/cadmus-refs-lookup';

import { ChronotopesPartComponent } from './chronotopes-part.component';
import { ChronotopesPart, CHRONOTOPES_PART_TYPEID } from '../chronotopes-part';

function makePart(overrides?: Partial<ChronotopesPart>): ChronotopesPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: CHRONOTOPES_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    chronotopes: [],
    ...overrides,
  };
}

function makeChronotope(
  overrides?: Partial<AssertedChronotope>,
): AssertedChronotope {
  return { place: { value: 'Rome' }, ...overrides };
}

describe('ChronotopesPartComponent', () => {
  let component: ChronotopesPartComponent;
  let fixture: ComponentFixture<ChronotopesPartComponent>;
  let authUser$: BehaviorSubject<User | null>;
  let appRepository: {
    getTypeThesaurus: ReturnType<typeof vi.fn>;
    getSettingFor: ReturnType<typeof vi.fn>;
  };
  let ramStorage: { retrieve: ReturnType<typeof vi.fn> };
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
    ramStorage = { retrieve: vi.fn().mockReturnValue(null) };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [ChronotopesPartComponent],
      providers: [
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: appRepository },
        { provide: RamStorageService, useValue: ramStorage },
        { provide: DialogService, useValue: dialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChronotopesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onDataSet / updateForm', () => {
    it('should reset the form when data is undefined', () => {
      const data: EditedObject<ChronotopesPart> = {
        value: makePart({ chronotopes: [makeChronotope()] }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.chronotopes.value).toEqual([makeChronotope()]);

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();
      expect(component.chronotopes.value).toEqual([]);
    });

    it('should populate the chronotopes control from the part', () => {
      const chronotopes = [makeChronotope(), makeChronotope({ place: { value: 'Athens' } })];
      const data: EditedObject<ChronotopesPart> = {
        value: makePart({ chronotopes }),
        thesauri: {},
      };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      expect(component.chronotopes.value).toEqual(chronotopes);
      expect(component.form.pristine).toBe(true);
    });

    it('should populate all thesaurus-driven entry signals when present', () => {
      const thesauri: ThesauriSet = {
        'chronotope-place-tags': { id: 'x', entries: [{ id: 't1', value: 'T1' }] },
        'chronotope-assertion-tags': { id: 'x', entries: [{ id: 'a1', value: 'A1' }] },
        'doc-reference-types': { id: 'x', entries: [{ id: 'r1', value: 'R1' }] },
        'doc-reference-tags': { id: 'x', entries: [{ id: 'g1', value: 'G1' }] },
      };
      const data: EditedObject<ChronotopesPart> = { value: makePart(), thesauri };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(component.tagEntries()).toEqual(thesauri['chronotope-place-tags'].entries);
      expect(component.assTagEntries()).toEqual(thesauri['chronotope-assertion-tags'].entries);
      expect(component.refTypeEntries()).toEqual(thesauri['doc-reference-types'].entries);
      expect(component.refTagEntries()).toEqual(thesauri['doc-reference-tags'].entries);
    });

    it('should clear all thesaurus-driven entry signals when their keys are absent', () => {
      const data: EditedObject<ChronotopesPart> = { value: makePart(), thesauri: {} };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();

      expect(component.tagEntries()).toBeUndefined();
      expect(component.assTagEntries()).toBeUndefined();
      expect(component.refTypeEntries()).toBeUndefined();
      expect(component.refTagEntries()).toBeUndefined();
    });
  });

  describe('settings (initSettings -> updateSettings)', () => {
    it('should leave placeLookupConfig/lookupProviderOptions undefined when there are no settings', async () => {
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: CHRONOTOPES_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(component.placeLookupConfig()).toBeUndefined();
      expect(component.lookupProviderOptions()).toBeUndefined();
    });

    it('should resolve placeLookupConfig from RamStorageService when placeLookupServiceId is set and found', async () => {
      const configs: RefLookupConfig[] = [
        { name: 'Geonames', service: { id: 'geo-svc' } as any },
        { name: 'Other', service: { id: 'other-svc' } as any },
      ];
      ramStorage.retrieve.mockReturnValue(configs);
      appRepository.getSettingFor.mockResolvedValue({
        placeLookupServiceId: 'geo-svc',
      });

      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: CHRONOTOPES_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(ramStorage.retrieve).toHaveBeenCalledWith(LOOKUP_CONFIGS_KEY);
      expect(component.placeLookupConfig()).toEqual(configs[0]);
    });

    it('should leave placeLookupConfig undefined when the configured service ID is not found', async () => {
      ramStorage.retrieve.mockReturnValue([
        { name: 'Other', service: { id: 'other-svc' } as any },
      ]);
      appRepository.getSettingFor.mockResolvedValue({
        placeLookupServiceId: 'missing-svc',
      });

      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: CHRONOTOPES_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(component.placeLookupConfig()).toBeUndefined();
    });

    it('should set lookupProviderOptions from settings when present', async () => {
      appRepository.getSettingFor.mockResolvedValue({
        lookupProviderOptions: { geo: { scope: 'world' } },
      });

      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: CHRONOTOPES_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(component.lookupProviderOptions()).toEqual({
        geo: { scope: 'world' },
      });
    });
  });

  describe('getValue', () => {
    it('should build a ChronotopesPart from the current chronotopes control', () => {
      const chronotopes = [makeChronotope()];
      const data: EditedObject<ChronotopesPart> = { value: makePart(), thesauri: {} };
      fixture.componentRef.setInput('data', data);
      fixture.detectChanges();
      component.chronotopes.setValue(chronotopes);

      const part = (component as any).getValue() as ChronotopesPart;
      expect(part.chronotopes).toEqual(chronotopes);
      expect(part.typeId).toBe(CHRONOTOPES_PART_TYPEID);
    });
  });

  describe('addChronotope / editChronotope / closeChronotope', () => {
    it('should open a new blank chronotope for editing', () => {
      component.addChronotope();
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toEqual({});
    });

    it('should clone the given chronotope for editing', () => {
      const c = makeChronotope();
      component.editChronotope(c, 3);
      expect(component.editedIndex()).toBe(3);
      expect(component.edited()).toEqual(c);
      expect(component.edited()).not.toBe(c);
    });

    it('should reset state on closeChronotope', () => {
      component.editChronotope(makeChronotope(), 0);
      component.closeChronotope();
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });
  });

  describe('onChronotopeChange / saveChronotope', () => {
    it('should append a new chronotope when editedIndex is -1', () => {
      component.chronotopes.setValue([makeChronotope({ place: { value: 'A' } })]);
      component.addChronotope();
      component.onChronotopeChange(makeChronotope({ place: { value: 'B' } }));

      component.saveChronotope();

      expect(component.chronotopes.value).toEqual([
        makeChronotope({ place: { value: 'A' } }),
        makeChronotope({ place: { value: 'B' } }),
      ]);
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('should replace the chronotope at editedIndex when editing an existing one', () => {
      const original = [
        makeChronotope({ place: { value: 'A' } }),
        makeChronotope({ place: { value: 'B' } }),
      ];
      component.chronotopes.setValue(original);
      component.editChronotope(original[1], 1);
      component.onChronotopeChange(makeChronotope({ place: { value: 'B2' } }));

      component.saveChronotope();

      expect(component.chronotopes.value).toEqual([
        original[0],
        makeChronotope({ place: { value: 'B2' } }),
      ]);
    });

    it('should mark the chronotopes control dirty after saving', () => {
      component.addChronotope();
      component.onChronotopeChange(makeChronotope());
      component.saveChronotope();
      expect(component.chronotopes.dirty).toBe(true);
    });
  });

  describe('deleteChronotope', () => {
    it('should not remove the chronotope when the user cancels the confirmation', () => {
      dialogService.confirm.mockReturnValue(of(false));
      const chronotopes = [makeChronotope()];
      component.chronotopes.setValue(chronotopes);

      component.deleteChronotope(0);

      expect(component.chronotopes.value).toEqual(chronotopes);
    });

    it('should remove the chronotope at the given index when confirmed', () => {
      dialogService.confirm.mockReturnValue(of(true));
      const chronotopes = [
        makeChronotope({ place: { value: 'A' } }),
        makeChronotope({ place: { value: 'B' } }),
      ];
      component.chronotopes.setValue(chronotopes);

      component.deleteChronotope(0);

      expect(component.chronotopes.value).toEqual([chronotopes[1]]);
    });
  });

  describe('moveChronotopeUp / moveChronotopeDown', () => {
    it('should do nothing when moving the first entry up', () => {
      const chronotopes = [
        makeChronotope({ place: { value: 'A' } }),
        makeChronotope({ place: { value: 'B' } }),
      ];
      component.chronotopes.setValue(chronotopes);
      component.moveChronotopeUp(0);
      expect(component.chronotopes.value).toEqual(chronotopes);
    });

    it('should swap with the previous entry when moving up', () => {
      const chronotopes = [
        makeChronotope({ place: { value: 'A' } }),
        makeChronotope({ place: { value: 'B' } }),
      ];
      component.chronotopes.setValue(chronotopes);
      component.moveChronotopeUp(1);
      expect(component.chronotopes.value).toEqual([chronotopes[1], chronotopes[0]]);
    });

    it('should do nothing when moving the last entry down', () => {
      const chronotopes = [
        makeChronotope({ place: { value: 'A' } }),
        makeChronotope({ place: { value: 'B' } }),
      ];
      component.chronotopes.setValue(chronotopes);
      component.moveChronotopeDown(1);
      expect(component.chronotopes.value).toEqual(chronotopes);
    });

    it('should swap with the next entry when moving down', () => {
      const chronotopes = [
        makeChronotope({ place: { value: 'A' } }),
        makeChronotope({ place: { value: 'B' } }),
      ];
      component.chronotopes.setValue(chronotopes);
      component.moveChronotopeDown(0);
      expect(component.chronotopes.value).toEqual([chronotopes[1], chronotopes[0]]);
    });
  });
});
