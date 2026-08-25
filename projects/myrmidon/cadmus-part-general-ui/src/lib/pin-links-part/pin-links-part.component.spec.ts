import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';
import {
  EditedObject,
  PartIdentity,
  ThesauriSet,
} from '@myrmidon/cadmus-core';

import { PinLinksPartComponent } from './pin-links-part.component';
import { PinLinksPart, PIN_LINKS_PART_TYPEID } from '../pin-links-part';

describe('PinLinksPartComponent', () => {
  let component: PinLinksPartComponent;
  let fixture: ComponentFixture<PinLinksPartComponent>;
  let appRepository: { getSettingFor: ReturnType<typeof vi.fn>; getTypeThesaurus: ReturnType<typeof vi.fn> };
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };

  const ID: AssertedCompositeId = {
    target: { gid: 'g1', label: 'Label 1' },
  };

  function getPart(links: AssertedCompositeId[] = [ID]): PinLinksPart {
    return {
      id: 'part1',
      itemId: 'item1',
      typeId: PIN_LINKS_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'zeus',
      timeModified: new Date(),
      userId: 'zeus',
      links,
    };
  }

  async function configure(settingResolution: any = undefined) {
    appRepository = {
      getSettingFor: vi.fn().mockResolvedValue(settingResolution),
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
    };
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      currentUserValue: null,
    };

    await TestBed.configureTestingModule({
      imports: [PinLinksPartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AppRepository, useValue: appRepository },
        { provide: AuthJwtService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PinLinksPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('without lookup settings', () => {
    beforeEach(async () => {
      await configure(undefined);
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should build an initially invalid form (empty links)', () => {
      expect(component.links.value).toEqual([]);
      expect(component.form.invalid).toBe(true);
    });

    it('should not request settings before identity is set', () => {
      expect(appRepository.getSettingFor).not.toHaveBeenCalled();
    });

    describe('with identity set (no role)', () => {
      const IDENTITY: PartIdentity = {
        itemId: 'item1',
        typeId: PIN_LINKS_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      };

      beforeEach(async () => {
        fixture.componentRef.setInput('identity', IDENTITY);
        fixture.detectChanges();
        await fixture.whenStable();
      });

      it('should request settings with roleId converted from null to undefined', () => {
        expect(appRepository.getSettingFor).toHaveBeenCalledWith(
          PIN_LINKS_PART_TYPEID,
          undefined,
        );
      });

      it('should leave lookupProviderOptions undefined when no settings', () => {
        expect(component.lookupProviderOptions()).toBeUndefined();
      });

      it('should populate all thesaurus entry signals when present', () => {
        const thesauri: ThesauriSet = {
          'pin-link-scopes': { id: 'pin-link-scopes', entries: [{ id: 's1', value: 'S1' }] },
          'pin-link-tags': { id: 'pin-link-tags', entries: [{ id: 't1', value: 'T1' }] },
          'pin-link-assertion-tags': { id: 'pin-link-assertion-tags', entries: [{ id: 'a1', value: 'A1' }] },
          'pin-link-docref-types': { id: 'pin-link-docref-types', entries: [{ id: 'rt1', value: 'RT1' }] },
          'pin-link-docref-tags': { id: 'pin-link-docref-tags', entries: [{ id: 'rtag1', value: 'RTag1' }] },
          'asserted-id-features': { id: 'asserted-id-features', entries: [{ id: 'f1', value: 'F1' }] },
        };
        fixture.componentRef.setInput('data', {
          value: getPart([]),
          thesauri,
        } as EditedObject<PinLinksPart>);
        fixture.detectChanges();

        expect(component.idScopeEntries()).toEqual(thesauri['pin-link-scopes'].entries);
        expect(component.idTagEntries()).toEqual(thesauri['pin-link-tags'].entries);
        expect(component.assTagEntries()).toEqual(thesauri['pin-link-assertion-tags'].entries);
        expect(component.refTypeEntries()).toEqual(thesauri['pin-link-docref-types'].entries);
        expect(component.refTagEntries()).toEqual(thesauri['pin-link-docref-tags'].entries);
        expect(component.featureEntries()).toEqual(thesauri['asserted-id-features'].entries);
      });

      it('should leave all thesaurus entry signals undefined when absent', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([]),
          thesauri: {},
        } as EditedObject<PinLinksPart>);
        fixture.detectChanges();

        expect(component.idScopeEntries()).toBeUndefined();
        expect(component.idTagEntries()).toBeUndefined();
        expect(component.assTagEntries()).toBeUndefined();
        expect(component.refTypeEntries()).toBeUndefined();
        expect(component.refTagEntries()).toBeUndefined();
        expect(component.featureEntries()).toBeUndefined();
      });

      it('should populate links from the part', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([ID]),
          thesauri: {},
        } as EditedObject<PinLinksPart>);
        fixture.detectChanges();

        expect(component.links.value).toEqual([ID]);
        expect(component.form.pristine).toBe(true);
      });

      it('should reset links to [] when data is unset', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([ID]),
          thesauri: {},
        } as EditedObject<PinLinksPart>);
        fixture.detectChanges();

        fixture.componentRef.setInput('data', undefined);
        fixture.detectChanges();

        expect(component.links.value).toEqual([]);
      });

      it('getValue should build a part with the current links', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([ID]),
          thesauri: {},
        } as EditedObject<PinLinksPart>);
        fixture.detectChanges();

        const value = (component as any).getValue() as PinLinksPart;
        expect(value.typeId).toBe(PIN_LINKS_PART_TYPEID);
        expect(value.links).toEqual([ID]);
      });

      it('onIdsChange should update links and mark dirty', () => {
        component.onIdsChange([ID]);

        expect(component.links.value).toEqual([ID]);
        expect(component.links.dirty).toBe(true);
      });
    });

    it('should request settings with the actual roleId when set', async () => {
      const identity: PartIdentity = {
        itemId: 'item1',
        typeId: PIN_LINKS_PART_TYPEID,
        partId: 'part1',
        roleId: 'scholarly',
      };
      fixture.componentRef.setInput('identity', identity);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(appRepository.getSettingFor).toHaveBeenCalledWith(
        PIN_LINKS_PART_TYPEID,
        'scholarly',
      );
    });
  });

  describe('with lookup settings returned', () => {
    const LOOKUP_OPTIONS: LookupProviderOptions = {
      whocit: [{ scope: 'default' } as any],
    } as any;

    beforeEach(async () => {
      await configure({ lookupProviderOptions: LOOKUP_OPTIONS });
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: PIN_LINKS_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      } as PartIdentity);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should set lookupProviderOptions from the resolved settings', () => {
      expect(component.lookupProviderOptions()).toEqual(LOOKUP_OPTIONS);
    });
  });
});
