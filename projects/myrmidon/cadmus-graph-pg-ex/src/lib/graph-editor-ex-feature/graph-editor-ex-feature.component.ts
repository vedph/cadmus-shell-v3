import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';

import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  LibraryRouteService,
  ThesauriSet,
  ThesaurusEntry,
} from '@myrmidon/cadmus-core';
import { UriNode, ThesaurusService, ItemService } from '@myrmidon/cadmus-api';
import {
  GraphWalkerComponent,
  WalkerNodeData,
  GraphNode,
} from '@myrmidon/cadmus-graph-ui-ex';
import {
  GraphNodeListComponent,
  GraphTripleListComponent,
} from '@myrmidon/cadmus-graph-ui';

const TAB_NODES = 0;
const TAB_WALKER = 2;

@Component({
  selector: 'cadmus-graph-editor-ex-feature',
  templateUrl: './graph-editor-ex-feature.component.html',
  styleUrls: ['./graph-editor-ex-feature.component.css'],
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatTabGroup,
    MatTab,
    GraphNodeListComponent,
    GraphTripleListComponent,
    GraphWalkerComponent,
  ],
})
export class GraphEditorExFeatureComponent implements OnInit {
  public nodeTagEntries?: ThesaurusEntry[];
  public tripleTagEntries?: ThesaurusEntry[];

  public tabIndex: number;
  public editedNode?: UriNode;
  public walkerNodeId: number;

  constructor(
    private _thesService: ThesaurusService,
    private _router: Router,
    private _itemService: ItemService,
    private _libraryRouteService: LibraryRouteService,
    private _snackbar: MatSnackBar
  ) {
    this.tabIndex = 0;
    this.walkerNodeId = 0;
  }

  public ngOnInit(): void {
    this._thesService
      .getThesauriSet(['graph-node-tags', 'graph-triple-tags'])
      .pipe(take(1))
      .subscribe({
        next: (set: ThesauriSet) => {
          this.nodeTagEntries = set['graph-node-tags']?.entries;
          this.tripleTagEntries = set['graph-triple-tags']?.entries;
        },
        error: (error) => {
          console.error('Error getting thesauri set', error);
        },
      });
  }

  public onNodeWalk(node: UriNode): void {
    this.walkerNodeId = node.id;
    this.tabIndex = TAB_WALKER;
  }

  private getNodeNumericId(id: string): number {
    const i = id.indexOf('N');
    return i === -1 ? 0 : +id.substring(i + 1);
  }

  public onWalkerNodePick(node: GraphNode) {
    const data = node.data as WalkerNodeData;
    if (!data) {
      return;
    }
    this.tabIndex = TAB_NODES;
    this.editedNode = {
      id: this.getNodeNumericId(node.id),
      isClass: data.isClass,
      label: node.label || node.id,
      sourceType: data.sourceType,
      tag: data.tag,
      sid: data.sid,
      uri: data.uri,
    };
  }

  public onWalkerMoveToSource(node: GraphNode) {
    const data = node.data as WalkerNodeData;
    if (!data) {
      return;
    }
    switch (data.sourceType) {
      case 1: // item
        this._router.navigate(['/items', data.sid!.substring(0, 36)]);
        break;
      case 2: // part
        // get the part and navigate to it
        this._itemService.getPart(data.sid!.substring(0, 36)).subscribe({
          next: (part) => {
            if (part) {
              // build the target route to the appropriate part editor
              const route = this._libraryRouteService.buildPartEditorRoute(
                part.itemId,
                part.id,
                part.typeId,
                part.roleId
              );

              // navigate to the editor
              this._router.navigate(
                [route.route],
                route.rid
                  ? {
                      queryParams: {
                        rid: route.rid,
                      },
                    }
                  : {}
              );
            }
          },
          error: (error) => {
            console.error('Error loading part', error);
            this._snackbar.open('Error loading part', 'OK');
          },
        });
        break;
    }
  }
}
