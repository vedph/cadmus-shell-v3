import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { MatProgressBar } from '@angular/material/progress-bar';
import { Node as GraphNode } from '@swimlane/ngx-graph';
import { EnvService, ErrorService } from '@myrmidon/ngx-tools';
import {
  GraphService,
  GRAPH_API_PATH,
} from '../../../projects/myrmidon/cadmus-api/src/public-api';
import { GraphWalkerComponent } from '../../../projects/myrmidon/cadmus-graph-ui-ex/src/public-api';

@Component({
  selector: 'app-graph-demo-page',
  imports: [GraphWalkerComponent, MatProgressBar],
  providers: [
    // override the default GRAPH_API_PATH only for this demo
    {
      provide: GRAPH_API_PATH,
      useValue: 'demo/graph',
    },
    {
      provide: GraphService,
      useFactory: (
        http: HttpClient,
        error: ErrorService,
        env: EnvService,
        apiPath: string
      ) => {
        return new GraphService(http, error, env, apiPath);
      },
      deps: [HttpClient, ErrorService, EnvService, GRAPH_API_PATH],
    },
  ],
  templateUrl: './graph-demo-page.component.html',
  styleUrl: './graph-demo-page.component.scss',
})
export class GraphDemoPageComponent implements OnInit {
  public nodeId: number = 0;

  constructor(private _service: GraphService) {
    console.log(
      'Demo page constructor - GraphService instance:',
      this._service
    );
  }

  public ngOnInit(): void {
    this._service
      .getNodeByUri('x:guys/francesco_petrarca')
      .pipe(take(1))
      .subscribe((node) => {
        this.nodeId = node.id;
      });
  }

  public onNodePick(node: GraphNode): void {
    console.log(JSON.stringify(node, null, 2));
  }
}
