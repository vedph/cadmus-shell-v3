import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import { of, Subject } from 'rxjs';
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

// FieldTree tags array items with a hidden identity Symbol: compare
// through a JSON round-trip
const json = (v: unknown) => JSON.parse(JSON.stringify(v));

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
      expect(component.form.pageNumber().value()).toBe(1);
      expect(component.form.pageSize().value()).toBe(10);
      expect(component.form.litPattern().value()).toBe('');
      expect(component.form.litType().value()).toBe('');
      expect(component.form.litLanguage().value()).toBe('');
      expect(component.form.minLitNumber().value()).toBeNull();
      expect(component.form.maxLitNumber().value()).toBeNull();
      expect(component.form.subj().value()).toBeNull();
      expect(component.form.isNotPred().value()).toBe(false);
      expect(json(component.form.preds().value())).toEqual(json([]));
      expect(json(component.form.notPreds().value())).toEqual(json([]));
      expect(component.form.hasLiteralObj().value()).toBeNull();
      expect(component.form.obj().value()).toBeNull();
      expect(component.form.sid().value()).toBe('');
      expect(component.form.isSidPrefix().value()).toBe(false);
      expect(component.form.tag().value()).toBe('');
    });
  });

  describe('draft (via filter model)', () => {
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

      expect(component.form.pageNumber().value()).toBe(2);
      expect(component.form.pageSize().value()).toBe(20);
      expect(component.form.litPattern().value()).toBe('foo');
      expect(component.form.sid().value()).toBe('sid1');
      expect(component.form.isSidPrefix().value()).toBe(true);
      expect(component.form.tag().value()).toBe('tag1');
      expect(component.form.subj().value()).toEqual(subject);
      expect(json(component.form.preds().value())).toEqual(json([predicate]));
      expect(component.form.obj().value()).toEqual(object);
      expect(component.form().dirty()).toBe(false);
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
      expect(component.form.subj().value()).toBeNull();
      expect(component.form.obj().value()).toBeNull();
      expect(json(component.form.preds().value())).toEqual(json([]));
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

      expect(component.form.subj().value()).toEqual(subject);
      expect(component.form.obj().value()).toEqual(object);
      expect(json(component.form.preds().value())).toEqual(json([]));
      expect(component.form().dirty()).toBe(false);
    });
  });

  describe('predicate handling', () => {
    it('onPredicateNodeChange should add to preds when isNotPred is false', () => {
      const node = makeNode(2);
      component.onPredicateNodeChange(node);
      expect(json(component.form.preds().value())).toEqual(json([node]));
      expect(json(component.form.notPreds().value())).toEqual(json([]));
      expect(component.form.preds().dirty()).toBe(true);
    });

    it('onPredicateNodeChange should add to notPreds when isNotPred is true', () => {
      component.form.isNotPred().value.set(true);
      const node = makeNode(2);
      component.onPredicateNodeChange(node);
      expect(json(component.form.notPreds().value())).toEqual(json([node]));
      expect(json(component.form.preds().value())).toEqual(json([]));
    });

    it('onPredicateNodeChange should not add a duplicate predicate (same id)', () => {
      const node = makeNode(2);
      component.onPredicateNodeChange(node);
      // reset() clears interaction state (dirty) only
      component.form.preds().reset();
      component.onPredicateNodeChange(makeNode(2, { label: 'Other label' }));
      expect(json(component.form.preds().value())).toEqual(json([node]));
      expect(component.form.preds().dirty()).toBe(false);
    });

    it('onPredicateNodeChange should do nothing when node is falsy', () => {
      component.onPredicateNodeChange(null);
      expect(json(component.form.preds().value())).toEqual(json([]));
    });

    it('deletePred should remove the given predicate', () => {
      const n1 = makeNode(1);
      const n2 = makeNode(2);
      component.form.preds().value.set([n1, n2]);
      component.deletePred(n1);
      expect(json(component.form.preds().value())).toEqual(json([n2]));
    });

    it('deleteNotPred should remove the given predicate', () => {
      const n1 = makeNode(1);
      const n2 = makeNode(2);
      component.form.notPreds().value.set([n1, n2]);
      component.deleteNotPred(n1);
      expect(json(component.form.notPreds().value())).toEqual(json([n2]));
    });
  });

  describe('node term handlers', () => {
    it('onSubjectNodeChange should set the subject term', () => {
      const node = makeNode(1);
      component.onSubjectNodeChange(node);
      expect(component.form.subj().value()).toEqual(node);
    });

    it('onObjectNodeChange should set the object term', () => {
      const node = makeNode(3);
      component.onObjectNodeChange(node);
      expect(component.form.obj().value()).toEqual(node);
    });
  });

  describe('apply', () => {
    it('should build and emit the filter from term ids and literal fields', () => {
      component.onSubjectNodeChange(makeNode(1));
      component.onPredicateNodeChange(makeNode(2));
      // note: the component does not trim sid/tag values, so whitespace
      // is preserved as-is in the emitted filter.
      component.form.sid().value.set('mysid');
      component.form.tag().value.set('mytag');

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
      expect(component.form().dirty()).toBe(false);
    });

    it('should use notPredicateIds from notPreds', () => {
      component.form.isNotPred().value.set(true);
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
      component.form.litPattern().value.set('hello');

      component.apply();

      expect(component.filter().objectId).toBe(3);
      expect(component.filter().literalPattern).toBe('hello');
    });
  });

  describe('reset', () => {
    it('should reset the form and re-emit the (now empty) filter', () => {
      component.form.sid().value.set('something');
      component.form.sid().markAsDirty();

      component.reset();

      expect(component.form.sid().value()).toBe('');
      expect(component.filter().sid).toBeUndefined();
    });

    it('should clear previously selected subject/predicate/object terms', () => {
      component.onSubjectNodeChange(makeNode(1));

      component.reset();

      expect(component.filter().subjectId).toBeUndefined();
      expect(component.form.subj().value()).toBeNull();
    });
  });

  describe('onPageChange', () => {
    it('should update pageNumber and emit the filter', () => {
      component.onPageChange({
        pageIndex: 2,
        pageSize: 10,
        length: 100,
      });

      expect(component.form.pageNumber().value()).toBe(3);
      expect(component.filter().pageNumber).toBe(3);
    });
  });

  describe('template, echo and rebuild', () => {
    it('renders no <form> element; apply is a type=button click', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const apply: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[mattooltip="Apply filters"]'
      );
      expect(apply.type).toBe('button');
      component.form.sid().value.set('s');
      apply.click();
      expect(component.filter().sid).toBe('s');
    });

    it('renders the length limits as maxlength attributes', () => {
      const inputs: HTMLInputElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('input[matinput]')
      );
      // triple tab: sid, tag
      expect(inputs.map((i) => i.maxLength)).toEqual([500, 50]);
    });

    it('applies when Enter is pressed in a text input, unless disabled', () => {
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input[matinput]');
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.filter().sid).toBe('typed');

      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      input.value = 'other';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.filter().sid).toBe('typed');
    });

    it('does not refetch nodes nor reset the draft on the echo of its own apply', () => {
      component.onSubjectNodeChange(makeNode(1));
      component.form.isNotPred().value.set(true);
      component.onPredicateNodeChange(makeNode(2));
      graphService.getNode.mockClear();
      graphService.getNodeSet.mockClear();

      component.apply();
      fixture.detectChanges();

      expect(component.filter().subjectId).toBe(1);
      expect(component.filter().notPredicateIds).toEqual([2]);
      expect(graphService.getNode).not.toHaveBeenCalled();
      expect(graphService.getNodeSet).not.toHaveBeenCalled();
      expect(component.form.notPreds().value().length).toBe(1);
      expect(component.form.isNotPred().value()).toBe(true);
    });

    it('loads notPreds from notPredicateIds when another filter is bound', () => {
      const np = makeNode(4);
      graphService.getNodeSet.mockImplementation((ids: number[]) =>
        of(ids.includes(4) ? [np] : [])
      );
      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        notPredicateIds: [4],
      });
      fixture.detectChanges();

      expect(json(component.form.notPreds().value())).toEqual(json([np]));
      // the service's own object is not adopted by the draft
      expect(Object.getOwnPropertySymbols(np).length).toBe(0);
      // re-applying keeps the filter's notPredicateIds
      component.apply();
      expect(component.filter().notPredicateIds).toEqual([4]);
    });

    it('keeps the isNotPred toggle when another filter is bound', () => {
      component.form.isNotPred().value.set(true);
      fixture.componentRef.setInput('filter', {
        pageNumber: 3,
        pageSize: 10,
      });
      fixture.detectChanges();

      expect(component.form.pageNumber().value()).toBe(3);
      expect(component.form.isNotPred().value()).toBe(true);
    });
  });

  describe('reported bugs', () => {
    it('keeps 0 literal numbers and a false hasLiteralObject', () => {
      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        minLiteralNumber: 0,
        hasLiteralObject: false,
      });
      fixture.detectChanges();
      expect(component.form.minLitNumber().value()).toBe(0);
      component.apply();
      expect(component.filter().minLiteralNumber).toBe(0);
      expect(component.filter().hasLiteralObject).toBe(false);
    });

    it('passes the total count to the paginator', () => {
      fixture.componentRef.setInput('hasPager', true);
      fixture.componentRef.setInput('total', 42);
      fixture.detectChanges();
      const pager = fixture.debugElement.query(By.directive(MatPaginator));
      expect(pager.componentInstance.length).toBe(42);
    });

    it('shows the subject and object loaded from the filter in the lookups', () => {
      graphService.getNode.mockImplementation((id: number) => of(makeNode(id)));
      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        subjectId: 1,
        objectId: 3,
      });
      fixture.detectChanges();
      const items = fixture.debugElement
        .queryAll(By.directive(RefLookupComponent))
        .map((d) => d.componentInstance.item()?.id);
      // subject, predicate (a picker, not a selection), object
      expect(items).toEqual([1, undefined, 3]);
    });

    it('ignores nodes loaded for a filter no longer bound', () => {
      const late = new Subject<UriNode>();
      graphService.getNode.mockImplementation((id: number) =>
        id === 1 ? late : of(makeNode(id))
      );
      fixture.componentRef.setInput('filter', { pageNumber: 1, pageSize: 10, subjectId: 1 });
      fixture.detectChanges();
      fixture.componentRef.setInput('filter', { pageNumber: 1, pageSize: 10, subjectId: 3 });
      fixture.detectChanges();
      late.next(makeNode(1));
      late.complete();
      expect(component.form.subj().value()?.id).toBe(3);
    });
  });
});
