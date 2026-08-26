import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { DataPage } from '@myrmidon/ngx-tools';
import {
  GraphService,
  NodeSourceType,
  TripleGroup,
  UriNode,
} from '@myrmidon/cadmus-api';

import { GraphWalkerComponent } from './graph-walker.component';
import {
  ForceGraphRendererComponent,
  GraphMode,
} from '../force-graph-renderer/force-graph-renderer.component';
import { TripleFilterComponent } from '../triple-filter/triple-filter.component';
import { LinkedNodeFilterComponent } from '../linked-node-filter/linked-node-filter.component';
import { LinkedLiteralFilterComponent } from '../linked-literal-filter/linked-literal-filter.component';
import { GraphNode, Edge, ZoomOptions } from '../../graph-interfaces';
import {
  PagedLinkedLiteralFilter,
  PagedLinkedNodeFilter,
  PagedTripleFilter,
} from '../../graph-walker';

//#region fakes for the heavy/unrelated child components
// The real ForceGraphRendererComponent drives a WebGL/canvas library
// (force-graph / 3d-force-graph) on AfterViewInit, which is out of scope
// for this component's tests and unsafe to render under jsdom. The three
// filter components are covered by their own spec files (written by
// another agent in parallel) and may inject services this test does not
// want to provide. All four are swapped for trivial stand-ins that match
// only the selector/inputs/outputs the template actually binds to.
@Component({
  selector: 'cadmus-force-graph-renderer',
  template: '',
})
class FakeForceGraphRendererComponent {
  public readonly nodes = input<GraphNode[]>([]);
  public readonly edges = input<Edge[]>([]);
  public readonly mode = input<GraphMode>('2d');
  public readonly update$ = input<Subject<boolean>>();
  public readonly center$ = input<Subject<boolean>>();
  public readonly zoomToFit$ = input<Subject<ZoomOptions>>();
  public readonly nodeSelect = output<GraphNode>();
  public readonly nodeDoubleClick = output<GraphNode>();
  public readonly modeChange = output<GraphMode>();
}

@Component({
  selector: 'cadmus-walker-triple-filter',
  template: '',
})
class FakeTripleFilterComponent {
  public readonly filter = input<PagedTripleFilter | null>();
  public readonly filterChange = output<PagedTripleFilter>();
}

@Component({
  selector: 'cadmus-walker-linked-node-filter',
  template: '',
})
class FakeLinkedNodeFilterComponent {
  public readonly filter = input<PagedLinkedNodeFilter | null>();
  public readonly filterChange = output<PagedLinkedNodeFilter>();
}

@Component({
  selector: 'cadmus-walker-linked-literal-filter',
  template: '',
})
class FakeLinkedLiteralFilterComponent {
  public readonly filter = input<PagedLinkedLiteralFilter | null>();
  public readonly filterChange = output<PagedLinkedLiteralFilter>();
}
//#endregion

