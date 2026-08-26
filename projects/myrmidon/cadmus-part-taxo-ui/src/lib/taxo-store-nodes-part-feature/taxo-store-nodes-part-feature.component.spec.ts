import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { TaxoStorePicker } from '@myrmidon/taxo-store-picker';
import { TaxoStoreNode } from '@myrmidon/taxo-store-api';
import { EditedObject } from '@myrmidon/cadmus-core';

import { TaxoStoreNodesPartFeatureComponent } from './taxo-store-nodes-part-feature.component';
import { TaxoStoreNodesPartComponent } from '../taxo-store-nodes-part/taxo-store-nodes-part.component';
import {
  TaxoStoreNodesPart,
  TAXO_STORE_NODES_PART_TYPEID,
} from '../taxo-store-nodes-part';

// see taxo-store-nodes-part.component.spec.ts: TaxoStorePicker is an
// external component out of scope for this test.
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

describe('TaxoStoreNodesPartFeatureComponent', () => {
  let component: TaxoStoreNodesPartFeatureComponent;
  let fixture: ComponentFixture<TaxoStoreNodesPartFeatureComponent>;
  let editorService: {
    loading$: BehaviorSubject<boolean>;
    saving$: BehaviorSubject<boolean>;
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  function makeRoute(overrides?: { pid?: string; rid?: string }): ActivatedRoute {
    return {
      snapshot: {
        params: { iid: 'item1', pid: overrides?.pid ?? 'part1' },
        queryParams: overrides?.rid ? { rid: overrides.rid } : {},
        routeConfig: { path: `${TAXO_STORE_NODES_PART_TYPEID}/:pid` },
      },
    } as unknown as ActivatedRoute;
  }

  async function configure(
    loadResult: EditedObject<TaxoStoreNodesPart> | null | undefined = undefined,
    routeOverrides?: { pid?: string; rid?: string },
  ) {
    TestBed.resetTestingModule();
    editorService = {
      loading$: new BehaviorSubject<boolean>(false),
      saving$: new BehaviorSubject<boolean>(false),
      load: vi.fn().mockResolvedValue(loadResult),
      save: vi.fn().mockResolvedValue({ id: 'part1' }),
    };
    router = { navigate: vi.fn() };
    const authUser$ = new BehaviorSubject<User | null>(null);

    await TestBed.configureTestingModule({
      imports: [TaxoStoreNodesPartFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: makeRoute(routeOverrides) },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: ItemService, useValue: {} },
        { provide: ThesaurusService, useValue: {} },
        { provide: PartEditorService, useValue: editorService },
        {
          provide: AuthJwtService,
          useValue: { currentUser$: authUser$, currentUserValue: null },
        },
        {
          provide: AppRepository,
          useValue: {
            getTypeThesaurus: vi.fn().mockReturnValue(undefined),
            getSettingFor: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: EditedItemRepository,
          useValue: { item$: new BehaviorSubject(undefined) },
        },
      ],
    })
      .overrideComponent(TaxoStoreNodesPartComponent, {
        remove: { imports: [TaxoStorePicker] },
        add: { imports: [FakeTaxoStorePicker] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TaxoStoreNodesPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({ value: makePart(), thesauri: {} });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(TAXO_STORE_NODES_PART_TYPEID);
  });

  it('should load data on init with no thesauri requested', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), []);
    expect(component.data()?.value).toEqual(makePart());
  });

  it('should update dirty via onDirtyChange', () => {
    expect(component.dirty()).toBe(false);
    component.onDirtyChange(true);
    expect(component.dirty()).toBe(true);
  });

  it('canDeactivate should be true unless dirty', () => {
    expect(component.canDeactivate()).toBe(true);
    component.onDirtyChange(true);
    expect(component.canDeactivate()).toBe(false);
  });

  it('save should delegate to the editor service', async () => {
    const part = makePart({ nodeIds: [{ name: 'n1', value: 'v1' }] });
    component.save(part);
    await Promise.resolve();
    expect(editorService.save).toHaveBeenCalledWith(part);
  });

  it('close should navigate to the item', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
