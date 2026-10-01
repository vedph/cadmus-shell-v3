import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import { of, Subject } from 'rxjs';
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
      expect(component.form.pageNumber().value()).toBe(1);
      expect(component.form.pageSize().value()).toBe(10);
      expect(component.form.litPattern().value()).toBe('');
      expect(component.form.litType().value()).toBe('');
      expect(component.form.litLanguage().value()).toBe('');
      expect(component.form.minLitNumber().value()).toBeNull();
      expect(component.form.maxLitNumber().value()).toBeNull();
      expect(component.form.subj().value()).toBeNull();
      expect(component.form.pred().value()).toBeNull();
    });
  });

  describe('draft (via filter model)', () => {
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

      expect(component.form.pageNumber().value()).toBe(2);
      expect(component.form.pageSize().value()).toBe(20);
      expect(component.form.litPattern().value()).toBe('foo');
      expect(component.form.litType().value()).toBe('xsd:string');
      expect(component.form.litLanguage().value()).toBe('en');
      expect(component.form.minLitNumber().value()).toBe(1);
      expect(component.form.maxLitNumber().value()).toBe(10);
      expect(component.form.subj().value()).toEqual(subject);
      expect(component.form.pred().value()).toEqual(predicate);
      expect(component.form().dirty()).toBe(false);
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

      expect(component.form.subj().value()).toEqual(subject);
      expect(component.form.pred().value()).toBeNull();
      expect(component.form().dirty()).toBe(false);
    });

    it('should not fetch nodes and should mark the form pristine when both ids are absent', () => {
      graphService.getNode.mockClear();

      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
      });
      fixture.detectChanges();

      expect(graphService.getNode).not.toHaveBeenCalled();
      expect(component.form.subj().value()).toBeNull();
      expect(component.form.pred().value()).toBeNull();
      expect(component.form().dirty()).toBe(false);
    });
  });

  describe('node term handlers', () => {
    it('onSubjectNodeChange should set the subject term', () => {
      const node = makeNode(1);
      component.onSubjectNodeChange(node);
      expect(component.form.subj().value()).toEqual(node);
    });

    it('onPredicateNodeChange should set the predicate term', () => {
      const node = makeNode(2);
      component.onPredicateNodeChange(node);
      expect(component.form.pred().value()).toEqual(node);
    });
  });

  describe('apply', () => {
    it('should build and emit the filter from term ids and literal fields', () => {
      component.onSubjectNodeChange(makeNode(1));
      component.onPredicateNodeChange(makeNode(2));
      component.form.litPattern().value.set('pattern');
      component.form.litType().value.set('xsd:int');
      component.form.litLanguage().value.set('it');
      component.form.minLitNumber().value.set(2);
      component.form.maxLitNumber().value.set(9);

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
      expect(component.form().dirty()).toBe(false);
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
      component.form.litPattern().value.set('something');
      component.form.litPattern().markAsDirty();

      component.reset();

      expect(component.form.subj().value()).toBeNull();
      expect(component.form.litPattern().value()).toBe('');
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

      expect(component.form.pageNumber().value()).toBe(2);
      expect(component.filter().pageNumber).toBe(2);
    });
  });

  describe('template and echo', () => {
    it('renders no <form> element; apply is a type=button click', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const apply: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[mattooltip="Apply filters"]'
      );
      expect(apply.type).toBe('button');
      component.form.litPattern().value.set('p');
      apply.click();
      expect(component.filter().literalPattern).toBe('p');
    });

    it('applies when Enter is pressed in a text input, unless disabled', () => {
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input[matinput]');
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.filter().literalPattern).toBe('typed');

      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      input.value = 'other';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.filter().literalPattern).toBe('typed');
    });

    it('does not refetch nodes nor reset the draft on the echo of its own apply', () => {
      graphService.getNode.mockImplementation((id: number) => of(makeNode(id)));
      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        subjectId: 1,
      });
      fixture.detectChanges();
      expect(graphService.getNode).toHaveBeenCalledTimes(1);

      component.form.litPattern().value.set('abc');
      component.apply();
      fixture.detectChanges();

      expect(component.filter()).toEqual({
        pageNumber: 1,
        pageSize: 10,
        literalPattern: 'abc',
        subjectId: 1,
      });
      expect(graphService.getNode).toHaveBeenCalledTimes(1);
      expect(component.form.subj().value()?.id).toBe(1);
    });
  });

  describe('reported bugs', () => {
    it('keeps 0 as a min/max literal number', () => {
      component.form.minLitNumber().value.set(0);
      component.form.maxLitNumber().value.set(0);
      component.apply();
      expect(component.filter().minLiteralNumber).toBe(0);
      expect(component.filter().maxLiteralNumber).toBe(0);
    });

    it('shows the subject and predicate loaded from the filter in the lookups', () => {
      graphService.getNode.mockImplementation((id: number) => of(makeNode(id)));
      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        subjectId: 1,
        predicateId: 2,
      });
      fixture.detectChanges();
      const lookups = fixture.debugElement
        .queryAll(By.directive(RefLookupComponent))
        .map((d) => d.componentInstance.item()?.id);
      expect(lookups).toEqual([1, 2]);
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
