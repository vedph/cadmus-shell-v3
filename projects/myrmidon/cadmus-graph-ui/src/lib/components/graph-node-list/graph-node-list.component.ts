import { Component, input, model, output } from '@angular/core';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { take } from 'rxjs/operators';

import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
} from '@angular/material/expansion';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { DataPage } from '@myrmidon/ngx-tools';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { GraphService, UriNode, NodeSourceType } from '@myrmidon/cadmus-api';

import { NodeListRepository } from '../../state/graph-node-list.repository';
import { GraphNodeFilterComponent } from '../graph-node-filter/graph-node-filter.component';
import { GraphNodeEditorComponent } from '../graph-node-editor/graph-node-editor.component';

/**
 * List of graph nodes. This includes a graph node filter, a list, and a graph
 * editor.
 */
@Component({
  selector: 'cadmus-graph-node-list',
  templateUrl: './graph-node-list.component.html',
  styleUrls: ['./graph-node-list.component.css'],
  imports: [
    MatCard,
    MatCardContent,
    GraphNodeFilterComponent,
    MatProgressBar,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatButton,
    MatPaginator,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    GraphNodeEditorComponent,
    AsyncPipe,
  ],
})
export class GraphNodeListComponent {
  public loading$: Observable<boolean | undefined>;
  public page$: Observable<DataPage<UriNode>>;

  /**
   * The currently edited node if any.
   */
  public readonly editedNode = model<UriNode>();

  /**
   * The optional set of thesaurus entries for node's tags.
   */
  public readonly tagEntries = input<ThesaurusEntry[]>();

  /**
   * True if this node list should have a walker button for each node.
   */
  public readonly hasWalker = input<boolean>();

  /**
   * Emitted when walking a specific node is requested.
   */
  public readonly nodeWalk = output<UriNode>();

  constructor(
    private _repository: NodeListRepository,
    private _graphService: GraphService,
    private _dialogService: DialogService,
    private _snackbar: MatSnackBar
  ) {
    this.loading$ = _repository.loading$;
    this.page$ = _repository.page$;
  }

  public onPageChange(event: PageEvent): void {
    this._repository.setPage(event.pageIndex + 1, event.pageSize);
  }

  public addNode(): void {
    this.editedNode.set({
      uri: '',
      id: 0,
      sourceType: NodeSourceType.User,
      label: '',
    });
  }

  public editNode(node: UriNode): void {
    this.editedNode.set(node);
  }

  public onNodeChange(node: UriNode): void {
    this._graphService.addNode(node).subscribe({
      next: (n) => {
        this.editedNode.set(undefined);
        this._repository.reset();
        this._snackbar.open('Node saved', 'OK', {
          duration: 1500,
        });
      },
      error: (error) => {
        console.error('Error saving node', error);
        this._snackbar.open('Error saving node', 'OK');
      },
    });
  }

  public onEditorClose(): void {
    this.editedNode.set(undefined);
  }

  public deleteNode(node: UriNode): void {
    this._dialogService
      .confirm('Delete Node', 'Delete node ' + node.label + '?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          this._graphService
            .deleteNode(node.id)
            .pipe(take(1))
            .subscribe({
              next: (_) => {
                this._repository.reset();
              },
              error: (error) => {
                console.error('Error deleting node', error);
                this._snackbar.open('Error deleting node', 'OK');
              },
            });
        }
      });
  }

  public walkNode(node: UriNode): void {
    this.nodeWalk.emit(node);
  }

  public reset(): void {
    this._repository.reset();
  }
}
