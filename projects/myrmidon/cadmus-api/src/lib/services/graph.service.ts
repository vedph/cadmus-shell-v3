import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import { DataPage, EnvService, ErrorService } from '@myrmidon/ng-tools';

//#region Models
export enum NodeSourceType {
  User = 0,
  Item,
  Part,
  Thesaurus,
  Implicit,
}

export interface Node {
  id: number;
  isClass?: boolean;
  label: string;
  sourceType: NodeSourceType;
  tag?: string;
  sid?: string;
}

export interface UriNode extends Node {
  uri: string;
}

interface NodeFilterBase {
  uid?: string;
  isClass?: boolean;
  tag?: string;
  label?: string;
  sourceType?: NodeSourceType;
  sid?: string;
  isSidPrefix?: boolean;
  classIds?: number[];
}

export interface NodeFilter extends NodeFilterBase {
  linkedNodeId?: number;
  linkedNodeRole?: 'S' | 'O';
}

export interface Triple {
  id: number;
  subjectId: number;
  predicateId: number;
  objectId?: number;
  objectLiteral?: string;
  objectLiteralIx?: string;
  literalType?: string;
  literalLanguage?: string;
  literalNumber?: number;
  sid?: string;
  tag?: string;
}

export interface UriTriple extends Triple {
  subjectUri: string;
  predicateUri: string;
  objectUri?: string;
}

export interface TripleGroup {
  predicateId: number;
  predicateUri: string;
  count: number;
}

export interface LiteralFilter {
  literalPattern?: string;
  literalType?: string;
  literalLanguage?: string;
  minLiteralNumber?: number;
  maxLiteralNumber?: number;
}

export interface TripleFilter extends LiteralFilter {
  subjectId?: number;
  predicateIds?: number[];
  notPredicateIds?: number[];
  hasLiteralObject?: boolean;
  objectId?: number;
  sid?: string;
  isSidPrefix?: boolean;
  tag?: string;
}

export interface LinkedNodeFilter extends NodeFilterBase {
  /**
   * The other node identifier, which is the subject node
   * ID when isObject is true, otherwise the object node ID.
   */
  otherNodeId: number;
  predicateId: number;
  /**
   * Whether the node to match is the object (true) or
   * the subject (false) of the triple having predicate
   * predicateId.
   */
  isObject?: boolean;
}

export interface LinkedLiteralFilter extends LiteralFilter {
  subjectId?: number;
  predicateId?: number;
}
//#endregion

/**
 * Cadmus semantic graph service.
 */
