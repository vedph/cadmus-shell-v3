import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { ForceGraphRendererComponent } from './force-graph-renderer.component';
import { GraphNode, Edge } from '../../graph-interfaces';

// This component is a thin wrapper around three heavy, WebGL/Canvas-based
// third-party rendering libraries (force-graph, 3d-force-graph, three).
// Its actual graph creation/drawing (createGraph, initGraph, drawNode,
// drawLink, createNode3DWithLabel, createTextSprite) requires a real
// canvas/WebGL context that jsdom does not provide, and re-implementing
// those libraries as fakes would be low-value, brittle busywork. So this
// spec deliberately never calls fixture.detectChanges() (which would
// trigger ngAfterViewInit -> initGraph() -> the real libraries) and
// instead exercises only the component's own extractable logic directly:
// the pure data-mapping/label/color/size helpers, the click/hover
// handlers, and the public control methods (against a hand-stubbed
// `graph` object standing in for the real force-graph instance).
describe('ForceGraphRendererComponent', () => {
  let component: ForceGraphRendererComponent;
  let fixture: ComponentFixture<ForceGraphRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForceGraphRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ForceGraphRendererComponent);
    component = fixture.componentInstance;
    // do NOT call fixture.detectChanges() - see file header comment.
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('convertToForceGraphData', () => {
    it('should map nodes and edges to force-graph shaped data', () => {
      const nodes: GraphNode[] = [
        { id: 'N1', label: 'Alpha', data: { count: 3 } },
        { id: 'P1', label: 'hasName' },
      ];
      const edges: Edge[] = [
        { source: 'N1', target: 'P1', label: 'rel', data: { color: '#fff', width: 2 } },
      ];
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('edges', edges);

      const data = (component as any).convertToForceGraphData();

      expect(data.nodes).toHaveLength(2);
      expect(data.nodes[0]).toMatchObject({
        id: 'N1',
        name: 'Alpha (3)',
        val: 8, // N-prefixed id -> node size 8
        color: '#69b3a2',
      });
      expect(data.nodes[1]).toMatchObject({ id: 'P1', name: 'hasName', val: 6 });
      expect(data.links).toHaveLength(1);
      expect(data.links[0]).toMatchObject({
        source: 'N1',
        target: 'P1',
        color: '#fff',
        width: 2,
      });
    });

    it('should fall back to the node id as the display name when there is no label', () => {
      fixture.componentRef.setInput('nodes', [{ id: 'N9' }] as GraphNode[]);
      fixture.componentRef.setInput('edges', []);

      const data = (component as any).convertToForceGraphData();

      expect(data.nodes[0].name).toBe('N9');
    });
  });

  describe('getNodeSizeValue', () => {
    it('should size N (node) ids largest, P (property) mid, L (literal) smallest', () => {
      const getSize = (node: any) => (component as any).getNodeSizeValue(node);
      expect(getSize({ id: 'N1' })).toBe(8);
      expect(getSize({ id: 'P1' })).toBe(6);
      expect(getSize({ id: 'L1' })).toBe(4);
      expect(getSize({ id: 'X1' })).toBe(6);
      expect(getSize(undefined)).toBe(4);
    });
  });

  describe('getNodeColor / getNodeSize', () => {
    it('should prefer a custom color over the default, and a stored val over the derived size', () => {
      const node = {
        id: 'N1',
        val: 12,
        __nodeData: { id: 'N1', data: { customColor: '#123456' } },
      };
      expect((component as any).getNodeColor(node)).toBe('#123456');
      expect((component as any).getNodeSize(node)).toBe(12);
    });

    it('should fall back to the plain color and derived size when there is no node data', () => {
      const node = { id: 'N1', color: '#abcdef' };
      expect((component as any).getNodeColor(node)).toBe('#abcdef');
      expect((component as any).getNodeSize(node)).toBe(4);
    });

    it('should fall back to the default teal when nothing else is set', () => {
      const node = { id: 'N1' };
      expect((component as any).getNodeColor(node)).toBe('#69b3a2');
    });
  });

  describe('getLinkColor / getLinkWidth / getLinkLabel', () => {
    it('should prefer the original edge data over the mapped force-graph link', () => {
      const link = {
        source: 'a',
        target: 'b',
        color: '#000',
        width: 1,
        label: 'mapped',
        __linkData: { source: 'a', target: 'b', label: 'original', data: { color: '#f00', width: 5 } },
      };
      expect((component as any).getLinkColor(link)).toBe('#f00');
      expect((component as any).getLinkWidth(link)).toBe(5);
      expect((component as any).getLinkLabel(link)).toBe('original');
    });

    it('should fall back to defaults when there is no edge data at all', () => {
      const link = { source: 'a', target: 'b' };
      expect((component as any).getLinkColor(link)).toBe('#999');
      expect((component as any).getLinkWidth(link)).toBe(1);
      expect((component as any).getLinkLabel(link)).toBe('');
    });
  });

  describe('getNode3DLabel', () => {
    it('should include the count and truncate long labels', () => {
      const node = {
        id: 'N1',
        __nodeData: { id: 'N1', label: 'A very long node label indeed', data: { count: 2 } },
      };
      const label = (component as any).getNode3DLabel(node);
      expect(label.length).toBeLessThanOrEqual(15);
      expect(label.endsWith('...')).toBe(true);
    });

    it('should fall back to the force-graph node name when there is no node data', () => {
      const node = { id: 'N1', name: 'fallback' };
      expect((component as any).getNode3DLabel(node)).toBe('fallback');
    });
  });

  describe('getLink3DLabel / truncateLabelFor3D', () => {
    it('should return an empty string when there is no label', () => {
      expect((component as any).getLink3DLabel({ source: 'a', target: 'b' })).toBe('');
    });

    it('should truncate a long prefixed label keeping the prefix', () => {
      const link = { source: 'a', target: 'b', label: 'crm:P98_brought_into_existence' };
      const label = (component as any).getLink3DLabel(link);
      expect(label.startsWith('crm:')).toBe(true);
      expect(label.endsWith('...')).toBe(true);
    });

    it('truncateLabelFor3D should return an empty string for an empty label', () => {
      expect((component as any).truncateLabelFor3D('')).toBe('');
    });

    it('truncateLabelFor3D should leave short labels untouched', () => {
      expect((component as any).truncateLabelFor3D('short')).toBe('short');
    });
  });

  describe('onNodeClick', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should do nothing for a force-graph node without __nodeData', () => {
      const selectSpy = vi.fn();
      component.nodeSelect.subscribe(selectSpy);
      (component as any).onNodeClick({ id: 'N1' });
      vi.advanceTimersByTime(400);
      expect(selectSpy).not.toHaveBeenCalled();
    });

    it('should emit nodeSelect after the double-click timeout on a single click', () => {
      const nodeData: GraphNode = { id: 'N1', label: 'Alpha' };
      const selectSpy = vi.fn();
      component.nodeSelect.subscribe(selectSpy);

      (component as any).onNodeClick({ id: 'N1', __nodeData: nodeData });
      expect(selectSpy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);

      expect(selectSpy).toHaveBeenCalledWith(nodeData);
    });

    it('should emit nodeDoubleClick instead when clicked again before the timeout', () => {
      const nodeData: GraphNode = { id: 'N1', label: 'Alpha' };
      const selectSpy = vi.fn();
      const dblSpy = vi.fn();
      component.nodeSelect.subscribe(selectSpy);
      component.nodeDoubleClick.subscribe(dblSpy);

      (component as any).onNodeClick({ id: 'N1', __nodeData: nodeData });
      (component as any).onNodeClick({ id: 'N1', __nodeData: nodeData });
      vi.advanceTimersByTime(300);

      expect(dblSpy).toHaveBeenCalledWith(nodeData);
      expect(selectSpy).not.toHaveBeenCalled();
    });
  });

  describe('onNodeHover', () => {
    it('should set the container cursor to pointer when hovering a node, only if the graph exists', () => {
      const style: any = { cursor: '' };
      (component as any).graphContainer = { nativeElement: { style } };

      // no graph yet: no-op
      (component as any).onNodeHover({ id: 'N1' });
      expect(style.cursor).toBe('');

      (component as any).graph = {};
      (component as any).onNodeHover({ id: 'N1' });
      expect(style.cursor).toBe('pointer');

      (component as any).onNodeHover(null);
      expect(style.cursor).toBe('default');
    });
  });

  describe('onBackgroundClick', () => {
    it('should emit nodeSelect with null to deselect', () => {
      const selectSpy = vi.fn();
      component.nodeSelect.subscribe(selectSpy);
      (component as any).onBackgroundClick();
      expect(selectSpy).toHaveBeenCalledWith(null);
    });
  });

  describe('centerView / zoomToFit / toggleMode', () => {
    it('should do nothing when there is no graph yet', () => {
      expect(() => component.centerView()).not.toThrow();
      expect(() => component.zoomToFit()).not.toThrow();
    });

    it('centerView should center a 2D graph via centerAt', () => {
      const centerAt = vi.fn();
      (component as any).graph = { centerAt };
      (component as any).currentMode = '2d';
      component.centerView();
      expect(centerAt).toHaveBeenCalledWith(0, 0, 1000);
    });

    it('centerView should position the camera for a 3D graph', () => {
      const cameraPosition = vi.fn();
      (component as any).graph = { cameraPosition };
      (component as any).currentMode = '3d';
      component.centerView();
      expect(cameraPosition).toHaveBeenCalled();
    });

    it('zoomToFit should delegate to the graph instance', () => {
      const zoomToFit = vi.fn();
      (component as any).graph = { zoomToFit };
      component.zoomToFit();
      expect(zoomToFit).toHaveBeenCalledWith(1000, 50);
    });

    it('toggleMode should emit modeChange with the opposite mode', () => {
      const changeSpy = vi.fn();
      component.modeChange.subscribe(changeSpy);
      (component as any).currentMode = '2d';
      // stub switchMode so it does not attempt to (re)create the real graph
      (component as any).switchMode = vi.fn((m: string) => {
        (component as any).currentMode = m;
      });

      component.toggleMode();

      expect(changeSpy).toHaveBeenCalledWith('3d');
    });
  });

  describe('setupSubscriptions', () => {
    it('should invoke updateGraphData/centerView/zoomToFit when the corresponding subjects emit', () => {
      const update$ = new Subject<boolean>();
      const center$ = new Subject<boolean>();
      const zoomToFit$ = new Subject<any>();
      fixture.componentRef.setInput('update$', update$);
      fixture.componentRef.setInput('center$', center$);
      fixture.componentRef.setInput('zoomToFit$', zoomToFit$);

      const updateGraphData = vi.fn();
      const centerView = vi.fn();
      const zoomToFit = vi.fn();
      (component as any).updateGraphData = updateGraphData;
      component.centerView = centerView;
      component.zoomToFit = zoomToFit;

      (component as any).setupSubscriptions();

      update$.next(true);
      center$.next(true);
      zoomToFit$.next({});

      expect(updateGraphData).toHaveBeenCalled();
      expect(centerView).toHaveBeenCalled();
      expect(zoomToFit).toHaveBeenCalled();
    });
  });
});
