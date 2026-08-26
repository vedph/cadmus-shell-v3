import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { DataPage } from '@myrmidon/ngx-tools';
import { GraphService, NodeSourceType, UriTriple } from '@myrmidon/cadmus-api';

import { GraphTripleListComponent } from './graph-triple-list.component';
import { GraphTripleListRepository } from '../../state/graph-triple-list.repository';
import { GraphNodeLookupService } from '../../services/graph-node-lookup.service';

function makeTriple(id: number, overrides?: Partial<UriTriple>): UriTriple {
  return {
    id,
    subjectId: 1,
    predicateId: 2,
    objectId: 3,
    subjectUri: 'x:s',
    predicateUri: 'x:p',
    objectUri: 'x:o',
    ...overrides,
  };
}

function makePage(items: UriTriple[] = []): DataPage<UriTriple> {
  return { pageNumber: 1, pageSize: 20, pageCount: 1, total: items.length, items };
}

describe('GraphTripleListComponent', () => {
  let component: GraphTripleListComponent;
  let fixture: ComponentFixture<GraphTripleListComponent>;
  let repository: {
    page$: BehaviorSubject<DataPage<UriTriple>>;
    loading$: BehaviorSubject<boolean | undefined>;
    filter$: BehaviorSubject<any>;
    subjectNode$: BehaviorSubject<undefined>;
    predicateNode$: BehaviorSubject<undefined>;
    objectNode$: BehaviorSubject<undefined>;
    setPage: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    setTerm: ReturnType<typeof vi.fn>;
    setTermId: ReturnType<typeof vi.fn>;
    getTerm: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
  };
  let graphService: {
    addTriple: ReturnType<typeof vi.fn>;
    deleteTriple: ReturnType<typeof vi.fn>;
    getNode: ReturnType<typeof vi.fn>;
  };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repository = {
      page$: new BehaviorSubject<DataPage<UriTriple>>(makePage()),
      loading$: new BehaviorSubject<boolean | undefined>(false),
      filter$: new BehaviorSubject<any>({}),
      subjectNode$: new BehaviorSubject<undefined>(undefined),
      predicateNode$: new BehaviorSubject<undefined>(undefined),
      objectNode$: new BehaviorSubject<undefined>(undefined),
      setPage: vi.fn(),
      reset: vi.fn(),
      setTerm: vi.fn(),
      setTermId: vi.fn(),
      getTerm: vi.fn(),
      setFilter: vi.fn(),
    };
    graphService = {
      addTriple: vi.fn().mockReturnValue(of({})),
      deleteTriple: vi.fn().mockReturnValue(of(undefined)),
      getNode: vi.fn().mockReturnValue(of(undefined)),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GraphTripleListComponent],
      providers: [
        { provide: GraphTripleListRepository, useValue: repository },
        { provide: GraphService, useValue: graphService },
        { provide: DialogService, useValue: dialogService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        {
          provide: GraphNodeLookupService,
          useValue: {
            id: 'graph-node',
            getById: vi.fn().mockReturnValue(of(undefined)),
            lookup: vi.fn().mockReturnValue(of([])),
            getName: vi.fn().mockReturnValue(''),
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphTripleListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should wire page$ and loading$ from the repository', () => {
    let page: DataPage<UriTriple> | undefined;
    component.page$.subscribe((p) => (page = p));
    expect(page?.items.length).toBe(0);

    let loading: boolean | undefined;
    component.loading$.subscribe((v) => (loading = v));
    expect(loading).toBe(false);
  });

  describe('onPageChange', () => {
    it('should delegate to repository.setPage with a 1-based page number', () => {
      const event: PageEvent = { pageIndex: 2, pageSize: 10, length: 100 };
      component.onPageChange(event);
      expect(repository.setPage).toHaveBeenCalledWith(3, 10);
    });
  });

  describe('addTriple', () => {
    it('should set editedTriple to a blank new triple', () => {
      component.addTriple();
      expect(component.editedTriple()).toEqual({
        id: 0,
        subjectId: 0,
        predicateId: 0,
        objectId: 0,
        subjectUri: '',
        predicateUri: '',
      });
    });
  });

  describe('editTriple', () => {
    it('should set editedTriple to a deep copy of the given triple', () => {
      const t = makeTriple(5);
      component.editTriple(t);
      expect(component.editedTriple()).toEqual(t);
      expect(component.editedTriple()).not.toBe(t);
    });
  });

  describe('onEditorClose', () => {
    it('should clear editedTriple', () => {
      component.editTriple(makeTriple(1));
      component.onEditorClose();
      expect(component.editedTriple()).toBeUndefined();
    });
  });

  describe('onTripleChange', () => {
    it('should save the triple, clear the editor, reset the repository and notify the user', () => {
      component.editTriple(makeTriple(1));
      const t = makeTriple(1);

      component.onTripleChange(t);

      expect(graphService.addTriple).toHaveBeenCalledWith(t);
      expect(component.editedTriple()).toBeUndefined();
      expect(repository.reset).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Triple saved',
        'OK',
        expect.objectContaining({ duration: 1500 })
      );
    });

    it('should notify the user and keep the editor open on save error', () => {
      graphService.addTriple.mockReturnValue(throwError(() => new Error('boom')));
      component.editTriple(makeTriple(1));

      component.onTripleChange(makeTriple(1));

      expect(repository.reset).not.toHaveBeenCalled();
      expect(component.editedTriple()).toBeTruthy();
      expect(snackBar.open).toHaveBeenCalledWith('Error saving triple', 'OK');
    });
  });

  describe('deleteTriple', () => {
    it('should confirm, delete via GraphService and reset the repository when confirmed', () => {
      const t = makeTriple(3);

      component.deleteTriple(t);

      expect(dialogService.confirm).toHaveBeenCalledWith('Delete Triple', 'Delete triple?');
      expect(graphService.deleteTriple).toHaveBeenCalledWith(3);
      expect(repository.reset).toHaveBeenCalled();
    });

    it('should not delete when the confirmation is declined', () => {
      dialogService.confirm.mockReturnValue(of(false));

      component.deleteTriple(makeTriple(3));

      expect(graphService.deleteTriple).not.toHaveBeenCalled();
      expect(repository.reset).not.toHaveBeenCalled();
    });

    it('should notify the user on delete error without resetting the repository', () => {
      graphService.deleteTriple.mockReturnValue(throwError(() => new Error('boom')));

      component.deleteTriple(makeTriple(3));

      expect(repository.reset).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('Error deleting triple', 'OK');
    });
  });

  describe('reset', () => {
    it('should delegate to repository.reset', () => {
      component.reset();
      expect(repository.reset).toHaveBeenCalled();
    });
  });
});
