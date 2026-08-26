import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageEvent } from '@angular/material/paginator';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DataPage } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { GraphService, NodeSourceType, UriNode } from '@myrmidon/cadmus-api';
import { MatSnackBar } from '@angular/material/snack-bar';

import { GraphNodeListComponent } from './graph-node-list.component';
import { NodeListRepository } from '../../state/graph-node-list.repository';
import { GraphNodeLookupService } from '../../services/graph-node-lookup.service';

function buildUriNode(overrides: Partial<UriNode> = {}): UriNode {
  return {
    id: 1,
    uri: 'x:node1',
    label: 'Node 1',
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

function buildPage(items: UriNode[] = []): DataPage<UriNode> {
  return {
    pageNumber: 1,
    pageSize: 10,
    pageCount: 1,
    total: items.length,
    items,
  };
}

describe('GraphNodeListComponent', () => {
  let component: GraphNodeListComponent;
  let fixture: ComponentFixture<GraphNodeListComponent>;
  let loading$: BehaviorSubject<boolean | undefined>;
  let page$: BehaviorSubject<DataPage<UriNode>>;
  let repository: {
    loading$: BehaviorSubject<boolean | undefined>;
    page$: BehaviorSubject<DataPage<UriNode>>;
    filter$: BehaviorSubject<any>;
    linkedNode$: BehaviorSubject<UriNode | undefined>;
    classNodes$: BehaviorSubject<UriNode[] | undefined>;
    reset: ReturnType<typeof vi.fn>;
    setPage: ReturnType<typeof vi.fn>;
    getLinkedNode: ReturnType<typeof vi.fn>;
    getClassNodes: ReturnType<typeof vi.fn>;
    setLinkedNode: ReturnType<typeof vi.fn>;
    setLinkedNodeId: ReturnType<typeof vi.fn>;
    addClassNode: ReturnType<typeof vi.fn>;
    deleteClassNode: ReturnType<typeof vi.fn>;
    setClassNodeIds: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
  };
  let graphService: {
    addNode: ReturnType<typeof vi.fn>;
    deleteNode: ReturnType<typeof vi.fn>;
  };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    loading$ = new BehaviorSubject<boolean | undefined>(false);
    page$ = new BehaviorSubject<DataPage<UriNode>>(buildPage());
    repository = {
      loading$,
      page$,
      filter$: new BehaviorSubject<any>({}),
      linkedNode$: new BehaviorSubject<UriNode | undefined>(undefined),
      classNodes$: new BehaviorSubject<UriNode[] | undefined>([]),
      reset: vi.fn(),
      setPage: vi.fn(),
      getLinkedNode: vi.fn().mockReturnValue(undefined),
      getClassNodes: vi.fn().mockReturnValue([]),
      setLinkedNode: vi.fn(),
      setLinkedNodeId: vi.fn(),
      addClassNode: vi.fn(),
      deleteClassNode: vi.fn(),
      setClassNodeIds: vi.fn(),
      setFilter: vi.fn(),
    };
    graphService = {
      addNode: vi.fn(),
      deleteNode: vi.fn(),
    };
    dialogService = { confirm: vi.fn() };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GraphNodeListComponent],
      providers: [
        { provide: NodeListRepository, useValue: repository },
        { provide: GraphService, useValue: graphService },
        { provide: DialogService, useValue: dialogService },
        { provide: MatSnackBar, useValue: snackBar },
        {
          provide: GraphNodeLookupService,
          // the nested cadmus-refs-lookup components (inside the filter)
          // call getName(item) unconditionally to render their button
          // label, so the mock must provide it
          useValue: {
            id: 'graph-node',
            lookup: vi.fn().mockReturnValue(of([])),
            getById: vi.fn(),
            getName: vi.fn().mockReturnValue(''),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphNodeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region addNode / editNode / onEditorClose
  it('addNode should set editedNode to a fresh empty node', () => {
    component.addNode();
    expect(component.editedNode()).toEqual({
      uri: '',
      id: 0,
      sourceType: NodeSourceType.User,
      label: '',
    });
  });

  it('editNode should set editedNode to the given node', () => {
    const node = buildUriNode();
    component.editNode(node);
    expect(component.editedNode()).toBe(node);
  });

  it('onEditorClose should clear editedNode', () => {
    component.editNode(buildUriNode());
    component.onEditorClose();
    expect(component.editedNode()).toBeUndefined();
  });
  //#endregion

  //#region onNodeChange
  it('onNodeChange should save the node, clear editedNode, reset the list and notify on success', () => {
    const node = buildUriNode();
    graphService.addNode.mockReturnValue(of(node));
    component.editNode(node);

    component.onNodeChange(node);

    expect(graphService.addNode).toHaveBeenCalledWith(node);
    expect(component.editedNode()).toBeUndefined();
    expect(repository.reset).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Node saved', 'OK', {
      duration: 1500,
    });
  });

  it('onNodeChange should notify an error and keep editedNode on failure', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const node = buildUriNode();
    graphService.addNode.mockReturnValue(throwError(() => new Error('boom')));
    component.editNode(node);

    component.onNodeChange(node);

    expect(component.editedNode()).toBe(node);
    expect(repository.reset).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Error saving node', 'OK');
    consoleSpy.mockRestore();
  });
  //#endregion

  //#region deleteNode
  it('deleteNode should delete the node and reset the list when confirmed', () => {
    dialogService.confirm.mockReturnValue(of(true));
    graphService.deleteNode.mockReturnValue(of({}));
    const node = buildUriNode();

    component.deleteNode(node);

    expect(dialogService.confirm).toHaveBeenCalledWith(
      'Delete Node',
      'Delete node ' + node.label + '?'
    );
    expect(graphService.deleteNode).toHaveBeenCalledWith(node.id);
    expect(repository.reset).toHaveBeenCalled();
  });

  it('deleteNode should not call the service when not confirmed', () => {
    dialogService.confirm.mockReturnValue(of(false));
    const node = buildUriNode();

    component.deleteNode(node);

    expect(graphService.deleteNode).not.toHaveBeenCalled();
    expect(repository.reset).not.toHaveBeenCalled();
  });

  it('deleteNode should notify an error on failure', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    dialogService.confirm.mockReturnValue(of(true));
    graphService.deleteNode.mockReturnValue(
      throwError(() => new Error('boom'))
    );
    const node = buildUriNode();

    component.deleteNode(node);

    expect(repository.reset).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Error deleting node', 'OK');
    consoleSpy.mockRestore();
  });
  //#endregion

  it('walkNode should emit nodeWalk with the given node', () => {
    const spy = vi.fn();
    component.nodeWalk.subscribe(spy);
    const node = buildUriNode();

    component.walkNode(node);

    expect(spy).toHaveBeenCalledWith(node);
  });

  it('onPageChange should set the page on the repository (1-based)', () => {
    const event = { pageIndex: 2, pageSize: 20 } as PageEvent;
    component.onPageChange(event);
    expect(repository.setPage).toHaveBeenCalledWith(3, 20);
  });

  it('reset should reset the repository', () => {
    component.reset();
    expect(repository.reset).toHaveBeenCalled();
  });
});
