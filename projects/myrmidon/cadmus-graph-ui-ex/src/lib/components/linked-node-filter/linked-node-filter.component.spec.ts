import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
      expect(component.pageNumber.value).toBe(1);
      expect(component.pageSize.value).toBe(10);
      expect(component.uid.value).toBeNull();
      expect(component.isClass.value).toBeNull();
      expect(component.tag.value).toBeNull();
      expect(component.label.value).toBeNull();
      expect(component.sourceType.value).toBeNull();
      expect(component.sid.value).toBeNull();
      expect(component.isSidPrefix.value).toBe(false);
      expect(component.classes.value).toEqual([]);
      // otherNodeId/predicateId/isObject come from the default filter model
      expect(component.otherNodeId).toBe(0);
      expect(component.predicateId).toBe(0);
      expect(component.isObject).toBe(false);
    });
  });

  describe('updateForm (via filter model effect)', () => {
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
      expect(component.pageNumber.value).toBe(2);
      expect(component.pageSize.value).toBe(20);
      expect(component.uid.value).toBe('uid1');
      expect(component.isClass.value).toBe(true);
      expect(component.tag.value).toBe('tag1');
      expect(component.label.value).toBe('label1');
      expect(component.sourceType.value).toBe(NodeSourceType.Item);
      expect(component.sid.value).toBe('sid1');
      expect(component.isSidPrefix.value).toBe(true);
      expect(component.form.pristine).toBe(true);
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
      expect(component.classes.value).toEqual([cls]);
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
      expect(component.classes.value).toEqual([]);
      expect(component.form.pristine).toBe(true);
    });
  });

  describe('class handling', () => {
    it('onClassAdd should append a class node', () => {
      const node = makeNode(1, { isClass: true });
      component.onClassAdd(node);
      expect(component.classes.value).toEqual([node]);
      expect(component.classes.dirty).toBe(true);
    });

    it('onClassAdd should do nothing when node is falsy', () => {
      component.onClassAdd(null);
      expect(component.classes.value).toEqual([]);
    });

    it('onClassRemove should remove the given class node', () => {
      const n1 = makeNode(1, { isClass: true });
      const n2 = makeNode(2, { isClass: true });
      component.classes.setValue([n1, n2]);
      component.onClassRemove(n1);
      expect(component.classes.value).toEqual([n2]);
    });

    it('onClassRemove should do nothing when the node is not in the list', () => {
      const n1 = makeNode(1, { isClass: true });
      component.classes.setValue([n1]);
      component.onClassRemove(makeNode(99, { isClass: true }));
      expect(component.classes.value).toEqual([n1]);
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
      component.uid.setValue('myuid');
      component.label.setValue('mylabel');
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
      expect(component.form.pristine).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset the form fields and re-emit the filter', () => {
      component.uid.setValue('something');
      component.uid.markAsDirty();

      component.reset();

      expect(component.uid.value).toBeNull();
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

      expect(component.pageNumber.value).toBe(5);
      expect(component.filter().pageNumber).toBe(5);
    });
  });
});
