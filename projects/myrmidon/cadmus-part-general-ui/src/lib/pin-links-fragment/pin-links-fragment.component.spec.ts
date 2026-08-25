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
  FragmentIdentity,
  ThesauriSet,
} from '@myrmidon/cadmus-core';

import { PinLinksFragmentComponent } from './pin-links-fragment.component';
import {
  PinLinksFragment,
  PIN_LINKS_FRAGMENT_TYPEID,
} from '../pin-links-fragment';

describe('PinLinksFragmentComponent', () => {
  let component: PinLinksFragmentComponent;
  let fixture: ComponentFixture<PinLinksFragmentComponent>;
  let appRepository: { getSettingFor: ReturnType<typeof vi.fn>; getTypeThesaurus: ReturnType<typeof vi.fn> };
  let authService: { currentUser$: BehaviorSubject<User | null>; currentUserValue: User | null };

  const ID: AssertedCompositeId = {
    target: { gid: 'g1', label: 'Label 1' },
  };

  const IDENTITY: FragmentIdentity = {
    itemId: 'item1',
    typeId: 'it.vedph.token-text-layer',
    partId: 'part1',
    roleId: null,
    frTypeId: PIN_LINKS_FRAGMENT_TYPEID,
    frRoleId: null,
    loc: '1.1',
  };

  function getFragment(links: AssertedCompositeId[] = [ID]): PinLinksFragment {
    return {
      location: '1.1',
      links,
    };
  }

  async function configure(settingResolution: any = undefined) {
    TestBed.resetTestingModule();
    appRepository = {
      getSettingFor: vi.fn().mockResolvedValue(settingResolution),
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
    };
    authService = {
      currentUser$: new BehaviorSubject<User | null>(null),
      currentUserValue: null,
    };

    await TestBed.configureTestingModule({
      imports: [PinLinksFragmentComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AppRepository, useValue: appRepository },
        { provide: AuthJwtService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PinLinksFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

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

  it('should default pinByTypeMode/canSwitchMode/canEditTarget to true', () => {
    // unlike PinLinksPartComponent (which hardcodes these as literal `true` in
    // its template), the fragment editor exposes them as signals - but there
    // is no setter anywhere in the component that ever changes them, so they
    // always stay at their initial value.
    expect(component.pinByTypeMode()).toBe(true);
    expect(component.canSwitchMode()).toBe(true);
    expect(component.canEditTarget()).toBe(true);
  });

  describe('with identity set', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('identity', IDENTITY);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should request settings using the fragment type id and role id', () => {
      expect(appRepository.getSettingFor).toHaveBeenCalledWith(
        PIN_LINKS_FRAGMENT_TYPEID,
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
        value: getFragment([]),
        thesauri,
      } as EditedObject<PinLinksFragment>);
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
        value: getFragment([]),
        thesauri: {},
      } as EditedObject<PinLinksFragment>);
      fixture.detectChanges();

      expect(component.idScopeEntries()).toBeUndefined();
      expect(component.idTagEntries()).toBeUndefined();
      expect(component.assTagEntries()).toBeUndefined();
      expect(component.refTypeEntries()).toBeUndefined();
      expect(component.refTagEntries()).toBeUndefined();
      expect(component.featureEntries()).toBeUndefined();
    });

    it('should populate links from the fragment', () => {
      fixture.componentRef.setInput('data', {
        value: getFragment([ID]),
        thesauri: {},
      } as EditedObject<PinLinksFragment>);
      fixture.detectChanges();

      expect(component.links.value).toEqual([ID]);
      expect(component.form.pristine).toBe(true);
    });

    it('should reset links to [] when data is unset', () => {
      fixture.componentRef.setInput('data', {
        value: getFragment([ID]),
        thesauri: {},
      } as EditedObject<PinLinksFragment>);
      fixture.detectChanges();

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();

      expect(component.links.value).toEqual([]);
    });

    it('getValue should build a fragment (via getEditedFragment) with the current links', () => {
      fixture.componentRef.setInput('data', {
        value: getFragment([ID]),
        thesauri: {},
      } as EditedObject<PinLinksFragment>);
      fixture.detectChanges();

      const value = (component as any).getValue() as PinLinksFragment;
      expect(value.location).toBe('1.1');
      expect(value.links).toEqual([ID]);
    });

    it('getValue should fall back to the identity location when there is no existing fragment', () => {
      // no data set at all -> getEditedFragment() falls back to
      // { location: (identity as FragmentIdentity).loc }
      const value = (component as any).getValue() as PinLinksFragment;
      expect(value.location).toBe('1.1');
    });

    it('onIdsChange should update links and mark dirty', () => {
      component.onIdsChange([ID]);

      expect(component.links.value).toEqual([ID]);
      expect(component.links.dirty).toBe(true);
    });
  });

  describe('with lookup settings returned', () => {
    const LOOKUP_OPTIONS: LookupProviderOptions = {
      whocit: [{ scope: 'default' } as any],
    } as any;

    beforeEach(async () => {
      await configure({ lookupProviderOptions: LOOKUP_OPTIONS });
      fixture.componentRef.setInput('identity', IDENTITY);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should set lookupProviderOptions from the resolved settings', () => {
      expect(component.lookupProviderOptions()).toEqual(LOOKUP_OPTIONS);
    });
  });
});
