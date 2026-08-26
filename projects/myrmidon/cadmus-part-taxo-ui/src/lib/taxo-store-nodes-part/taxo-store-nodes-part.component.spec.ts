import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedObject } from '@myrmidon/cadmus-core';
import { TaxoStorePicker } from '@myrmidon/taxo-store-picker';
import { TaxoStoreNode } from '@myrmidon/taxo-store-api';

import { TaxoStoreNodesPartComponent } from './taxo-store-nodes-part.component';
import {
  TaxoStoreNodesPart,
  TAXO_STORE_NODES_PART_TYPEID,
} from '../taxo-store-nodes-part';

// TaxoStorePicker is an external published component (@myrmidon/taxo-store-
// picker) that injects TaxoStoreService/TaxoStoreLookupService and eagerly
// loads tree data on init. Testing its internals is out of scope here;
// swap it for a trivial stand-in matching only the selector/inputs/outputs
// this editor's template actually binds to.
@Component({ selector: 'ts-taxo-store-picker', template: '' })
class FakeTaxoStorePicker {
  public readonly treeId = input.required<string>();
  public readonly hasTopNodeFilter = input(true);
  public readonly hasFlagsFilter = input(true);
  public readonly availableFlags = input<{ id: string; name: string }[]>([]);
  public readonly canEdit = input(true);
  public readonly canAdd = input(true);
  public readonly canDelete = input(true);
  public readonly nodePick = output<TaxoStoreNode>();
}

function makePart(overrides?: Partial<TaxoStoreNodesPart>): TaxoStoreNodesPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: TAXO_STORE_NODES_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    treeId: 'tree1',
    nodeIds: [],
    ...overrides,
  };
}