//#region helpers
function makeUriNode(id: number, overrides?: Partial<UriNode>): UriNode {
  return {
    id,
    uri: `x:node${id}`,
    label: `Node ${id}`,
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

function makeGroup(
  predicateId: number,
  predicateUri: string,
  count: number
): TripleGroup {
  return { predicateId, predicateUri, count };
}

function makePage<T>(items: T[], total?: number): DataPage<T> {
  return {
    pageNumber: 1,
    pageSize: 20,
    pageCount: 1,
    total: total ?? items.length,
    items,
  };
}
//#endregion

describe('GraphWalkerComponent', () => {
  let component: GraphWalkerComponent;
  let fixture: ComponentFixture<GraphWalkerComponent>;
  let graphService: {
    getNode: ReturnType<typeof vi.fn>;
    getTripleGroups: ReturnType<typeof vi.fn>;
    getLinkedNodes: ReturnType<typeof vi.fn>;
    getLinkedLiterals: ReturnType<typeof vi.fn>;
  };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };

  // sets both inputs needed to create+populate the internal GraphWalker,
  // and flushes the constructor effects that react to them.
  function initWalker(): void {
    fixture.componentRef.setInput(
      'graphService',
      graphService as unknown as GraphService
    );
    fixture.componentRef.setInput('nodeId', 1);
    fixture.detectChanges();
  }

  function currentNodes(): GraphNode[] {
    let nodes: GraphNode[] = [];
    component.nodes$.subscribe((n) => (nodes = n));
    return nodes;
  }

  function findNode(id: string): GraphNode {
    return currentNodes().find((n) => n.id === id)!;
  }

  beforeEach(async () => {
    graphService = {
      getNode: vi.fn().mockReturnValue(of(makeUriNode(1, { label: 'Root' }))),
      getTripleGroups: vi.fn().mockReturnValue(of(makePage<TripleGroup>([]))),
      getLinkedNodes: vi.fn().mockReturnValue(of(makePage<UriNode>([]))),
      getLinkedLiterals: vi.fn().mockReturnValue(of(makePage([]))),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [GraphWalkerComponent],
      providers: [{ provide: DialogService, useValue: dialogService }],
    })
      .overrideComponent(GraphWalkerComponent, {
        remove: {
          imports: [
            ForceGraphRendererComponent,
            TripleFilterComponent,
            LinkedNodeFilterComponent,
            LinkedLiteralFilterComponent,
          ],
        },
        add: {
          imports: [
            FakeForceGraphRendererComponent,
            FakeTripleFilterComponent,
            FakeLinkedNodeFilterComponent,
            FakeLinkedLiteralFilterComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GraphWalkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('walker creation and reset wiring', () => {
    it('should create a GraphWalker and wire its observables once graphService is provided', () => {
      fixture.componentRef.setInput(
        'graphService',
        graphService as unknown as GraphService
      );
      fixture.detectChanges();

      expect(currentNodes()).toEqual([]);
    });

    it('should reset the walker when nodeId is set while graphService is available', () => {
      initWalker();

      expect(graphService.getNode).toHaveBeenCalledWith(1);
      expect(currentNodes().map((n) => n.id)).toEqual(['N1']);
    });

    // Documents the current effect wiring: the nodeId-watching effect only
    // reads the plain `this._walker` field (not a signal), so it does not
    // re-run just because graphService becomes available afterwards. Flagged
    // for review rather than changed, since callers may always provide
    // graphService synchronously in practice.
    it('should NOT auto-reset if nodeId was already set before graphService becomes available', () => {
      fixture.componentRef.setInput('nodeId', 1);
      fixture.detectChanges();

      fixture.componentRef.setInput(
        'graphService',
        graphService as unknown as GraphService
      );
      fixture.detectChanges();

      expect(graphService.getNode).not.toHaveBeenCalled();
    });
  });

  describe('onNodeSelect', () => {
    it('should select the given node in the walker', () => {
      initWalker();
      let selected: GraphNode | null = null;
      component.selectedNode$.subscribe((n) => (selected = n));

      component.onNodeSelect(findNode('N1'));

      expect(selected!.id).toBe('N1');
    });
  });

  describe('onNodeDblClick', () => {
    it('should toggle (collapse) an already-expanded node via the walker', () => {
      initWalker();
      const n1 = findNode('N1');
      expect(n1.data.expanded).toBe(true); // auto-expanded by reset()

      component.onNodeDblClick(n1);

      expect(n1.data.expanded).toBeUndefined();
    });
  });

  describe('onReset', () => {
    it('should do nothing when nodeId is 0 (falsy)', () => {
      fixture.componentRef.setInput(
        'graphService',
        graphService as unknown as GraphService
      );
      fixture.detectChanges();

      component.onReset();

      expect(dialogService.confirm).not.toHaveBeenCalled();
    });

    it('should confirm with the user and reset the walker when confirmed', () => {
      initWalker();
      graphService.getNode.mockClear();

      component.onReset();

      expect(dialogService.confirm).toHaveBeenCalledWith(
        'Reset',
        'Reset the whole graph?'
      );
      expect(graphService.getNode).toHaveBeenCalledWith(1);
    });

    it('should not reset the walker when the user declines', () => {
      dialogService.confirm.mockReturnValue(of(false));
      initWalker();
      graphService.getNode.mockClear();

      component.onReset();

      expect(graphService.getNode).not.toHaveBeenCalled();
    });
  });

  describe('update$ subscription', () => {
    it('should trigger onReset (via ngOnInit wiring) when update$ emits', () => {
      initWalker();
      graphService.getNode.mockClear();

      component.update$.next(true);

      expect(dialogService.confirm).toHaveBeenCalled();
      expect(graphService.getNode).toHaveBeenCalledWith(1);
    });

    it('should stop reacting to update$ after ngOnDestroy', () => {
      initWalker();
      fixture.destroy();
      dialogService.confirm.mockClear();

      component.update$.next(true);

      expect(dialogService.confirm).not.toHaveBeenCalled();
    });
  });

  describe('onGraphModeChange', () => {
    it('should update the graphMode signal', () => {
      expect(component.graphMode()).toBe('2d');

      component.onGraphModeChange('3d');

      expect(component.graphMode()).toBe('3d');
    });
  });

  describe('filter change handlers', () => {
    beforeEach(() => {
      graphService.getTripleGroups.mockImplementation(
        (_pn: number, _ps: number, filter: any) => {
          if (filter.subjectId !== undefined) {
            return of(makePage([makeGroup(10, 'x:p', 1)], 1));
          }
          return of(makePage<TripleGroup>([], 0));
        }
      );
      initWalker();
    });

    it('onNOutFilterChange should expand the selected N node using the updated out filter', () => {
      component.onNodeSelect(findNode('N1'));
      graphService.getTripleGroups.mockClear();

      component.onNOutFilterChange({
        pageNumber: 2,
        pageSize: 10,
        subjectId: 1,
      });

      expect(graphService.getTripleGroups).toHaveBeenCalled();
    });

    it('onNInFilterChange should expand the selected N node using the updated in filter', () => {
      component.onNodeSelect(findNode('N1'));
      graphService.getTripleGroups.mockClear();

      component.onNInFilterChange({
        pageNumber: 2,
        pageSize: 10,
        objectId: 1,
      });

      expect(graphService.getTripleGroups).toHaveBeenCalled();
    });

    it('onNOutFilterChange should do nothing when a P node (not N) is selected', () => {
      component.onNodeSelect(findNode('P10N1'));
      graphService.getTripleGroups.mockClear();

      component.onNOutFilterChange({ pageNumber: 2, pageSize: 10 });

      expect(graphService.getTripleGroups).not.toHaveBeenCalled();
    });

    it('onPOutFilterChange should expand the selected P node outbound linked nodes', () => {
      component.onNodeSelect(findNode('P10N1'));
      graphService.getLinkedNodes.mockClear();

      component.onPOutFilterChange({
        pageNumber: 2,
        pageSize: 10,
        otherNodeId: 1,
        predicateId: 10,
      });

      expect(graphService.getLinkedNodes).toHaveBeenCalled();
    });

    it('onPInFilterChange should expand the selected P node inbound linked nodes', () => {
      component.onNodeSelect(findNode('P10N1'));
      graphService.getLinkedNodes.mockClear();

      component.onPInFilterChange({
        pageNumber: 2,
        pageSize: 10,
        otherNodeId: 1,
        predicateId: 10,
      });

      expect(graphService.getLinkedNodes).toHaveBeenCalled();
    });

    it('onPLitFilterChange should expand the selected P node literal nodes', () => {
      component.onNodeSelect(findNode('P10N1'));
      graphService.getLinkedLiterals.mockClear();

      component.onPLitFilterChange({ pageNumber: 2, pageSize: 10 });

      expect(graphService.getLinkedLiterals).toHaveBeenCalled();
    });
  });

  describe('pickSelectedNode', () => {
    beforeEach(() => {
      initWalker();
    });

    it('should do nothing when no node is selected', () => {
      let picked: GraphNode | undefined;
      component.nodePick.subscribe((n) => (picked = n));

      component.pickSelectedNode({ shiftKey: false } as MouseEvent);

      expect(picked).toBeUndefined();
    });

    it('should emit nodePick on a plain click (no shift, or canMoveToSource false)', () => {
      component.onNodeSelect(findNode('N1'));
      let picked: GraphNode | undefined;
      component.nodePick.subscribe((n) => (picked = n));

      component.pickSelectedNode({ shiftKey: false } as MouseEvent);

      expect(picked!.id).toBe('N1');
    });

    it('should emit moveToSource on shift-click when canMoveToSource is true and the node has a sid', () => {
      graphService.getNode.mockReturnValue(
        of(makeUriNode(1, { sid: 'src-1' }))
      );
      // nodeId is already 1 from the outer beforeEach's initWalker(); a
      // signal input set to an equal value is a no-op and would not
      // re-trigger the reset effect, so cycle through 0 first to force it
      // to re-run against the now-updated getNode mock.
      fixture.componentRef.setInput('nodeId', 0);
      fixture.detectChanges();
      fixture.componentRef.setInput('nodeId', 1);
      fixture.detectChanges();
      fixture.componentRef.setInput('canMoveToSource', true);
      fixture.detectChanges();
      component.onNodeSelect(findNode('N1'));
      let moved: GraphNode | undefined;
      let picked: GraphNode | undefined;
      component.moveToSource.subscribe((n) => (moved = n));
      component.nodePick.subscribe((n) => (picked = n));

      component.pickSelectedNode({ shiftKey: true } as MouseEvent);

      expect(moved!.id).toBe('N1');
      expect(picked).toBeUndefined();
    });

    it('should emit neither event on shift-click when canMoveToSource is true but the node has no sid', () => {
      fixture.componentRef.setInput('canMoveToSource', true);
      fixture.detectChanges();
      component.onNodeSelect(findNode('N1')); // default fixture node has no sid

      let moved: GraphNode | undefined;
      let picked: GraphNode | undefined;
      component.moveToSource.subscribe((n) => (moved = n));
      component.nodePick.subscribe((n) => (picked = n));

      component.pickSelectedNode({ shiftKey: true } as MouseEvent);

      expect(moved).toBeUndefined();
      expect(picked).toBeUndefined();
    });
  });
});
