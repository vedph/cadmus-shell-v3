import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, tap } from 'rxjs';

import { NodeFilter, UriNode } from '@myrmidon/cadmus-api';
import {
  PagedListStore,
  PagedListStoreService,
} from '@myrmidon/paged-data-browsers';
import { DataPage } from '@myrmidon/ng-tools';
import { GraphService } from '@myrmidon/cadmus-api';

/**
 * Graph nodes list repository.
 */
@Injectable({ providedIn: 'root' })
export class NodeListRepository
  implements PagedListStoreService<NodeFilter, UriNode>
{
  private readonly _store: PagedListStore<NodeFilter, UriNode>;
  private readonly _loading$: BehaviorSubject<boolean | undefined>;
  private readonly _filter$: BehaviorSubject<NodeFilter>;
  private readonly _linkedNode$: BehaviorSubject<UriNode | undefined>;
  private readonly _classNodes$: BehaviorSubject<UriNode[]>;

  public get loading$(): Observable<boolean | undefined> {
    return this._loading$.asObservable();
  }
  public get filter$(): Observable<NodeFilter> {
    return this._filter$.asObservable();
  }
  public get page$(): Observable<DataPage<UriNode>> {
    return this._store.page$;
  }
  public get linkedNode$(): Observable<UriNode | undefined> {
    return this._linkedNode$.asObservable();
  }
  public get classNodes$(): Observable<UriNode[] | undefined> {
    return this._classNodes$.asObservable();
  }

  constructor(private _graphService: GraphService) {
    this._store = new PagedListStore<NodeFilter, UriNode>(this);
    this._loading$ = new BehaviorSubject<boolean | undefined>(undefined);
    this._filter$ = new BehaviorSubject<NodeFilter>({});
    this._linkedNode$ = new BehaviorSubject<UriNode | undefined>(undefined);
    this._classNodes$ = new BehaviorSubject<UriNode[]>([]);
    this._store.reset();
  }

  public getLinkedNode(): UriNode | undefined {
    return this._linkedNode$.value;
  }

  public getClassNodes(): UriNode[] {
    return this._classNodes$.value;
  }

  public loadPage(
    pageNumber: number,
    pageSize: number,
    filter: NodeFilter
  ): Observable<DataPage<UriNode>> {
    this._loading$.next(true);
    return this._graphService.getNodes(pageNumber, pageSize, filter).pipe(
      tap({
        next: () => this._loading$.next(false),
        error: () => this._loading$.next(false),
      })
    );
  }

  public async reset(): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.reset();
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public async setFilter(filter: NodeFilter): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.setFilter(filter);
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public getFilter(): NodeFilter {
    return this._store.getFilter();
  }

  public async setPage(pageNumber: number, pageSize: number): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.setPage(pageNumber, pageSize);
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  /**
   * Set the linked node used in filter.
   *
   * @param node The node or undefined.
   */
  public setLinkedNode(node?: UriNode): void {
    this._linkedNode$.next(node);
  }

  /**
   * Set the linked node used in filter by its ID.
   *
   * @param id The node ID.
   */
  public setLinkedNodeId(id?: number): void {
    if (!id) {
      this._linkedNode$.next(undefined);
    } else {
      this._graphService.getNode(id).subscribe({
        next: (node) => {
          this._linkedNode$.next(node);
        },
        error: (error) => {
          if (error) {
            console.error(JSON.stringify(error));
          }
          console.warn('Node ID not found: ' + id);
        },
      });
    }
  }

  /**
   * Add the specified node to the filter class nodes.
   * If the node already exists, nothing is done.
   *
   * @param node The node to add.
   */
  public addClassNode(node: UriNode): void {
    const nodes = [...this._classNodes$.value];
    if (nodes.some((n) => n.id === node.id)) {
      return;
    }
    nodes.push(node);
    this._classNodes$.next(nodes);
  }

  /**
   * Set the class node IDs in the filter.
   *
   * @param ids The class nodes IDs or undefined.
   */
  public setClassNodeIds(ids?: number[]): void {
    if (!ids || !ids.length) {
      this._classNodes$.next([]);
      return;
    }

    const requests: Observable<UriNode>[] = [];
    ids.forEach((id) => {
      requests.push(this._graphService.getNode(id));
    });
    forkJoin(requests).subscribe({
      next: (nodes: UriNode[]) => {
        this._classNodes$.next(nodes);
      },
      error: (error) => {
        if (error) {
          console.error(JSON.stringify(error));
        }
      },
    });
  }

  /**
   * Delete the specified node from the filter class nodes.
   * If the node does not exist, nothing is done.
   *
   * @param id The node's ID.
   */
  public deleteClassNode(id: number): void {
    const nodes = [...this._classNodes$.value];
    const i = nodes.findIndex((n) => n.id === id);
    if (i > -1) {
      nodes.splice(i, 1);
      this._classNodes$.next(nodes);
    }
  }
}