describe('TaxoStoreNodesPartComponent', () => {
  let component: TaxoStoreNodesPartComponent;
  let fixture: ComponentFixture<TaxoStoreNodesPartComponent>;
  let authUser$: BehaviorSubject<User | null>;
  let appRepository: {
    getTypeThesaurus: ReturnType<typeof vi.fn>;
    getSettingFor: ReturnType<typeof vi.fn>;
  };

  async function configure(settingValue: any = undefined) {
    TestBed.resetTestingModule();
    authUser$ = new BehaviorSubject<User | null>(null);
    appRepository = {
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getSettingFor: vi.fn().mockResolvedValue(settingValue),
    };

    await TestBed.configureTestingModule({
      imports: [TaxoStoreNodesPartComponent],
      providers: [
        {
          provide: AuthJwtService,
          useValue: { currentUser$: authUser$, currentUserValue: null },
        },
        { provide: AppRepository, useValue: appRepository },
      ],
    })
      .overrideComponent(TaxoStoreNodesPartComponent, {
        remove: { imports: [TaxoStorePicker] },
        add: { imports: [FakeTaxoStorePicker] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TaxoStoreNodesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build an initially empty nodeIds control', () => {
    expect(component.nodeIds.value).toEqual([]);
  });

  describe('settings (via initSettings)', () => {
    it('should apply role-specific settings when found', async () => {
      await configure({
        treeId: 'role-tree',
        hasTopNodeFilter: false,
        hasFlagsFilter: true,
        availableFlags: [{ id: 'f1', name: 'Flag 1' }],
        canEdit: false,
        canAdd: false,
        canDelete: false,
      });
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: TAXO_STORE_NODES_PART_TYPEID,
        partId: 'part1',
        roleId: 'scholarly',
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.treeId()).toBe('role-tree');
      expect(component.hasTopNodeFilter()).toBe(false);
      expect(component.hasFlagsFilter()).toBe(true);
      expect(component.availableFlags()).toEqual([{ id: 'f1', name: 'Flag 1' }]);
      expect(component.canEdit()).toBe(false);
      expect(component.canAdd()).toBe(false);
      expect(component.canDelete()).toBe(false);
    });

    it('should fall back to global settings when role-specific settings are undefined', async () => {
      // first call (role-specific) resolves undefined, second call (global)
      // resolves the actual settings
      appRepository = {
        getTypeThesaurus: vi.fn().mockReturnValue(undefined),
        getSettingFor: vi
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ treeId: 'global-tree' }),
      };
      TestBed.resetTestingModule();
      authUser$ = new BehaviorSubject<User | null>(null);
      await TestBed.configureTestingModule({
        imports: [TaxoStoreNodesPartComponent],
        providers: [
          {
            provide: AuthJwtService,
            useValue: { currentUser$: authUser$, currentUserValue: null },
          },
          { provide: AppRepository, useValue: appRepository },
        ],
      })
        .overrideComponent(TaxoStoreNodesPartComponent, {
          remove: { imports: [TaxoStorePicker] },
          add: { imports: [FakeTaxoStorePicker] },
        })
        .compileComponents();
      fixture = TestBed.createComponent(TaxoStoreNodesPartComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: TAXO_STORE_NODES_PART_TYPEID,
        partId: 'part1',
        roleId: 'scholarly',
      });
      fixture.detectChanges();
      await fixture.whenStable();
      await Promise.resolve();
      await Promise.resolve();

      expect(component.treeId()).toBe('global-tree');
    });

    it('should fall back to default settings when neither role nor global settings are found', async () => {
      appRepository = {
        getTypeThesaurus: vi.fn().mockReturnValue(undefined),
        getSettingFor: vi.fn().mockResolvedValue(undefined),
      };
      TestBed.resetTestingModule();
      authUser$ = new BehaviorSubject<User | null>(null);
      await TestBed.configureTestingModule({
        imports: [TaxoStoreNodesPartComponent],
        providers: [
          {
            provide: AuthJwtService,
            useValue: { currentUser$: authUser$, currentUserValue: null },
          },
          { provide: AppRepository, useValue: appRepository },
        ],
      })
        .overrideComponent(TaxoStoreNodesPartComponent, {
          remove: { imports: [TaxoStorePicker] },
          add: { imports: [FakeTaxoStorePicker] },
        })
        .compileComponents();
      fixture = TestBed.createComponent(TaxoStoreNodesPartComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: TAXO_STORE_NODES_PART_TYPEID,
        partId: 'part1',
        roleId: 'scholarly',
      });
      fixture.detectChanges();
      await fixture.whenStable();
      await Promise.resolve();
      await Promise.resolve();

      // DEFAULT_SETTINGS
      expect(component.treeId()).toBe('');
      expect(component.hasTopNodeFilter()).toBe(true);
      expect(component.canEdit()).toBe(true);
      expect(component.canAdd()).toBe(true);
      expect(component.canDelete()).toBe(true);
    });
  });

  describe('onDataSet / updateForm', () => {
    it('should reset the form when data becomes undefined', () => {
      fixture.componentRef.setInput('data', {
        value: makePart({ nodeIds: [{ name: 'n1', value: 'v1' }] }),
        thesauri: {},
      } as EditedObject<TaxoStoreNodesPart>);
      fixture.detectChanges();
      expect(component.nodeIds.value).toEqual([{ name: 'n1', value: 'v1' }]);

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();

      expect(component.nodeIds.value).toEqual([]);
    });

    it('should populate nodeIds from the part', () => {
      const nodeIds = [
        { name: 'n1', value: 'v1' },
        { name: 'n2', value: 'v2' },
      ];
      fixture.componentRef.setInput('data', {
        value: makePart({ nodeIds }),
        thesauri: {},
      } as EditedObject<TaxoStoreNodesPart>);
      fixture.detectChanges();

      expect(component.nodeIds.value).toEqual(nodeIds);
      expect(component.form.pristine).toBe(true);
    });

    it('should default nodeIds to an empty array when the part has none', () => {
      fixture.componentRef.setInput('data', {
        value: makePart({ nodeIds: undefined as any }),
        thesauri: {},
      } as EditedObject<TaxoStoreNodesPart>);
      fixture.detectChanges();

      expect(component.nodeIds.value).toEqual([]);
    });
  });

  describe('getValue', () => {
    it('should build a part with a copy of the current nodeIds', () => {
      fixture.componentRef.setInput('identity', {
        itemId: 'item1',
        typeId: TAXO_STORE_NODES_PART_TYPEID,
        partId: 'part1',
        roleId: null,
      });
      const nodeIds = [{ name: 'n1', value: 'v1' }];
      component.nodeIds.setValue(nodeIds);

      const part = (component as any).getValue() as TaxoStoreNodesPart;

      expect(part.nodeIds).toEqual(nodeIds);
      expect(part.nodeIds).not.toBe(nodeIds);
    });
  });

  describe('addNode', () => {
    it('should append a new node and sort by label', () => {
      component.addNode({ key: 'k2', label: 'Beta' } as TaxoStoreNode);
      component.addNode({ key: 'k1', label: 'Alpha' } as TaxoStoreNode);

      expect(component.nodeIds.value).toEqual([
        { value: 'k1', name: 'Alpha' },
        { value: 'k2', name: 'Beta' },
      ]);
      expect(component.nodeIds.dirty).toBe(true);
    });

    it('should update the label when the same key is picked again with a different label', () => {
      component.addNode({ key: 'k1', label: 'Old' } as TaxoStoreNode);
      component.nodeIds.markAsPristine();

      component.addNode({ key: 'k1', label: 'New' } as TaxoStoreNode);

      expect(component.nodeIds.value).toEqual([{ value: 'k1', name: 'New' }]);
      expect(component.nodeIds.dirty).toBe(true);
    });

    it('should do nothing when the same key/label is picked again', () => {
      component.addNode({ key: 'k1', label: 'Same' } as TaxoStoreNode);
      component.nodeIds.markAsPristine();

      component.addNode({ key: 'k1', label: 'Same' } as TaxoStoreNode);

      expect(component.nodeIds.value).toEqual([{ value: 'k1', name: 'Same' }]);
      expect(component.nodeIds.dirty).toBe(false);
    });
  });

  describe('removeNode', () => {
    it('should remove the node at the given index', () => {
      component.addNode({ key: 'k1', label: 'Alpha' } as TaxoStoreNode);
      component.addNode({ key: 'k2', label: 'Beta' } as TaxoStoreNode);

      component.removeNode(0);

      expect(component.nodeIds.value).toEqual([{ value: 'k2', name: 'Beta' }]);
      expect(component.nodeIds.dirty).toBe(true);
    });
  });
});