@Injectable({
  providedIn: 'root',
})
export class GraphService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService
  ) {}

  /**
   * Get the specified page of graph nodes.
   *
   * @param filter The nodes filter.
   * @returns A page of nodes.
   */
  public getNodes(
    pageNumber: number,
    pageSize: number,
    filter: NodeFilter
  ): Observable<DataPage<UriNode>> {
    const url = this._env.get('apiUrl') + 'graph/nodes';

    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageNumber', pageNumber.toString());
    httpParams = httpParams.set('pageSize', pageSize.toString());

    if (filter.uid) {
      httpParams = httpParams.set('uid', filter.uid);
    }
    if (filter.isClass !== null && filter.isClass !== undefined) {
      httpParams = httpParams.set('isClass', filter.isClass ? 'true' : 'false');
    }
    if (filter.tag) {
      httpParams = httpParams.set('tag', filter.tag);
    }
    if (filter.label) {
      httpParams = httpParams.set('label', filter.label);
    }
    if (filter.sourceType !== null && filter.sourceType !== undefined) {
      httpParams = httpParams.set('sourceType', filter.sourceType.toString());
    }
    if (filter.sid) {
      httpParams = httpParams.set('sid', filter.sid);
    }
    if (filter.isSidPrefix) {
      httpParams = httpParams.set('isSidPrefix', 'true');
    }
    if (filter.linkedNodeId) {
      httpParams = httpParams.set(
        'linkedNodeId',
        filter.linkedNodeId.toString()
      );
    }
    if (filter.linkedNodeRole) {
      httpParams = httpParams.set('linkedNodeRole', filter.linkedNodeRole);
    }
    if (filter.classIds?.length) {
      for (let i = 0; i < filter.classIds.length; i++) {
        httpParams = httpParams.set('classIds', filter.classIds[i]);
      }
    }

    return this._http
      .get<DataPage<UriNode>>(url, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the specified set of nodes.
   *
   * @param ids The nodes IDs.
   * @returns List of nodes/nulls.
   */
  public getNodeSet(ids: number[]): Observable<(UriNode | null)[]> {
    const url = this._env.get('apiUrl') + 'graph/nodes-set/';
    let httpParams = new HttpParams();
    for (let i = 0; i < ids.length; i++) {
      httpParams = httpParams.append('id', ids[i].toString());
    }

    return this._http
      .get<(UriNode | null)[]>(url, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the node with the specified ID.
   *
   * @param id The node's ID.
   * @returns The node.
   */
  public getNode(id: number): Observable<UriNode> {
    const url = this._env.get('apiUrl') + 'graph/nodes/' + id.toString();
    return this._http
      .get<UriNode>(url)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the node with the specified URI.
   *
   * @param uri The node's URI.
   * @returns The node.
   */
  public getNodeByUri(uri: string): Observable<UriNode> {
    const url = this._env.get('apiUrl') + 'graph/nodes-by-uri';
    let httpParams = new HttpParams();
    httpParams = httpParams.set('uri', uri);

    return this._http
      .get<UriNode>(url, { params: httpParams })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Add or update the specified node. A new node has id=0 and uri set;
   * an existing node has its id.
   *
   * @param node The node to add.
   * @returns The added node.
   */
  public addNode(node: UriNode): Observable<UriNode> {
    const url = this._env.get('apiUrl') + 'graph/nodes/';
    return this._http
      .post<UriNode>(url, node)
      .pipe(catchError(this._error.handleError));
  }

  /**
   * Delete the node with the specified ID.
   *
   * @param id The node's ID.
   */
  public deleteNode(id: number): Observable<any> {
    const url = this._env.get('apiUrl') + 'graph/nodes/' + id.toString();
    return this._http.delete(url).pipe(catchError(this._error.handleError));
  }

  private applyTripleFilter(
    pageNumber: number,
    pageSize: number,
    filter: TripleFilter,
    httpParams: HttpParams
  ): HttpParams {
    httpParams = httpParams.set('pageNumber', pageNumber.toString());
    httpParams = httpParams.set('pageSize', pageSize.toString());

    if (filter.subjectId) {
      httpParams = httpParams.set('subjectId', filter.subjectId.toString());
    }
    if (filter.predicateIds?.length) {
      filter.predicateIds!.forEach((p) => {
        httpParams = httpParams.set('predicateIds', p);
      });
    }
    if (filter.notPredicateIds?.length) {
      filter.notPredicateIds!.forEach((p) => {
        httpParams = httpParams.set('notPredicateIds', p);
      });
    }
    if (
      filter.hasLiteralObject !== null &&
      filter.hasLiteralObject !== undefined
    ) {
      httpParams = httpParams.set(
        'hasLiteralObject',
        filter.hasLiteralObject.toString()
      );
    }
    if (filter.objectId) {
      httpParams = httpParams.set('objectId', filter.objectId.toString());
    }
    if (filter.sid) {
      httpParams = httpParams.set('sid', filter.sid);
    }
    if (filter.isSidPrefix) {
      httpParams = httpParams.set('isSidPrefix', 'true');
    }
    if (filter.tag) {
      httpParams = httpParams.set('tag', filter.tag);
    }

    return httpParams;
  }

  /**
   * Get the specified page of triples.
   *
   * @param filter The filter.
   * @returns The page.
   */
  public getTriples(
    pageNumber: number,
    pageSize: number,
    filter: TripleFilter
  ): Observable<DataPage<UriTriple>> {
    const url = this._env.get('apiUrl') + 'graph/triples';

    const httpParams = this.applyTripleFilter(
      pageNumber,
      pageSize,
      filter,
      new HttpParams()
    );

    return this._http
      .get<DataPage<UriTriple>>(url, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the triple with the specified ID.
   *
   * @param id The triple's ID.
   * @returns The triple.
   */
  public getTriple(id: number): Observable<UriTriple> {
    const url = this._env.get('apiUrl') + 'graph/triples/' + id.toString();
    return this._http
      .get<UriTriple>(url)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Add or update the specified triple.
   *
   * @param triple The triple to add.
   * @returns The added triple.
   */
  public addTriple(triple: Triple): Observable<Triple> {
    const url = this._env.get('apiUrl') + 'graph/triples';
    return this._http
      .post<Triple>(url, triple)
      .pipe(catchError(this._error.handleError));
  }

  /**
   * Delete the triple with the specified ID.
   *
   * @param id The triple's ID.
   */
  public deleteTriple(id: number): Observable<any> {
    const url = this._env.get('apiUrl') + 'graph/triples/' + id.toString();
    return this._http.delete(url).pipe(catchError(this._error.handleError));
  }

  private applyLiteralFilter(
    filter: LiteralFilter,
    httpParams: HttpParams
  ): HttpParams {
    if (filter.literalPattern) {
      httpParams = httpParams.set('literalPattern', filter.literalPattern);
    }
    if (filter.literalType) {
      httpParams = httpParams.set('literalType', filter.literalType);
    }
    if (filter.literalLanguage) {
      httpParams = httpParams.set('literalLanguage', filter.literalLanguage);
    }
    if (filter.minLiteralNumber) {
      httpParams = httpParams.set(
        'minLiteralNumber',
        filter.minLiteralNumber.toString()
      );
    }
    if (filter.maxLiteralNumber) {
      httpParams = httpParams.set(
        'maxLiteralNumber',
        filter.maxLiteralNumber.toString()
      );
    }
    return httpParams;
  }

  /**
   * Get the specified page of triples grouped by their property.
   *
   * @param filter The filter.
   * @returns The page of triples.
   */
  public getTripleGroups(
    pageNumber: number,
    pageSize: number,
    filter: TripleFilter
  ): Observable<DataPage<TripleGroup>> {
    const httpParams = this.applyTripleFilter(
      pageNumber,
      pageSize,
      filter,
      new HttpParams()
    );

    const url = this._env.get('apiUrl') + 'graph/walk/triples';
    return this._http
      .get<DataPage<TripleGroup>>(url, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get linked nodes.
   * @param filter The filter.
   * @returns Observable with data page.
   */
  public getLinkedNodes(
    pageNumber: number,
    pageSize: number,
    filter: LinkedNodeFilter
  ): Observable<DataPage<UriNode>> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageNumber', pageNumber.toString());
    httpParams = httpParams.set('pageSize', pageSize.toString());

    // NodeFilterBase
    if (filter.uid) {
      httpParams = httpParams.set('uid', filter.uid);
    }
    if (filter.isClass !== null && filter.isClass !== undefined) {
      httpParams = httpParams.set('isClass', filter.isClass);
    }
    if (filter.tag) {
      httpParams = httpParams.set('tag', filter.tag);
    }
    if (filter.label) {
      httpParams = httpParams.set('label', filter.label);
    }
    if (filter.sourceType) {
      httpParams = httpParams.set('sourceType', +filter.sourceType);
    }
    if (filter.sid) {
      httpParams = httpParams.set('sid', filter.sid);
    }
    if (filter.isSidPrefix !== null && filter.isSidPrefix !== undefined) {
      httpParams = httpParams.set('isSidPrefix', filter.isSidPrefix);
    }
    if (filter.classIds?.length) {
      for (let i = 0; i < filter.classIds.length; i++) {
        httpParams = httpParams.set('classIds', filter.classIds[i]);
      }
    }

    // LinkedNodeFilter
    if (filter.otherNodeId) {
      httpParams = httpParams.set('otherNodeId', filter.otherNodeId);
    }
    if (filter.predicateId) {
      httpParams = httpParams.set('predicateId', filter.predicateId);
    }
    if (filter.isObject !== null && filter.isObject !== undefined) {
      httpParams = httpParams.set('isObject', filter.isObject);
    }

    const url = this._env.get('apiUrl') + 'graph/walk/nodes';
    return this._http
      .get<DataPage<UriNode>>(url, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get linked literals.
   * @param filter The filter.
   * @returns Observable with data page.
   */
  public getLinkedLiterals(
    pageNumber: number,
    pageSize: number,
    filter: LinkedLiteralFilter
  ): Observable<DataPage<UriTriple>> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageNumber', pageNumber.toString());
    httpParams = httpParams.set('pageSize', pageSize.toString());

    // LiteralFilter
    httpParams = this.applyLiteralFilter(filter, httpParams);

    // LinkedLiteralFilter
    if (filter.subjectId) {
      httpParams = httpParams.set('subjectId', filter.subjectId.toString());
    }
    if (filter.predicateId) {
      httpParams = httpParams.set('predicateId', filter.predicateId.toString());
    }

    const url = this._env.get('apiUrl') + 'graph/walk/nodes/literal';
    return this._http
      .get<DataPage<UriTriple>>(url, {
        params: httpParams,
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }
}
