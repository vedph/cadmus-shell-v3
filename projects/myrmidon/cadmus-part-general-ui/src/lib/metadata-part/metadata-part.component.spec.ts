import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import {
  EditedObject,
  PartIdentity,
  ThesauriSet,
} from '@myrmidon/cadmus-core';

import { MetadataPartComponent } from './metadata-part.component';
import { MetadataPart, METADATA_PART_TYPEID } from '../metadata-part';

describe('MetadataPartComponent', () => {
  let component: MetadataPartComponent;
  let fixture: ComponentFixture<MetadataPartComponent>;
  let appRepository: {
    getSettingFor: ReturnType<typeof vi.fn>;
    getTypeThesaurus: ReturnType<typeof vi.fn>;
  };
  let authService: {
    currentUser$: BehaviorSubject<User | null>;
    currentUserValue: User | null;
  };

  const IDENTITY: PartIdentity = {
    itemId: 'item1',
    typeId: METADATA_PART_TYPEID,
    partId: 'part1',
    roleId: null,
  };

  function getPart(metadata: MetadataPart['metadata'] = []): MetadataPart {
    return {
      id: 'part1',
      itemId: 'item1',
      typeId: METADATA_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'zeus',
      timeModified: new Date(),
      userId: 'zeus',
      metadata,
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
      imports: [MetadataPartComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AppRepository, useValue: appRepository },
        { provide: AuthJwtService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MetadataPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('default settings (noType undefined)', () => {
    beforeEach(async () => {
      await configure(undefined);
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should call getSettingFor with the metadata part type id', () => {
      expect(appRepository.getSettingFor).toHaveBeenCalledWith(
        METADATA_PART_TYPEID,
      );
    });

    it('should keep noType false when no setting is returned', async () => {
      await fixture.whenStable();
      expect(component.noType()).toBe(false);
    });

    it('should build the form with an empty, invalid metadata array', () => {
      expect(component.metadata.length).toBe(0);
      expect(component.metadata.invalid).toBe(true);
    });

    it('should clear the metadata rows when data is unset', () => {
      // seed 2 rows first
      fixture.componentRef.setInput('identity', IDENTITY);
      fixture.componentRef.setInput('data', {
        value: getPart([
          { type: 't1', name: 'n1', value: 'v1' },
          { type: 't2', name: 'n2', value: 'v2' },
        ]),
        thesauri: {},
      } as EditedObject<MetadataPart>);
      fixture.detectChanges();
      expect(component.metadata.length).toBe(2);

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();

      expect(component.metadata.length).toBe(0);
    });

    describe('with identity and data set', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('identity', IDENTITY);
      });

      it('should populate typeEntries/nameEntries only when thesauri are present', () => {
        const thesauri: ThesauriSet = {
          'metadata-types': {
            id: 'metadata-types',
            entries: [{ id: 't1', value: 'Type 1' }],
          },
          'metadata-names': {
            id: 'metadata-names',
            entries: [{ id: 'n1', value: 'Name 1' }],
          },
        };
        fixture.componentRef.setInput('data', {
          value: getPart([]),
          thesauri,
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        expect(component.typeEntries()).toEqual(thesauri['metadata-types'].entries);
        expect(component.nameEntries()).toEqual(thesauri['metadata-names'].entries);
      });

      it('should leave typeEntries/nameEntries undefined when thesauri absent', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        expect(component.typeEntries()).toBeUndefined();
        expect(component.nameEntries()).toBeUndefined();
      });

      it('should populate the metadata FormArray from the part', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([
            { type: 'a', name: 'n1', value: 'v1' },
            { name: 'n2', value: 'v2' },
          ]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        expect(component.metadata.length).toBe(2);
        const g0 = component.metadata.at(0) as any;
        expect(g0.controls.type.value).toBe('a');
        expect(g0.controls.name.value).toBe('n1');
        expect(g0.controls.value.value).toBe('v1');
        const g1 = component.metadata.at(1) as any;
        // FormControl normalizes an undefined initial value to null
        expect(g1.controls.type.value).toBeNull();
        expect(g1.controls.name.value).toBe('n2');
        expect(component.form.pristine).toBe(true);
      });

      it('getValue should build a MetadataPart with trimmed values from the form', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([{ type: 'a', name: 'n1', value: 'v1' }]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        const g0 = component.metadata.at(0) as any;
        g0.controls.name.setValue('  n1-edited  ');
        g0.controls.value.setValue('  v1-edited  ');

        const value = (component as any).getValue() as MetadataPart;
        expect(value.typeId).toBe(METADATA_PART_TYPEID);
        expect(value.metadata).toEqual([
          { type: 'a', name: 'n1-edited', value: 'v1-edited' },
        ]);
      });

      it('addMetadatum should push a new row with an incrementing _uid and mark the array dirty', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        component.addMetadatum({ name: 'foo', value: 'bar' });
        component.addMetadatum({ name: 'baz', value: 'qux' });

        expect(component.metadata.length).toBe(2);
        const uid0 = (component.metadata.at(0) as any).controls._uid.value;
        const uid1 = (component.metadata.at(1) as any).controls._uid.value;
        expect(uid1).toBe(uid0 + 1);
        expect(component.metadata.dirty).toBe(true);
      });

      it('addMetadatum should mark the array dirty when an added row changes value', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        component.addMetadatum({ name: 'foo', value: 'bar' });
        component.metadata.markAsPristine();
        expect(component.metadata.pristine).toBe(true);

        const g = component.metadata.at(0) as any;
        g.controls.value.setValue('changed');

        expect(component.metadata.dirty).toBe(true);
      });

      it('removeMetadatum should remove the row at the given index', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([
            { name: 'n1', value: 'v1' },
            { name: 'n2', value: 'v2' },
          ]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        component.removeMetadatum(0);

        expect(component.metadata.length).toBe(1);
        expect((component.metadata.at(0) as any).controls.name.value).toBe(
          'n2',
        );
      });

      it('moveMetadatumUp should be a no-op at index 0', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([
            { name: 'n1', value: 'v1' },
            { name: 'n2', value: 'v2' },
          ]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        component.moveMetadatumUp(0);

        expect((component.metadata.at(0) as any).controls.name.value).toBe(
          'n1',
        );
      });

      it('moveMetadatumUp should swap the row with the previous one', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([
            { name: 'n1', value: 'v1' },
            { name: 'n2', value: 'v2' },
          ]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        component.moveMetadatumUp(1);

        expect((component.metadata.at(0) as any).controls.name.value).toBe(
          'n2',
        );
        expect((component.metadata.at(1) as any).controls.name.value).toBe(
          'n1',
        );
      });

      it('moveMetadatumDown should be a no-op at the last index', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([
            { name: 'n1', value: 'v1' },
            { name: 'n2', value: 'v2' },
          ]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        component.moveMetadatumDown(1);

        expect((component.metadata.at(1) as any).controls.name.value).toBe(
          'n2',
        );
      });

      it('moveMetadatumDown should swap the row with the next one', () => {
        fixture.componentRef.setInput('data', {
          value: getPart([
            { name: 'n1', value: 'v1' },
            { name: 'n2', value: 'v2' },
          ]),
          thesauri: {},
        } as EditedObject<MetadataPart>);
        fixture.detectChanges();

        component.moveMetadatumDown(0);

        expect((component.metadata.at(0) as any).controls.name.value).toBe(
          'n2',
        );
        expect((component.metadata.at(1) as any).controls.name.value).toBe(
          'n1',
        );
      });
    });
  });

  describe('when the noType setting is true', () => {
    beforeEach(async () => {
      await configure({ noType: true });
    });

    it('should set noType to true', async () => {
      await fixture.whenStable();
      expect(component.noType()).toBe(true);
    });
  });

  describe('when the noType setting is false', () => {
    beforeEach(async () => {
      await configure({ noType: false });
    });

    it('should keep noType false', async () => {
      await fixture.whenStable();
      expect(component.noType()).toBe(false);
    });
  });
});
