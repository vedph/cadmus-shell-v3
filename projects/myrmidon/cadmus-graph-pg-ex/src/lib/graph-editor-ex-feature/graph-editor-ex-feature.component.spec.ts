import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { DataPage } from '@myrmidon/ngx-tools';
import {
  GraphService,
  ThesaurusService,
  ItemService,
  NodeSourceType,
  UriNode,
} from '@myrmidon/cadmus-api';
import { LibraryRouteService, ThesauriSet, Part } from '@myrmidon/cadmus-core';
import {
  NodeListRepository,
  GraphTripleListRepository,
} from '@myrmidon/cadmus-graph-ui';
import {
  GraphNode,
  GraphWalkerComponent,
  ForceGraphRendererComponent,
} from '@myrmidon/cadmus-graph-ui-ex';

import { GraphEditorExFeatureComponent } from './graph-editor-ex-feature.component';

// GraphWalkerComponent renders ForceGraphRendererComponent, a WebGL/canvas
// third-party library wrapper that crashes under jsdom on
// ngAfterViewInit. Since this feature's <mat-tab-group preserveContent>
// renders all tabs (including the walker) eagerly, that crash is
// unavoidable unless the walker's real renderer is swapped for a no-op
// stand-in - mirroring the override already used in
// cadmus-graph-ui-ex's own graph-walker.component.spec.ts.
@Component({ selector: 'cadmus-force-graph-renderer', template: '' })
class FakeForceGraphRendererComponent {
  public readonly nodes = input<GraphNode[]>([]);
  public readonly edges = input<any[]>([]);
  public readonly mode = input<'2d' | '3d'>('2d');
  public readonly update$ = input<Subject<boolean>>();
  public readonly center$ = input<Subject<boolean>>();
  public readonly zoomToFit$ = input<Subject<any>>();
  public readonly nodeSelect = output<GraphNode>();
  public readonly nodeDoubleClick = output<GraphNode>();
  public readonly modeChange = output<'2d' | '3d'>();
}

function makeThesauriSet(): ThesauriSet {
  return {
    'graph-node-tags': {
      id: 'graph-node-tags',
      entries: [{ id: 'person', value: 'Person' }],
    },
  };
}

function makeNodeRepository() {
  return {
    loading$: new BehaviorSubject<boolean | undefined>(undefined),
    page$: new BehaviorSubject<DataPage<any>>({
      pageNumber: 1,
      pageSize: 10,
      pageCount: 0,
      total: 0,
      items: [],
    }),
    filter$: new BehaviorSubject<any>({}),
    linkedNode$: new BehaviorSubject<any>(undefined),
    classNodes$: new BehaviorSubject<any>(undefined),
    reset: vi.fn(),
    setPage: vi.fn(),
    getLinkedNode: vi.fn(),
    getClassNodes: vi.fn().mockReturnValue([]),
    setLinkedNode: vi.fn(),
    setLinkedNodeId: vi.fn(),
    addClassNode: vi.fn(),
    setClassNodeIds: vi.fn(),
    deleteClassNode: vi.fn(),
    setFilter: vi.fn(),
    getFilter: vi.fn().mockReturnValue({}),
  };
}

function makeTripleRepository() {
  return {
    page$: new BehaviorSubject<DataPage<any>>({
      pageNumber: 1,
      pageSize: 20,
      pageCount: 0,
      total: 0,
      items: [],
    }),
    loading$: new BehaviorSubject<boolean | undefined>(undefined),
    filter$: new BehaviorSubject<any>({}),
    subjectNode$: new BehaviorSubject<any>(undefined),
    predicateNode$: new BehaviorSubject<any>(undefined),
    objectNode$: new BehaviorSubject<any>(undefined),
    setPage: vi.fn(),
    reset: vi.fn(),
    setTerm: vi.fn(),
    setTermId: vi.fn(),
    getTerm: vi.fn(),
    setFilter: vi.fn(),
  };
}

