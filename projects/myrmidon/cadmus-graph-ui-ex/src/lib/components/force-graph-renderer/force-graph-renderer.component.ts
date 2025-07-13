import {
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GraphNode, Edge } from '../../graph-interfaces';

import * as ForceGraph from 'force-graph';
import * as ForceGraph3D from '3d-force-graph';

// force graph types
interface ForceGraphNode {
  id: string | number;
  name?: string;
  val?: number;
  color?: string;
  group?: string;
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
  __nodeData?: GraphNode;
}

interface ForceGraphLink {
  source: string | number;
  target: string | number;
  color?: string;
  width?: number;
  label?: string;
  __linkData?: Edge;
}

interface ForceGraphData {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
}

export type GraphMode = '2d' | '3d';

/**
 * Force graph renderer component that can display graphs in 2D or 3D
 * using force-graph and 3d-force-graph libraries.
 */
@Component({
  selector: 'cadmus-force-graph-renderer',
  templateUrl: './force-graph-renderer.component.html',
  styleUrls: ['./force-graph-renderer.component.css'],
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
})
export class ForceGraphRendererComponent
  implements OnInit, OnDestroy, OnChanges, AfterViewInit
{
  @ViewChild('graphContainer', { static: true })
  graphContainer!: ElementRef<HTMLDivElement>;

  @Input() nodes: GraphNode[] = [];
  @Input() edges: Edge[] = [];
  @Input() mode: GraphMode = '2d';
  @Input() update$?: Subject<boolean>;
  @Input() center$?: Subject<boolean>;
  @Input() zoomToFit$?: Subject<any>;

  @Output() nodeSelect = new EventEmitter<GraphNode>();
  @Output() nodeDoubleClick = new EventEmitter<GraphNode>();
  @Output() modeChange = new EventEmitter<GraphMode>();

  private graph: any = null;
  private currentMode: GraphMode = '2d';
  private clickTimeout: any = null;
  private resizeObserver?: ResizeObserver;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.currentMode = this.mode;
  }

  ngAfterViewInit(): void {
    this.initGraph();
    this.setupSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] && !changes['mode'].firstChange) {
      this.switchMode(this.mode);
    }

    if ((changes['nodes'] || changes['edges']) && this.graph) {
      this.updateGraphData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.graph) {
      // Properly destroy the graph instance
      if (typeof this.graph._destructor === 'function') {
        this.graph._destructor();
      }
      this.graph = null;
    }
  }

  private initGraph(): void {
    this.createGraph();
    this.updateGraphData();
  }

  private createGraph(): void {
    if (this.graph) {
      if (typeof this.graph._destructor === 'function') {
        this.graph._destructor();
      }
    }

    const container = this.graphContainer.nativeElement;
    container.innerHTML = ''; // Clear container

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    if (this.currentMode === '2d') {
      this.graph = (ForceGraph as any)
        .default()(container)
        .width(width)
        .height(height)
        .backgroundColor('rgba(0,0,0,0)')
        .nodeLabel('name')
        .nodeColor(this.getNodeColor.bind(this))
        .nodeVal(this.getNodeSize.bind(this))
        .linkColor(this.getLinkColor.bind(this))
        .linkWidth(this.getLinkWidth.bind(this))
        .linkDirectionalArrowLength(6)
        .linkDirectionalArrowRelPos(0.8)
        .onNodeClick(this.onNodeClick.bind(this))
        .onNodeHover(this.onNodeHover.bind(this))
        .onBackgroundClick(this.onBackgroundClick.bind(this))
        .nodeCanvasObject(this.drawNode.bind(this))
        .nodeCanvasObjectMode(() => 'replace');
    } else {
      this.graph = (ForceGraph3D as any)
        .default()(container)
        .width(width)
        .height(height)
        .backgroundColor('rgba(0,0,0,0)')
        .nodeLabel('name')
        .nodeColor(this.getNodeColor.bind(this))
        .nodeVal(this.getNodeSize.bind(this))
        .linkColor(this.getLinkColor.bind(this))
        .linkWidth(this.getLinkWidth.bind(this))
        .linkDirectionalArrowLength(6)
        .linkDirectionalArrowRelPos(0.8)
        .onNodeClick(this.onNodeClick.bind(this))
        .onNodeHover(this.onNodeHover.bind(this))
        .onBackgroundClick(this.onBackgroundClick.bind(this));
    }

    // Handle window resize
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.graph && container.clientWidth && container.clientHeight) {
        this.graph.width(container.clientWidth).height(container.clientHeight);
      }
    });
    this.resizeObserver.observe(container);
  }

  private convertToForceGraphData(): ForceGraphData {
    const forceNodes: ForceGraphNode[] = this.nodes.map((node) => ({
      id: node.id, // Keep as string/number as received
      name: node.label || node.id,
      val: this.getNodeSizeValue(node),
      color: node.data?.customColor || node.data?.color || '#69b3a2',
      group: node.data?.originId || '1',
      __nodeData: node,
    }));

    const forceLinks: ForceGraphLink[] = this.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      color: edge.data?.color || '#999',
      width: edge.data?.width || 1,
      label: edge.label || '',
      __linkData: edge,
    }));

    return { nodes: forceNodes, links: forceLinks };
  }

  private updateGraphData(): void {
    if (!this.graph) return;

    const graphData = this.convertToForceGraphData();
    console.log('Updating graph data:', graphData); // Debug log
    this.graph.graphData(graphData);
  }

  private getNodeColor(node: ForceGraphNode): string {
    return (
      node.__nodeData?.data?.customColor ||
      node.__nodeData?.data?.color ||
      node.color ||
      '#69b3a2'
    );
  }

  private getNodeSize(node: ForceGraphNode): number {
    if (node.__nodeData) {
      return node.val || this.getNodeSizeValue(node.__nodeData);
    }
    return node.val || 4;
  }

  private getNodeSizeValue(node: GraphNode | undefined): number {
    if (!node) return 4;

    // Different sizes based on node type
    const id = String(node.id); // Convert to string for startsWith check
    if (id.startsWith('N')) return 8; // Node
    if (id.startsWith('P')) return 6; // Property
    if (id.startsWith('L')) return 4; // Literal
    return 6;
  }

  private getLinkColor(link: ForceGraphLink): string {
    return link.__linkData?.data?.color || link.color || '#999';
  }

  private getLinkWidth(link: ForceGraphLink): number {
    return link.__linkData?.data?.width || link.width || 1;
  }

  private drawNode(
    node: ForceGraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ): void {
    if (!node.__nodeData || !node.x || !node.y) return;

    const nodeData = node.__nodeData;
    const label = nodeData.label || String(nodeData.id);
    const isSelected = nodeData.data?.selected;

    // Node size and color
    const size = this.getNodeSize(node) / Math.max(globalScale, 0.5);
    const color = this.getNodeColor(node);

    // Draw node shape based on type
    ctx.save();

    const nodeId = String(nodeData.id);

    if (nodeId.startsWith('L')) {
      // Literal nodes - diamond shape
      ctx.fillStyle = color;
      ctx.strokeStyle = isSelected ? '#e7d211' : '#666';
      ctx.lineWidth = isSelected ? 2 / globalScale : 1 / globalScale;

      ctx.beginPath();
      ctx.moveTo(node.x, node.y - size);
      ctx.lineTo(node.x + size, node.y);
      ctx.lineTo(node.x, node.y + size);
      ctx.lineTo(node.x - size, node.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (nodeId.startsWith('P')) {
      // Property nodes - hexagon shape
      ctx.fillStyle = color;
      ctx.strokeStyle = isSelected ? '#e7d211' : '#666';
      ctx.lineWidth = isSelected ? 2 / globalScale : 1 / globalScale;

      const sides = 6;
      const a = (Math.PI * 2) / sides;

      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const x = node.x + Math.cos(a * i) * size;
        const y = node.y + Math.sin(a * i) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Regular nodes - circle
      ctx.fillStyle = color;
      ctx.strokeStyle = isSelected ? '#e7d211' : '#666';
      ctx.lineWidth = isSelected ? 2 / globalScale : 1 / globalScale;

      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Draw label
    if (globalScale > 0.3) {
      const fontSize = Math.max(8, 10 / globalScale);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate long labels
      let displayLabel = label;
      if (displayLabel.length > 15) {
        displayLabel = displayLabel.substring(0, 12) + '...';
      }

      ctx.fillText(displayLabel, node.x, node.y + size + fontSize);
    }

    ctx.restore();
  }

  private onNodeClick(node: ForceGraphNode, event?: MouseEvent): void {
    if (!node.__nodeData) return;

    // Handle double-click detection with timeout
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
      // Double click detected
      this.nodeDoubleClick.emit(node.__nodeData);
    } else {
      // Set timeout for single click
      this.clickTimeout = setTimeout(() => {
        this.clickTimeout = null;
        this.nodeSelect.emit(node.__nodeData);
      }, 300);
    }
  }

  private onNodeHover(node: ForceGraphNode | null): void {
    if (this.graph) {
      // Change cursor on hover for both 2D and 3D
      const container = this.graphContainer.nativeElement;
      container.style.cursor = node ? 'pointer' : 'default';
    }
  }

  private onBackgroundClick(): void {
    // Deselect node on background click
    this.nodeSelect.emit(null as any);
  }

  private setupSubscriptions(): void {
    if (this.update$) {
      this.update$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.updateGraphData();
      });
    }

    if (this.center$) {
      this.center$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.centerView();
      });
    }

    if (this.zoomToFit$) {
      this.zoomToFit$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.zoomToFit();
      });
    }
  }

  toggleMode(): void {
    const newMode: GraphMode = this.currentMode === '2d' ? '3d' : '2d';
    this.switchMode(newMode);
    this.modeChange.emit(newMode);
  }

  private switchMode(newMode: GraphMode): void {
    if (newMode === this.currentMode) return;

    this.currentMode = newMode;
    this.createGraph();
    this.updateGraphData();
  }

  centerView(): void {
    if (this.graph) {
      if (this.currentMode === '2d') {
        this.graph.centerAt(0, 0, 1000);
      } else {
        this.graph.cameraPosition(
          { x: 0, y: 0, z: 400 },
          { x: 0, y: 0, z: 0 },
          1000
        );
      }
    }
  }

  zoomToFit(): void {
    if (this.graph) {
      this.graph.zoomToFit(1000, 50);
    }
  }
}
