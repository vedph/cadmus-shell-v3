import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { GraphService, NodeSourceType, UriNode } from '@myrmidon/cadmus-api';
import { GraphNodeLookupService } from '@myrmidon/cadmus-graph-ui';

import { TripleFilterComponent } from './triple-filter.component';
import { PagedTripleFilter } from '../../graph-walker';

function makeNode(id: number, overrides?: Partial<UriNode>): UriNode {
  return {
    id,
    uri: `x:node${id}`,
    label: `Node ${id}`,
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

describe('TripleFilterComponent', () => {
  let component: TripleFilterComponent;
  let fixture: ComponentFixture<TripleFilterComponent>;
  let graphService: {
    getNode: ReturnType<typeof vi.fn>;
    getNodeSet: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    graphService = {
      getNode: vi.fn().mockReturnValue(of(null)),
      getNodeSet: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [TripleFilterComponent],
      providers: [
        {
          provide: GraphNodeLookupService,
          useValue: {
            id: 'graph-node',
            getById: vi.fn().mockReturnValue(of(undefined)),
            lookup: vi.fn().mockReturnValue(of([])),
            getName: vi.fn().mockReturnValue(''),
          },
        },
        // GraphService is looked up by its real class since the component
        // injects it directly (not via an interface token).
        { provide: GraphService, useValue: graphService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TripleFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial form state', () => {
    it('should build a form with default (unset) values', () => {
      expect(component.pageNumber.value).toBe(1);
      expect(component.pageSize.value).toBe(10);
      expect(component.litPattern.value).toBeNull();
      expect(component.litType.value).toBeNull();
      expect(component.litLanguage.value).toBeNull();
      expect(component.minLitNumber.value).toBeNull();
      expect(component.maxLitNumber.value).toBeNull();
      expect(component.subj.value).toBeNull();
      expect(component.isNotPred.value).toBe(false);
      expect(component.preds.value).toEqual([]);
      expect(component.notPreds.value).toEqual([]);
      expect(component.hasLiteralObj.value).toBeNull();
      expect(component.obj.value).toBeNull();
      expect(component.sid.value).toBeNull();
      expect(component.isSidPrefix.value).toBe(false);
      expect(component.tag.value).toBeNull();
    });
  });

  describe('updateForm (via filter model effect)', () => {
    it('should populate scalar fields and resolve subject/predicate/object nodes', () => {
      const subject = makeNode(1);
      const predicate = makeNode(2);
      const object = makeNode(3);
      graphService.getNode.mockImplementation((id: number) => {
        if (id === 1) {
          return of(subject);
        }
        if (id === 3) {
          return of(object);
        }
        return of(null);
      });
      graphService.getNodeSet.mockReturnValue(of([predicate]));

      const filter: PagedTripleFilter = {
        pageNumber: 2,
        pageSize: 20,
        subjectId: 1,
        predicateIds: [2],
        objectId: 3,
        literalPattern: 'foo',
        sid: 'sid1',
        tag: 'tag1',
        isSidPrefix: true,
      };
      fixture.componentRef.setInput('filter', filter);
      fixture.detectChanges();

      expect(component.pageNumber.value).toBe(2);
      expect(component.pageSize.value).toBe(20);
      expect(component.litPattern.value).toBe('foo');
      expect(component.sid.value).toBe('sid1');
      expect(component.isSidPrefix.value).toBe(true);
      expect(component.tag.value).toBe('tag1');
      expect(component.subj.value).toEqual(subject);
      expect(component.preds.value).toEqual([predicate]);
      expect(component.obj.value).toEqual(object);
      expect(component.form.pristine).toBe(true);
    });

    it('should not fetch subject/object nodes when their ids are absent', () => {
      graphService.getNode.mockClear();
      graphService.getNodeSet.mockClear();

      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
      });
      fixture.detectChanges();

      expect(graphService.getNode).not.toHaveBeenCalled();
      expect(component.subj.value).toBeNull();
      expect(component.obj.value).toBeNull();
      expect(component.preds.value).toEqual([]);
    });

    it('should still resolve subject/object and mark the form pristine when predicateIds is absent', () => {
      // regression test for a bug where the forkJoin's "p" branch used
      // from([]) (an observable that completes without emitting) when
      // predicateIds was empty; since forkJoin only emits once ALL its
      // sources have emitted, this meant the whole subscribe callback -
      // including the s/o assignments and markAsPristine() - silently
      // never ran whenever predicateIds was missing, even though
      // subjectId/objectId were resolved successfully.
      const subject = makeNode(1);
      const object = makeNode(3);
      graphService.getNode.mockImplementation((id: number) =>
        id === 1 ? of(subject) : of(object)
      );

      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        subjectId: 1,
        objectId: 3,
      });
      fixture.detectChanges();

      expect(component.subj.value).toEqual(subject);
      expect(component.obj.value).toEqual(object);
      expect(component.preds.value).toEqual([]);
      expect(component.form.pristine).toBe(true);
    });
  });

  describe('predicate handling', () => {
    it('onPredicateNodeChange should add to preds when isNotPred is false', () => {
      const node = makeNode(2);
      component.onPredicateNodeChange(node);
      expect(component.preds.value).toEqual([node]);
      expect(component.notPreds.value).toEqual([]);
      expect(component.preds.dirty).toBe(true);
    });

    it('onPredicateNodeChange should add to notPreds when isNotPred is true', () => {
      component.isNotPred.setValue(true);
      const node = makeNode(2);
      component.onPredicateNodeChange(node);
      expect(component.notPreds.value).toEqual([node]);
      expect(component.preds.value).toEqual([]);
    });

    it('onPredicateNodeChange should not add a duplicate predicate (same id)', () => {
      const node = makeNode(2);
      component.onPredicateNodeChange(node);
      component.preds.markAsPristine();
      component.onPredicateNodeChange(makeNode(2, { label: 'Other label' }));
      expect(component.preds.value).toEqual([node]);
      expect(component.preds.dirty).toBe(false);
    });

    it('onPredicateNodeChange should do nothing when node is falsy', () => {
      component.onPredicateNodeChange(null);
      expect(component.preds.value).toEqual([]);
    });

    it('deletePred should remove the given predicate', () => {
      const n1 = makeNode(1);
      const n2 = makeNode(2);
      component.preds.setValue([n1, n2]);
      component.deletePred(n1);
      expect(component.preds.value).toEqual([n2]);
    });

    it('deleteNotPred should remove the given predicate', () => {
      const n1 = makeNode(1);
      const n2 = makeNode(2);
      component.notPreds.setValue([n1, n2]);
      component.deleteNotPred(n1);
      expect(component.notPreds.value).toEqual([n2]);
    });
  });

  describe('node term handlers', () => {
    it('onSubjectNodeChange should set the subject term', () => {
      const node = makeNode(1);
      component.onSubjectNodeChange(node);
      expect(component.subj.value).toEqual(node);
    });

    it('onObjectNodeChange should set the object term', () => {
      const node = makeNode(3);
      component.onObjectNodeChange(node);
      expect(component.obj.value).toEqual(node);
    });
  });

  describe('apply', () => {
    it('should build and emit the filter from term ids and literal fields', () => {
      component.onSubjectNodeChange(makeNode(1));
      component.onPredicateNodeChange(makeNode(2));
      // note: the component does not trim sid/tag values, so whitespace
      // is preserved as-is in the emitted filter.
      component.sid.setValue('mysid');
      component.tag.setValue('mytag');

      component.apply();

      expect(component.filter()).toEqual({
        pageNumber: 1,
        pageSize: 10,
        literalPattern: undefined,
        literalType: undefined,
        literalLanguage: undefined,
        minLiteralNumber: undefined,
        maxLiteralNumber: undefined,
        subjectId: 1,
        predicateIds: [2],
        notPredicateIds: undefined,
        hasLiteralObject: undefined,
        objectId: undefined,
        sid: 'mysid',
        isSidPrefix: false,
        tag: 'mytag',
      });
      expect(component.form.pristine).toBe(true);
    });

    it('should use notPredicateIds from notPreds', () => {
      component.isNotPred.setValue(true);
      component.onPredicateNodeChange(makeNode(2));

      component.apply();

      expect(component.filter().notPredicateIds).toEqual([2]);
      expect(component.filter().predicateIds).toBeUndefined();
    });

    it('should emit the object node id (not literalPattern) regardless of hasLiteralObj', () => {
      component.onObjectNodeChange(makeNode(3));

      component.apply();

      expect(component.filter().objectId).toBe(3);
    });

    it('should also include literalPattern when set, alongside objectId', () => {
      component.onObjectNodeChange(makeNode(3));
      component.litPattern.setValue('hello');

      component.apply();

      expect(component.filter().objectId).toBe(3);
      expect(component.filter().literalPattern).toBe('hello');
    });
  });

  describe('reset', () => {
    it('should reset the form and re-emit the (now empty) filter', () => {
      component.sid.setValue('something');
      component.sid.markAsDirty();

      component.reset();

      expect(component.sid.value).toBeNull();
      expect(component.filter().sid).toBeUndefined();
    });

    it('should clear previously selected subject/predicate/object terms', () => {
      component.onSubjectNodeChange(makeNode(1));

      component.reset();

      expect(component.filter().subjectId).toBeUndefined();
      expect(component.subj.value).toBeNull();
    });
  });

  describe('onPageChange', () => {
    it('should update pageNumber and emit the filter', () => {
      component.onPageChange({
        pageIndex: 2,
        pageSize: 10,
        length: 100,
      });

      expect(component.pageNumber.value).toBe(3);
      expect(component.filter().pageNumber).toBe(3);
    });
  });
});