describe('GraphEditorExFeatureComponent', () => {
  let component: GraphEditorExFeatureComponent;
  let fixture: ComponentFixture<GraphEditorExFeatureComponent>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let itemService: { getPart: ReturnType<typeof vi.fn> };
  let libraryRouteService: { buildPartEditorRoute: ReturnType<typeof vi.fn> };
  let snackbar: { open: ReturnType<typeof vi.fn> };
  let graphService: any;

  beforeEach(async () => {
    router = { navigate: vi.fn() };
    itemService = { getPart: vi.fn() };
    libraryRouteService = {
      buildPartEditorRoute: vi
        .fn()
        .mockReturnValue({ route: '/items/item1/general/it.vedph.note/part1' }),
    };
    snackbar = { open: vi.fn() };
    graphService = {
      getNodes: vi.fn().mockReturnValue(of({ items: [] })),
      // consumed by GraphWalker once the walker tab actually initializes
      // (now that [graphService] is correctly bound - see the regression
      // test above).
      getNode: vi.fn().mockReturnValue(of(undefined)),
      getTripleGroups: vi.fn().mockReturnValue(of({ items: [] })),
      getLinkedNodes: vi.fn().mockReturnValue(of({ items: [] })),
      getLinkedLiterals: vi.fn().mockReturnValue(of({ items: [] })),
    };

    await TestBed.configureTestingModule({
      imports: [GraphEditorExFeatureComponent],
      providers: [
        {
          provide: ThesaurusService,
          useValue: { getThesauriSet: vi.fn().mockReturnValue(of(makeThesauriSet())) },
        },
        { provide: Router, useValue: router },
        { provide: ItemService, useValue: itemService },
        { provide: LibraryRouteService, useValue: libraryRouteService },
        { provide: MatSnackBar, useValue: snackbar },
        { provide: GraphService, useValue: graphService },
        { provide: NodeListRepository, useValue: makeNodeRepository() },
        { provide: GraphTripleListRepository, useValue: makeTripleRepository() },
        { provide: DialogService, useValue: { confirm: vi.fn().mockReturnValue(of(true)) } },
      ],
    })
      .overrideComponent(GraphWalkerComponent, {
        remove: { imports: [ForceGraphRendererComponent] },
        add: { imports: [FakeForceGraphRendererComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GraphEditorExFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate nodeTagEntries from the resolved thesauri', () => {
    expect(component.nodeTagEntries()).toEqual([{ id: 'person', value: 'Person' }]);
  });

  it('should expose its GraphService instance for the walker to bind to', () => {
    // regression test: the <cadmus-graph-walker> element must receive
    // [graphService], or its own graphService input stays undefined and
    // the walker never initializes (a real bug this test guards against).
    expect(component.graphService).toBe(graphService);
  });

  it('should start on the nodes tab with node id 0', () => {
    expect(component.tabIndex).toBe(0);
    expect(component.walkerNodeId).toBe(0);
  });

  describe('onNodeWalk', () => {
    it('should switch to the walker tab with the picked node id', () => {
      component.onNodeWalk({ id: 42 } as UriNode);
      expect(component.walkerNodeId).toBe(42);
      expect(component.tabIndex).toBe(2);
    });
  });

  describe('onWalkerNodePick', () => {
    it('should do nothing when the node has no data', () => {
      component.tabIndex = 2;
      component.onWalkerNodePick({ id: 'N1', label: 'l' } as GraphNode);
      expect(component.tabIndex).toBe(2);
      expect(component.editedNode).toBeUndefined();
    });

    it('should switch to the nodes tab and build editedNode from the picked node', () => {
      component.tabIndex = 2;
      const node: GraphNode = {
        id: 'N123',
        label: 'Alpha',
        data: {
          isClass: true,
          sourceType: NodeSourceType.User,
          tag: 'a-tag',
          sid: 'some-sid',
          uri: 'x:alpha',
        },
      };

      component.onWalkerNodePick(node);

      expect(component.tabIndex).toBe(0);
      expect(component.editedNode).toEqual({
        id: 123,
        isClass: true,
        label: 'Alpha',
        sourceType: NodeSourceType.User,
        tag: 'a-tag',
        sid: 'some-sid',
        uri: 'x:alpha',
      });
    });

    it('should fall back to the node id as the label when there is no label', () => {
      const node: GraphNode = {
        id: 'N5',
        data: { sourceType: NodeSourceType.User },
      };
      component.onWalkerNodePick(node);
      expect(component.editedNode?.label).toBe('N5');
    });

    it('should default to id 0 when the node id has no N-prefixed number', () => {
      const node: GraphNode = { id: 'weird', data: { sourceType: NodeSourceType.User } };
      component.onWalkerNodePick(node);
      expect(component.editedNode?.id).toBe(0);
    });
  });

  describe('onWalkerMoveToSource', () => {
    it('should do nothing when the node has no data', () => {
      component.onWalkerMoveToSource({ id: 'N1' } as GraphNode);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to the item for an Item-sourced node', () => {
      const sid = '12345678-1234-1234-1234-123456789012:extra';
      component.onWalkerMoveToSource({
        id: 'N1',
        data: { sourceType: NodeSourceType.Item, sid },
      } as GraphNode);

      expect(router.navigate).toHaveBeenCalledWith([
        '/items',
        '12345678-1234-1234-1234-123456789012',
      ]);
    });

    it('should load and navigate to the part editor for a Part-sourced node', () => {
      const sid = '12345678-1234-1234-1234-123456789012:extra';
      const part: Part = {
        id: 'part1',
        itemId: 'item1',
        typeId: 'it.vedph.note',
        timeCreated: new Date(0),
        creatorId: 'u',
        timeModified: new Date(0),
        userId: 'u',
      };
      itemService.getPart.mockReturnValue(of(part));

      component.onWalkerMoveToSource({
        id: 'N1',
        data: { sourceType: NodeSourceType.Part, sid },
      } as GraphNode);

      expect(itemService.getPart).toHaveBeenCalledWith(
        '12345678-1234-1234-1234-123456789012',
      );
      expect(libraryRouteService.buildPartEditorRoute).toHaveBeenCalledWith(
        'item1',
        'part1',
        'it.vedph.note',
        undefined,
      );
      expect(router.navigate).toHaveBeenCalledWith(
        ['/items/item1/general/it.vedph.note/part1'],
        {},
      );
    });

    it('should show a snackbar and not navigate when loading the part errors', () => {
      const sid = '12345678-1234-1234-1234-123456789012:extra';
      itemService.getPart.mockReturnValue(throwError(() => new Error('boom')));

      component.onWalkerMoveToSource({
        id: 'N1',
        data: { sourceType: NodeSourceType.Part, sid },
      } as GraphNode);

      expect(snackbar.open).toHaveBeenCalledWith('Error loading part', 'OK');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should do nothing for a User/Thesaurus/Implicit-sourced node', () => {
      component.onWalkerMoveToSource({
        id: 'N1',
        data: { sourceType: NodeSourceType.User, sid: 'x' },
      } as GraphNode);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(itemService.getPart).not.toHaveBeenCalled();
    });
  });
});
