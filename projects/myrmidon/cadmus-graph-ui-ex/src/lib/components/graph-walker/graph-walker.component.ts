import {
  Component,
  effect,
  input,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, Subject, Subscription, take } from 'rxjs';

import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTabGroup, MatTab, MatTabLabel } from '@angular/material/tabs';

import {
  Edge,
  Node as GraphNode,
  NgxGraphZoomOptions,
  GraphModule,
} from '@swimlane/ngx-graph';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { GraphService } from '@myrmidon/cadmus-api';

import { TripleFilterComponent } from '../triple-filter/triple-filter.component';
import { LinkedNodeFilterComponent } from '../linked-node-filter/linked-node-filter.component';
import { LinkedLiteralFilterComponent } from '../linked-literal-filter/linked-literal-filter.component';
import { GraphNodeLabelPipe } from '../../pipes/graph-node-label.pipe';
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
  imports: [
    GraphModule,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatProgressBar,
    MatTabGroup,
    MatTab,
    MatTabLabel,
    TripleFilterComponent,
    LinkedNodeFilterComponent,
    LinkedLiteralFilterComponent,
    AsyncPipe,
    GraphNodeLabelPipe,
  ],
})
export class GraphWalkerComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private readonly _walker: GraphWalker;

  /**
   * The root origin node ID.
   */
  public readonly nodeId = input<number>(0);

  /**
   * True if user can pick a node from the graph.
   */
  public readonly canPick = input<boolean>();

  /**
   * True if user can move to the source of a picked node when
   * shift-clicking it.
   */
  public readonly canMoveToSource = input<boolean>();

  /**
   * Emitted when a graph node is picked by user.
   */
  public readonly nodePick = output<GraphNode>();

  /**
   * Emitted when the user requests to move to the source of a picked node.
   */
  public readonly moveToSource = output<GraphNode>();

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

    effect(() => {
      const id = this.nodeId();
      if (id) {
        this.reset(id);
      }
    });
  }

  public ngOnInit(): void {
    this._sub = this.update$.subscribe((_) => {
      this.onReset();
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onNodeSelect(node: GraphNode): void {
    this._walker.selectNode(node.id);
  }

  private reset(id: number): void {
    this._walker.reset(id);
  }

  public onReset(): void {
    if (!this.nodeId()) {
      return;
    }
    this._dialog
      .confirm('Reset', 'Reset the whole graph?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          this.reset(this.nodeId());
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
    if (this.canMoveToSource() && event.shiftKey) {
      if (node.data.sid) {
        this.moveToSource.emit(node);
      }
    } else {
      this.nodePick.emit(node);
    }
  }
}
