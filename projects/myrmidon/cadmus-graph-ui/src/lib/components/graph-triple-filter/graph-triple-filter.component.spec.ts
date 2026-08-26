import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { NodeSourceType, TripleFilter, UriNode } from '@myrmidon/cadmus-api';

import { GraphTripleFilterComponent } from './graph-triple-filter.component';
import { GraphTripleListRepository } from '../../state/graph-triple-list.repository';
import { GraphNodeLookupService } from '../../services/graph-node-lookup.service';

function makeNode(id: number, overrides?: Partial<UriNode>): UriNode {
  return {
    id,
    uri: `x:node${id}`,
    label: `Node ${id}`,
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

describe('GraphTripleFilterComponent', () => {
  let component: GraphTripleFilterComponent;
  let fixture: ComponentFixture<GraphTripleFilterComponent>;
  let repository: {
    filter$: BehaviorSubject<TripleFilter>;
    subjectNode$: BehaviorSubject<UriNode | undefined>;
    predicateNode$: BehaviorSubject<UriNode | undefined>;
    objectNode$: BehaviorSubject<UriNode | undefined>;
    setTerm: ReturnType<typeof vi.fn>;
    setTermId: ReturnType<typeof vi.fn>;
    getTerm: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const filter$ = new BehaviorSubject<TripleFilter>({});
    const subjectNode$ = new BehaviorSubject<UriNode | undefined>(undefined);
    const predicateNode$ = new BehaviorSubject<UriNode | undefined>(undefined);
    const objectNode$ = new BehaviorSubject<UriNode | undefined>(undefined);
    const terms: Record<string, UriNode | undefined> = {};

    repository = {
      filter$,
      subjectNode$,
      predicateNode$,
      objectNode$,
      setTerm: vi.fn((node: UriNode | null | undefined, type: 'S' | 'P' | 'O') => {
        terms[type] = node || undefined;
        const subject$ = type === 'S' ? subjectNode$ : type === 'P' ? predicateNode$ : objectNode$;
        subject$.next(node || undefined);
      }),
      setTermId: vi.fn(),
      getTerm: vi.fn((type: 'S' | 'P' | 'O') => terms[type]),
      setFilter: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GraphTripleFilterComponent],
      providers: [
        { provide: GraphTripleListRepository, useValue: repository },
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
    fixture = TestBed.createComponent(GraphTripleFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial form state', () => {
    it('should build a form with default (unset) values', () => {
      expect(component.literal.value).toBe(false);
      expect(component.objectLit.value).toBeNull();
      expect(component.sid.value).toBeNull();
      expect(component.sidPrefix.value).toBe(false);
      expect(component.tag.value).toBeNull();
    });
  });

  describe('updateForm (via filter$ subscription)', () => {
    it('should populate the form and resolve terms when the repository filter changes', () => {
      repository.setTermId.mockClear();
      const filter: TripleFilter = {
        subjectId: 1,
        predicateIds: [2],
        objectId: 3,
        literalPattern: 'foo',
        sid: 'sid1',
        tag: 'tag1',
      };

      repository.filter$.next(filter);

      expect(repository.setTermId).toHaveBeenCalledWith(1, 'S');
      expect(repository.setTermId).toHaveBeenCalledWith(2, 'P');
      expect(repository.setTermId).toHaveBeenCalledWith(3, 'O');
      expect(component.literal.value).toBe(true);
      expect(component.objectLit.value).toBe('foo');
      expect(component.sid.value).toBe('sid1');
      expect(component.tag.value).toBe('tag1');
      expect(component.form.pristine).toBe(true);
    });

    it('should pass null predicate id when predicateIds is empty', () => {
      repository.setTermId.mockClear();

      repository.filter$.next({});

      expect(repository.setTermId).toHaveBeenCalledWith(undefined, 'S');
      expect(repository.setTermId).toHaveBeenCalledWith(null, 'P');
      expect(repository.setTermId).toHaveBeenCalledWith(undefined, 'O');
      expect(component.literal.value).toBe(false);
    });
  });

  describe('node term handlers', () => {
    it('onSubjectNodeChange should set the subject term in the repository', () => {
      const node = makeNode(1);
      component.onSubjectNodeChange(node);
      expect(repository.setTerm).toHaveBeenCalledWith(node, 'S');
    });

    it('clearSubjectNode should clear the subject term', () => {
      component.clearSubjectNode();
      expect(repository.setTerm).toHaveBeenCalledWith(null, 'S');
    });

    it('onPredicateNodeChange should set the predicate term in the repository', () => {
      const node = makeNode(2);
      component.onPredicateNodeChange(node);
      expect(repository.setTerm).toHaveBeenCalledWith(node, 'P');
    });

    it('clearPredicateNode should clear the predicate term', () => {
      component.clearPredicateNode();
      expect(repository.setTerm).toHaveBeenCalledWith(null, 'P');
    });

    it('onObjectNodeChange should set the object term in the repository', () => {
      const node = makeNode(3);
      component.onObjectNodeChange(node);
      expect(repository.setTerm).toHaveBeenCalledWith(node, 'O');
    });

    it('clearObjectNode should clear the object term', () => {
      component.clearObjectNode();
      expect(repository.setTerm).toHaveBeenCalledWith(null, 'O');
    });
  });

  describe('apply', () => {
    it('should not call setFilter when the form is invalid', () => {
      component.objectLit.setValue('a'.repeat(101));
      component.objectLit.updateValueAndValidity();
      expect(component.form.invalid).toBe(true);

      component.apply();

      expect(repository.setFilter).not.toHaveBeenCalled();
    });

    it('should build and set the filter from term ids and literal fields', () => {
      component.onSubjectNodeChange(makeNode(1));
      component.onPredicateNodeChange(makeNode(2));
      component.sid.setValue('  mysid  ');
      component.tag.setValue('  mytag  ');

      component.apply();

      expect(repository.setFilter).toHaveBeenCalledWith({
        subjectId: 1,
        predicateIds: [2],
        objectId: undefined,
        literalPattern: undefined,
        sid: 'mysid',
        tag: 'mytag',
      });
    });

    it('should use the object term id (not literalPattern) when literal is false', () => {
      component.onObjectNodeChange(makeNode(3));
      component.literal.setValue(false);

      component.apply();

      const arg = repository.setFilter.mock.calls.at(-1)![0] as TripleFilter;
      expect(arg.objectId).toBe(3);
      expect(arg.literalPattern).toBeUndefined();
    });

    it('should use literalPattern (not object term id) when literal is true', () => {
      component.onObjectNodeChange(makeNode(3));
      component.literal.setValue(true);
      component.objectLit.setValue(' hello ');

      component.apply();

      const arg = repository.setFilter.mock.calls.at(-1)![0] as TripleFilter;
      expect(arg.objectId).toBeUndefined();
      expect(arg.literalPattern).toBe('hello');
    });
  });

  describe('reset', () => {
    it('should reset the form and re-apply the (now empty) filter', () => {
      component.sid.setValue('something');
      component.sid.markAsDirty();

      component.reset();

      expect(component.sid.value).toBeNull();
      expect(repository.setFilter).toHaveBeenCalled();
    });

    it('should clear previously selected subject/predicate/object terms', () => {
      component.onSubjectNodeChange(makeNode(1));

      component.reset();

      const arg = repository.setFilter.mock.calls.at(-1)![0] as TripleFilter;
      expect(arg.subjectId).toBeUndefined();
    });
  });
});
