import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Observable, Subject, take } from 'rxjs';

import {
  Edge,
  Node as GraphNode,
  NgxGraphZoomOptions,
} from '@swimlane/ngx-graph';
import { DialogService } from '@myrmidon/ng-mat-tools';

import { GraphService } from '@myrmidon/cadmus-api';

import {
  GraphWalker,
  NodeChildTotals,
  PagedLinkedLiteralFilter,
  PagedLinkedNodeFilter,
  PagedTripleFilter,
} from '../../graph-walker';

/**
 * Graph walker component. This starts from a given node, and let users
 * walk along edges to discover new nodes.
 */
@Component({
  selector: 'cadmus-graph-walker',
  templateUrl: './graph-walker.component.html',
  styleUrls: ['./graph-walker.component.css'],
  standalone: false,
})
export class GraphWalkerComponent implements OnInit {
  private readonly _walker: GraphWalker;
  private _nodeId: number;

  /**
   * The root origin node ID.
   */
  @Input()
  public get nodeId(): number {
    return this._nodeId;
  }
  public set nodeId(value: number) {
    if (this._nodeId === value) {
      return;
    }
    this._nodeId = value;
    this.reset(value);
  }

  /**
   * True if user can pick a node from the graph.
   */
  @Input()
  public canPick?: boolean;

  /**
   * True if user can move to the source of a picked node when
   * shift-clicking it.
   */
  @Input()
  public canMoveToSource?: boolean;

  /**
   * Emitted when a graph node is picked by user.
   */
  @Output()
  public nodePick: EventEmitter<GraphNode>;

  /**
   * Emitted when the user requests to move to the source of a picked node.
   */
  @Output()
  public moveToSource: EventEmitter<GraphNode>;

  // graph
  public nodes$: Observable<GraphNode[]>;
  public edges$: Observable<Edge[]>;
  public loading$: Observable<boolean>;
  public error$: Observable<string | null>;
  // selected node
  public selectedNode$: Observable<GraphNode | null>;
  public pOutFilter$: Observable<PagedLinkedNodeFilter | null>;
  public pInFilter$: Observable<PagedLinkedNodeFilter | null>;
  public pLitFilter$: Observable<PagedLinkedLiteralFilter | null>;
  public nOutFilter$: Observable<PagedTripleFilter | null>;
  public nInFilter$: Observable<PagedTripleFilter | null>;
  public childTotals$: Observable<NodeChildTotals>;

  // ngx-graph actions
  public update$: Subject<boolean> = new Subject();
  public center$: Subject<boolean> = new Subject();
  public zoomToFit$: Subject<NgxGraphZoomOptions> = new Subject();

  constructor(graphService: GraphService, private _dialog: DialogService) {
    this._walker = new GraphWalker(graphService);
    this._nodeId = 0;
    this.nodePick = new EventEmitter<GraphNode>();
    this.moveToSource = new EventEmitter<GraphNode>();

    this.nodes$ = this._walker.nodes$;
    this.edges$ = this._walker.edges$;
    this.loading$ = this._walker.loading$;
    this.error$ = this._walker.error$;

    this.selectedNode$ = this._walker.selectedNode$;
    this.pOutFilter$ = this._walker.pOutFilter$;
    this.pInFilter$ = this._walker.pInFilter$;
    this.pLitFilter$ = this._walker.pLitFilter$;
    this.nOutFilter$ = this._walker.nOutFilter$;
    this.nInFilter$ = this._walker.nInFilter$;
    this.childTotals$ = this._walker.childTotals$;
  }

  ngOnInit(): void {
    this.update$.subscribe((_) => {
      this.onReset();
    });
  }

  public onNodeSelect(node: GraphNode): void {
    this._walker.selectNode(node.id);
  }

  private reset(id: number): void {
    this._walker.reset(id);
  }

  public onReset(): void {
    if (!this._nodeId) {
      return;
    }
    this._dialog
      .confirm('Reset', 'Reset the whole graph?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          this.reset(this._nodeId);
        }
      });
  }

  public onNodeDblClick(node: GraphNode): void {
    this._walker.toggleNode(node);
  }

  public onPOutFilterChange(filter: PagedLinkedNodeFilter): void {
    this._walker.expandSelectedProperty(filter);
  }

  public onPInFilterChange(filter: PagedLinkedNodeFilter): void {
    this._walker.expandSelectedProperty(null, filter);
  }

  public onPLitFilterChange(filter: PagedLinkedLiteralFilter): void {
    this._walker.expandSelectedProperty(null, null, filter);
  }

  public onNOutFilterChange(filter: PagedTripleFilter): void {
    this._walker.expandSelectedNode(filter);
  }

  public onNInFilterChange(filter: PagedTripleFilter): void {
    this._walker.expandSelectedNode(null, filter);
  }

  public pickSelectedNode(event: MouseEvent): void {
    const node = this._walker.getSelectedNode();
    if (!node) {
      return;
    }
    if (this.canMoveToSource && event.shiftKey) {
      if (node.data.sid) {
        this.moveToSource.emit(node);
      }
    } else {
      this.nodePick.emit(node);
    }
  }
}
