import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { GraphService, NodeSourceType, UriNode } from '@myrmidon/cadmus-api';
import { GraphNodeLookupService } from '@myrmidon/cadmus-graph-ui';

import { LinkedNodeFilterComponent } from './linked-node-filter.component';
import { PagedLinkedNodeFilter } from '../../graph-walker';

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

describe('LinkedNodeFilterComponent', () => {
  let component: LinkedNodeFilterComponent;
  let fixture: ComponentFixture<LinkedNodeFilterComponent>;
  let graphService: { getNodeSet: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    graphService = {
      getNodeSet: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [LinkedNodeFilterComponent],
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

    fixture = TestBed.createComponent(LinkedNodeFilterComponent);
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
      expect(component.form.uid().value()).toBe('');
      expect(component.form.isClass().value()).toBeNull();
      expect(component.form.tag().value()).toBe('');
      expect(component.form.label().value()).toBe('');
      expect(component.form.sourceType().value()).toBeNull();
      expect(component.form.sid().value()).toBe('');
      expect(component.form.isSidPrefix().value()).toBe(false);
      expect(json(component.form.classes().value())).toEqual(json([]));
      // otherNodeId/predicateId/isObject come from the default filter model
      expect(component.otherNodeId).toBe(0);
      expect(component.predicateId).toBe(0);
      expect(component.isObject).toBe(false);
    });
  });

  describe('draft (via filter model)', () => {
    it('should populate scalar fields and the out-of-form otherNodeId/predicateId/isObject', () => {
      const filter: PagedLinkedNodeFilter = {
        pageNumber: 2,
        pageSize: 20,
        otherNodeId: 5,
        predicateId: 7,
        isObject: true,
        uid: 'uid1',
        isClass: true,
        tag: 'tag1',
        label: 'label1',
        sourceType: NodeSourceType.Item,
        sid: 'sid1',
        isSidPrefix: true,
      };
      fixture.componentRef.setInput('filter', filter);
      fixture.detectChanges();

      expect(component.otherNodeId).toBe(5);
      expect(component.predicateId).toBe(7);
      expect(component.isObject).toBe(true);
      expect(component.form.pageNumber().value()).toBe(2);
      expect(component.form.pageSize().value()).toBe(20);
      expect(component.form.uid().value()).toBe('uid1');
      expect(component.form.isClass().value()).toBe(true);
      expect(component.form.tag().value()).toBe('tag1');
      expect(component.form.label().value()).toBe('label1');
      expect(component.form.sourceType().value()).toBe(NodeSourceType.Item);
      expect(component.form.sid().value()).toBe('sid1');
      expect(component.form.isSidPrefix().value()).toBe(true);
      expect(component.form().dirty()).toBe(false);
    });

    it('should resolve class nodes when classIds is non-empty', () => {
      const cls = makeNode(9, { isClass: true });
      graphService.getNodeSet.mockReturnValue(of([cls]));

      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        otherNodeId: 0,
        predicateId: 0,
        classIds: [9],
      });
      fixture.detectChanges();

      expect(graphService.getNodeSet).toHaveBeenCalledWith([9]);
      // the draft holds copies: the service's own object stays untouched
      expect(Object.getOwnPropertySymbols(cls).length).toBe(0);
      expect(json(component.form.classes().value())).toEqual(json([cls]));
    });

    it('should clear classes and stay pristine when classIds is empty', () => {
      graphService.getNodeSet.mockClear();

      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        otherNodeId: 0,
        predicateId: 0,
      });
      fixture.detectChanges();

      expect(graphService.getNodeSet).not.toHaveBeenCalled();
      expect(json(component.form.classes().value())).toEqual(json([]));
      expect(component.form().dirty()).toBe(false);
    });
  });

  describe('class handling', () => {
    it('onClassAdd should append a class node', () => {
      const node = makeNode(1, { isClass: true });
      component.onClassAdd(node);
      expect(json(component.form.classes().value())).toEqual(json([node]));
      expect(component.form.classes().dirty()).toBe(true);
    });

    it('onClassAdd should do nothing when node is falsy', () => {
      component.onClassAdd(null);
      expect(json(component.form.classes().value())).toEqual(json([]));
    });

    it('onClassRemove should remove the given class node', () => {
      const n1 = makeNode(1, { isClass: true });
      const n2 = makeNode(2, { isClass: true });
      component.form.classes().value.set([n1, n2]);
      component.onClassRemove(n1);
      expect(json(component.form.classes().value())).toEqual(json([n2]));
    });

    it('onClassRemove should do nothing when the node is not in the list', () => {
      const n1 = makeNode(1, { isClass: true });
      component.form.classes().value.set([n1]);
      component.onClassRemove(makeNode(99, { isClass: true }));
      expect(json(component.form.classes().value())).toEqual(json([n1]));
    });
  });

  describe('apply', () => {
    it('should build and emit the filter from the form, preserving otherNodeId/predicateId/isObject', () => {
      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        otherNodeId: 42,
        predicateId: 3,
        isObject: true,
      });
      fixture.detectChanges();

      // note: the component does not trim uid/label values.
      component.form.uid().value.set('myuid');
      component.form.label().value.set('mylabel');
      component.onClassAdd(makeNode(1, { isClass: true }));

      component.apply();

      expect(component.filter()).toEqual({
        pageNumber: 1,
        pageSize: 10,
        uid: 'myuid',
        isClass: undefined,
        tag: undefined,
        label: 'mylabel',
        sourceType: undefined,
        sid: undefined,
        isSidPrefix: undefined,
        classIds: [1],
        otherNodeId: 42,
        predicateId: 3,
        isObject: true,
      });
      expect(component.form().dirty()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset the form fields and re-emit the filter', () => {
      component.form.uid().value.set('something');
      component.form.uid().markAsDirty();

      component.reset();

      expect(component.form.uid().value()).toBe('');
      expect(component.filter().uid).toBeUndefined();
    });

    it('should keep otherNodeId/predicateId/isObject unchanged on reset (they are outside the form)', () => {
      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        otherNodeId: 42,
        predicateId: 3,
        isObject: true,
      });
      fixture.detectChanges();

      component.reset();

      // reset() only calls form.reset(), so these plain fields (set by the
      // last updateForm call) are preserved rather than cleared - this is
      // the intended behavior since they identify the context node/predicate
      // this filter is scoped to, not a user-editable filter criterion.
      expect(component.filter().otherNodeId).toBe(42);
      expect(component.filter().predicateId).toBe(3);
      expect(component.filter().isObject).toBe(true);
    });
  });

  describe('onPageChange', () => {
    it('should update pageNumber and emit the filter', () => {
      component.onPageChange({
        pageIndex: 4,
        pageSize: 10,
        length: 100,
      });

      expect(component.form.pageNumber().value()).toBe(5);
      expect(component.filter().pageNumber).toBe(5);
    });
  });

  describe('template and echo', () => {
    it('renders no <form> element; apply is a type=button click', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const apply: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[mattooltip="Apply filters"]'
      );
      expect(apply.type).toBe('button');
      component.form.label().value.set('x');
      apply.click();
      expect(component.filter().label).toBe('x');
    });

    it('applies when Enter is pressed in a text input, unless disabled', () => {
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input[matinput]');
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.filter().label).toBe('typed');

      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      input.value = 'other';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.filter().label).toBe('typed');
    });

    it('does not refetch classes nor reset the draft on the echo of its own apply', () => {
      graphService.getNodeSet.mockReturnValue(
        of([makeNode(9, { isClass: true })])
      );
      fixture.componentRef.setInput('filter', {
        pageNumber: 1,
        pageSize: 10,
        otherNodeId: 1,
        predicateId: 2,
        isObject: false,
        classIds: [9],
      });
      fixture.detectChanges();
      expect(graphService.getNodeSet).toHaveBeenCalledTimes(1);

      component.form.tag().value.set('t');
      component.apply();
      fixture.detectChanges();

      expect(component.filter().tag).toBe('t');
      expect(component.filter().classIds).toEqual([9]);
      expect(graphService.getNodeSet).toHaveBeenCalledTimes(1);
      expect(component.form.classes().value().length).toBe(1);
    });

    it('does not tag the lookup node objects it adds', () => {
      const node = makeNode(1, { isClass: true });
      component.onClassAdd(node);
      fixture.detectChanges();
      expect(Object.getOwnPropertySymbols(node).length).toBe(0);
    });
  });

  describe('reported bugs', () => {
    const base = { pageNumber: 1, pageSize: 10, otherNodeId: 1, predicateId: 2 };

    it('sends "not-class" as isClass false and "(any)" as undefined', () => {
      component.form.isClass().value.set(false);
      component.apply();
      expect(component.filter().isClass).toBe(false);
      component.form.isClass().value.set(null);
      component.apply();
      expect(component.filter().isClass).toBeUndefined();
    });

    it('keeps a bound isClass false', () => {
      fixture.componentRef.setInput('filter', { ...base, isClass: false });
      fixture.detectChanges();
      expect(component.form.isClass().value()).toBe(false);
    });

    it('keeps the "user" (0) source type', () => {
      component.form.sourceType().value.set(0 as NodeSourceType);
      component.apply();
      expect(component.filter().sourceType).toBe(0);
      fixture.componentRef.setInput('filter', { ...base, sourceType: 0 });
      fixture.detectChanges();
      expect(component.form.sourceType().value()).toBe(0);
    });

    it('passes the total count to the paginator', () => {
      fixture.componentRef.setInput('hasPager', true);
      fixture.componentRef.setInput('total', 42);
      fixture.detectChanges();
      const pager = fixture.debugElement.query(By.directive(MatPaginator));
      expect(pager.componentInstance.length).toBe(42);
    });

    it('ignores class nodes loaded for a filter no longer bound', () => {
      const late = new Subject<(UriNode | undefined)[]>();
      graphService.getNodeSet.mockImplementation((ids: number[]) =>
        ids[0] === 1 ? late : of([makeNode(9, { isClass: true })])
      );
      fixture.componentRef.setInput('filter', { ...base, classIds: [1] });
      fixture.detectChanges();
      fixture.componentRef.setInput('filter', { ...base, classIds: [9] });
      fixture.detectChanges();
      late.next([makeNode(1, { isClass: true })]);
      expect(component.form.classes().value().map((n) => n.id)).toEqual([9]);
    });
  });
});
