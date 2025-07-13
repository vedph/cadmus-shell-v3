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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GraphNode, Edge } from '../../graph-interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import the libraries directly
import * as ForceGraph from 'force-graph';
import * as ForceGraph3D from '3d-force-graph';
import * as d3 from 'd3-force';
import * as THREE from 'three';

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
  template: `
    <div class="renderer-container">
      <div class="controls">
        <button
          type="button"
          mat-icon-button
          matTooltip="Switch to {{ mode === '2d' ? '3D' : '2D' }} view"
          (click)="toggleMode()"
        >
          <mat-icon>{{ mode === '2d' ? 'view_in_ar' : 'view_quilt' }}</mat-icon>
        </button>
        <button
          type="button"
          mat-icon-button
          matTooltip="Center view"
          (click)="centerView()"
        >
          <mat-icon>filter_center_focus</mat-icon>
        </button>
        <button
          type="button"
          mat-icon-button
          matTooltip="Zoom to fit"
          (click)="zoomToFit()"
        >
          <mat-icon>fit_screen</mat-icon>
        </button>
      </div>
      <div #graphContainer class="graph-container"></div>
    </div>
  `,
  styles: [
    `
      .renderer-container {
        width: 100%;
        height: 100%;
        min-height: 600px;
        position: relative;
        display: flex;
        flex-direction: column;
      }

      .controls {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
        display: flex;
        gap: 4px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 4px;
        padding: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .graph-container {
        width: 100%;
        height: 100%;
        min-height: 600px;
        flex: 1;
        position: relative;
      }
    `,
  ],
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
        .linkLabel(this.getLinkLabel.bind(this))
        .linkDirectionalArrowLength(6)
        .linkDirectionalArrowRelPos(0.8)
        .onNodeClick(this.onNodeClick.bind(this))
        .onNodeHover(this.onNodeHover.bind(this))
        .onBackgroundClick(this.onBackgroundClick.bind(this))
        .nodeCanvasObject(this.drawNode.bind(this))
        .nodeCanvasObjectMode(() => 'replace')
        .linkCanvasObject(this.drawLink.bind(this))
        .linkCanvasObjectMode(() => 'after')
        // Configure d3 forces properly
        .d3Force('link', d3.forceLink().distance(120).strength(0.5))
        .d3Force('charge', d3.forceManyBody().strength(-300))
        .d3Force('collision', d3.forceCollide().radius(50));
    } else {
      this.graph = (ForceGraph3D as any)
        .default()(container)
        .width(width)
        .height(height)
        .backgroundColor('rgba(240,240,240,0.1)')
        .showNavInfo(false)
        // Node configuration
        .nodeLabel(this.getNode3DLabel.bind(this))
        .nodeAutoColorBy('group')
        .nodeColor(this.getNodeColor.bind(this))
        .nodeVal(this.getNodeSize.bind(this))
        .nodeResolution(8) // Lower resolution for better performance
        // Link configuration
        .linkLabel(this.getLink3DLabel.bind(this))
        .linkColor(this.getLinkColor.bind(this))
        .linkWidth(this.getLinkWidth.bind(this))
        .linkDirectionalArrowLength(4)
        .linkDirectionalArrowRelPos(0.8)
        .linkOpacity(0.6)
        // Enable labels rendering
        .nodeThreeObjectExtend(true)
        .linkThreeObjectExtend(true)
        // Event handlers
        .onNodeClick(this.onNodeClick.bind(this))
        .onNodeHover(this.onNodeHover.bind(this))
        .onBackgroundClick(this.onBackgroundClick.bind(this))
        // Configure d3 forces for 3D
        .d3Force('link', d3.forceLink().distance(120).strength(0.5))
        .d3Force('charge', d3.forceManyBody().strength(-300));
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
    const forceNodes: ForceGraphNode[] = this.nodes.map((node) => {
      const label = node.label || String(node.id);
      const count = node.data?.count;
      const displayName = count ? `${label} (${count})` : label;

      return {
        id: node.id,
        name: displayName, // This will be used by nodeLabel
        val: this.getNodeSizeValue(node),
        color: node.data?.customColor || node.data?.color || '#69b3a2',
        group: node.data?.originId || String(node.id).charAt(0) || '1', // Group by first character for auto-coloring
        __nodeData: node,
      };
    });

    const forceLinks: ForceGraphLink[] = this.edges.map((edge) => {
      const label = edge.label || edge.data?.label || '';

      return {
        source: edge.source,
        target: edge.target,
        color: edge.data?.color || '#999',
        width: edge.data?.width || 1,
        label: this.truncateLabelFor3D(label), // Pre-truncate for 3D
        __linkData: edge,
      };
    });

    console.log('Force graph data for 3D:', {
      nodes: forceNodes,
      links: forceLinks,
    });
    return { nodes: forceNodes, links: forceLinks };
  }

  private getNode3DLabel(node: ForceGraphNode): string {
    const nodeData = node.__nodeData;
    if (!nodeData) return node.name || String(node.id);

    const label = nodeData.label || String(nodeData.id);
    // Add node count if available
    const count = nodeData.data?.count;
    const displayLabel = count ? `${label} (${count})` : label;

    // Truncate for 3D display
    return displayLabel.length > 15
      ? displayLabel.substring(0, 12) + '...'
      : displayLabel;
  }

  private getLink3DLabel(link: ForceGraphLink): string {
    const label = this.getLinkLabel(link);
    if (!label) return '';

    // More aggressive truncation for 3D to avoid performance issues
    if (label.length > 15) {
      if (label.includes(':')) {
        const parts = label.split(':');
        if (parts.length > 1) {
          return parts[0] + ':' + parts[1].substring(0, 10) + '...';
        }
      }
      return label.substring(0, 12) + '...';
    }
    return label;
  }

  private truncateLabelFor3D(label: string): string {
    if (!label) return '';

    // More aggressive truncation for 3D to ensure performance
    if (label.length > 20) {
      if (label.includes(':')) {
        const parts = label.split(':');
        if (parts.length > 1) {
          const prefix = parts[0];
          const suffix = parts[1];
          if (suffix.length > 12) {
            return `${prefix}:${suffix.substring(0, 9)}...`;
          }
          return `${prefix}:${suffix}`;
        }
      }
      return label.substring(0, 17) + '...';
    }
    return label;
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

  private getLinkLabel(link: ForceGraphLink): string {
    return link.__linkData?.label || link.label || '';
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

  private drawLink(
    link: ForceGraphLink,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ): void {
    if (!link.source || !link.target) return;

    const source = link.source as any;
    const target = link.target as any;

    if (!source.x || !source.y || !target.x || !target.y) return;

    const label = this.getLinkLabel(link);
    if (!label || globalScale < 0.3) return; // Show labels at lower zoom levels

    // Calculate link vector and angle
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const linkLength = Math.sqrt(dx * dx + dy * dy);

    if (linkLength === 0) return;

    const angle = Math.atan2(dy, dx);

    // Position label at 40% of the way from source to target
    const labelX = source.x + dx * 0.4;
    const labelY = source.y + dy * 0.4;

    // Calculate offset perpendicular to the link to avoid overlap
    const offsetDistance = 20 / globalScale;
    const offsetX = -Math.sin(angle) * offsetDistance;
    const offsetY = Math.cos(angle) * offsetDistance;

    const finalX = labelX + offsetX;
    const finalY = labelY + offsetY;

    ctx.save();

    // Smaller font size
    const fontSize = Math.max(6, 7 / globalScale);
    ctx.font = `${fontSize}px Arial`;

    // Rotate text to be parallel to the link
    ctx.translate(finalX, finalY);

    // Keep text readable by avoiding upside-down text
    let textAngle = angle;
    if (Math.abs(angle) > Math.PI / 2) {
      textAngle = angle + Math.PI;
    }

    ctx.rotate(textAngle);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // More generous truncation based on link length
    let displayLabel = label;
    const maxChars = Math.min(Math.max(15, Math.floor(linkLength / 8)), 25); // Dynamic based on link length, min 15, max 25

    if (displayLabel.length > maxChars) {
      // Try to be smart about truncation - keep the meaningful part
      if (displayLabel.includes(':')) {
        // For URIs like "crm:P98_brought_into_existence", try to keep the part after the colon
        const parts = displayLabel.split(':');
        if (parts.length > 1 && parts[1].length <= maxChars - 3) {
          displayLabel = parts[0] + ':' + parts[1];
        } else if (parts[1].length > maxChars - 3) {
          displayLabel =
            parts[0] + ':' + parts[1].substring(0, maxChars - 6) + '...';
        }
      } else {
        // Regular truncation
        displayLabel = displayLabel.substring(0, maxChars - 3) + '...';
      }
    }

    // Measure text for background
    const textMetrics = ctx.measureText(displayLabel);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    // Draw background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(
      -textWidth / 2 - 1,
      -textHeight / 2 - 0.5,
      textWidth + 2,
      textHeight + 1
    );

    // Draw border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 0.3 / globalScale;
    ctx.strokeRect(
      -textWidth / 2 - 1,
      -textHeight / 2 - 0.5,
      textWidth + 2,
      textHeight + 1
    );

    // Draw text
    ctx.fillStyle = '#333';
    ctx.fillText(displayLabel, 0, 0);

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
