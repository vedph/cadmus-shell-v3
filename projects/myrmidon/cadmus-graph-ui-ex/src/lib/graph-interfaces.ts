/**
 * Graph interfaces to replace ngx-graph types
 */

export interface GraphNode {
  id: string;
  label?: string;
  data?: any;
  position?: {
    x: number;
    y: number;
  };
  dimension?: {
    width: number;
    height: number;
  };
  meta?: any;
  color?: string;
  [key: string]: any;
}

export interface Edge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  data?: any;
  line?: string;
  meta?: any;
  color?: string;
  [key: string]: any;
}

export interface ZoomOptions {
  center?: boolean;
  scale?: number;
  animationDuration?: number;
  force?: boolean;
}

export interface Graph {
  nodes: GraphNode[];
  edges: Edge[];
}
