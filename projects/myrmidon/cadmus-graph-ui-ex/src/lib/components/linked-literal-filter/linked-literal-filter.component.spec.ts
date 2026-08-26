import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { GraphService, NodeSourceType, UriNode } from '@myrmidon/cadmus-api';
import { GraphNodeLookupService } from '@myrmidon/cadmus-graph-ui';

import { LinkedLiteralFilterComponent } from './linked-literal-filter.component';
import { PagedLinkedLiteralFilter } from '../../graph-walker';

function makeNode(id: number, overrides?: Partial<UriNode>): UriNode {
  return {
    id,
    uri: `x:node${id}`,
    label: `Node ${id}`,
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

describe('LinkedLiteralFilterComponent', () => {
  let component: LinkedLiteralFilterComponent;
  let fixture: ComponentFixture<LinkedLiteralFilterComponent>;
  let graphService: { getNode: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    graphService = {
      getNode: vi.fn().mockReturnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [LinkedLiteralFilterComponent],
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
        { provide: GraphService, useValue: graphService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkedLiteralFilterComponent);
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
      expect(component.pred.value).toBeNull();
    });
  });

  describe('updateForm (via filter model effect)', () => {
    it('should populate scalar fields and resolve subject/predicate nodes', () => {
      const subject = makeNode(1);
      const predicate = makeNode(2);
      graphService.getNode.mockImplementation((id: number) =>
        id === 1 ? of(subject) : of(predicate)
      );

      const filter: PagedLinkedLiteralFilter = {
        pageNumber: 2,
        pageSize: 20,
        subjectId: 1,
        predicateId: 2,
        literalPattern: 'foo',
        literalType: 'xsd:string',
        literalLanguage: 'en',
        minLiteralNumber: 1,
        maxLiteralNumber: 10,
      };
      fixture.componentRef.setInput('filter', filter);
      fixture.detectChanges();

      expect(component.pageNumber.value).toBe(2);
      expect(component.pageSize.value).toBe(20);
      expect(component.litPattern.value).toBe('foo');
      expect(component.litType.value).toBe('xsd:string');
      expect(component.litLanguage.value).toBe('en');
      expect(component.minLitNumber.value).toBe(1);
      expect(component.maxLitNumber.value).toBe(10);
      expect(component.subj.value).toEqual(subject);
      expect(component.pred.value).toEqual(predicate);
      expect(component.form.pristine).toBe(true);
    });

    it('should still resolve subject and mark the form pristine when predicateId is absent', () => {
      // regression test for a bug where the forkJoin's "p" branch used
      // from([]) (an observable that completes without emitting) when
      // predicateId was falsy; since forkJoin only emits once ALL its
      // sources have emitted, this meant the whole subscribe callback -
      // including the subj assignment and markAsPristine() - silently
      // never ran whenever predicateId was missing, even though
      // subjectId was resolved successfully.
      const subject = makeNode(1);
      graphService.getNode.mockReturnValue(of(subject));

      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        subjectId: 1,
      });
      fixture.detectChanges();

      expect(component.subj.value).toEqual(subject);
      expect(component.pred.value).toBeNull();
      expect(component.form.pristine).toBe(true);
    });

    it('should not fetch nodes and should mark the form pristine when both ids are absent', () => {
      graphService.getNode.mockClear();

      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
      });
      fixture.detectChanges();

      expect(graphService.getNode).not.toHaveBeenCalled();
      expect(component.subj.value).toBeNull();
      expect(component.pred.value).toBeNull();
      expect(component.form.pristine).toBe(true);
    });
  });

  describe('node term handlers', () => {
    it('onSubjectNodeChange should set the subject term', () => {
      const node = makeNode(1);
      component.onSubjectNodeChange(node);
      expect(component.subj.value).toEqual(node);
    });

    it('onPredicateNodeChange should set the predicate term', () => {
      const node = makeNode(2);
      component.onPredicateNodeChange(node);
      expect(component.pred.value).toEqual(node);
    });
  });

  describe('apply', () => {
    it('should build and emit the filter from term ids and literal fields', () => {
      component.onSubjectNodeChange(makeNode(1));
      component.onPredicateNodeChange(makeNode(2));
      component.litPattern.setValue('pattern');
      component.litType.setValue('xsd:int');
      component.litLanguage.setValue('it');
      component.minLitNumber.setValue(2);
      component.maxLitNumber.setValue(9);

      component.apply();

      expect(component.filter()).toEqual({
        pageNumber: 1,
        pageSize: 10,
        literalPattern: 'pattern',
        literalType: 'xsd:int',
        literalLanguage: 'it',
        minLiteralNumber: 2,
        maxLiteralNumber: 9,
        subjectId: 1,
        predicateId: 2,
      });
      expect(component.form.pristine).toBe(true);
    });

    it('should emit undefined subjectId/predicateId when no terms were selected', () => {
      component.apply();

      expect(component.filter().subjectId).toBeUndefined();
      expect(component.filter().predicateId).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset the form (including subject/predicate terms) and re-emit the filter', () => {
      component.onSubjectNodeChange(makeNode(1));
      component.litPattern.setValue('something');
      component.litPattern.markAsDirty();

      component.reset();

      expect(component.subj.value).toBeNull();
      expect(component.litPattern.value).toBeNull();
      expect(component.filter().subjectId).toBeUndefined();
      expect(component.filter().literalPattern).toBeUndefined();
    });
  });

  describe('onPageChange', () => {
    it('should update pageNumber and emit the filter', () => {
      component.onPageChange({
        pageIndex: 1,
        pageSize: 10,
        length: 100,
      });

      expect(component.pageNumber.value).toBe(2);
      expect(component.filter().pageNumber).toBe(2);
    });
  });
});
