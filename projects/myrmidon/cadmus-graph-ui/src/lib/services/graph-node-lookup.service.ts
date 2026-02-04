import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';
import { GraphService, UriNode } from '@myrmidon/cadmus-api';

export interface GraphNodeLookupFilter extends RefLookupFilter {
  isClass?: boolean | null;
  tag?: string;
}

/**
 * Graph node lookup service.
 */
@Injectable({
  providedIn: 'root',
})
export class GraphNodeLookupService implements RefLookupService {
  public readonly id = 'graph-node';

  constructor(private _graphService: GraphService) {}

  lookup(filter: GraphNodeLookupFilter, options?: any): Observable<any[]> {
    if (!filter.text) {
      return of([]);
    }
    return this._graphService
      .getNodes(1, filter.limit || 10, {
        label: filter.text,
        isClass:
          filter.isClass === undefined || filter.isClass === null
            ? undefined
            : filter.isClass
            ? true
            : false,
        tag: filter.tag,
      })
      .pipe(map((p) => p.items));
  }

  getName(item: any): string {
    return (item as UriNode)?.label;
  }
}
