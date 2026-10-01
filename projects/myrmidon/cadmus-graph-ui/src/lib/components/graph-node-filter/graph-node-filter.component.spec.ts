import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { NodeFilter, NodeSourceType, UriNode } from '@myrmidon/cadmus-api';

import { GraphNodeFilterComponent } from './graph-node-filter.component';
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

describe('GraphNodeFilterComponent', () => {
  let component: GraphNodeFilterComponent;
  let fixture: ComponentFixture<GraphNodeFilterComponent>;
  let filter$: BehaviorSubject<NodeFilter>;
  let linkedNode$: BehaviorSubject<UriNode | undefined>;
  let classNodes$: BehaviorSubject<UriNode[] | undefined>;
  let repository: {
    filter$: BehaviorSubject<NodeFilter>;
    linkedNode$: BehaviorSubject<UriNode | undefined>;
    classNodes$: BehaviorSubject<UriNode[] | undefined>;
    getLinkedNode: ReturnType<typeof vi.fn>;
    getClassNodes: ReturnType<typeof vi.fn>;
    setLinkedNode: ReturnType<typeof vi.fn>;
    setLinkedNodeId: ReturnType<typeof vi.fn>;
    addClassNode: ReturnType<typeof vi.fn>;
    deleteClassNode: ReturnType<typeof vi.fn>;
    setClassNodeIds: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    filter$ = new BehaviorSubject<NodeFilter>({});
    linkedNode$ = new BehaviorSubject<UriNode | undefined>(undefined);
    classNodes$ = new BehaviorSubject<UriNode[] | undefined>([]);
    repository = {
      filter$,
      linkedNode$,
      classNodes$,
      getLinkedNode: vi.fn().mockReturnValue(undefined),
      getClassNodes: vi.fn().mockReturnValue([]),
      setLinkedNode: vi.fn(),
      setLinkedNodeId: vi.fn(),
      addClassNode: vi.fn(),
      deleteClassNode: vi.fn(),
      setClassNodeIds: vi.fn(),
      setFilter: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GraphNodeFilterComponent],
      providers: [
        { provide: NodeListRepository, useValue: repository },
        {
          provide: GraphNodeLookupService,
          // the nested cadmus-refs-lookup components call getName(item)
          // unconditionally (even when item is undefined) to render their
          // button label, so the mock must provide it
          useValue: {
            id: 'graph-node',
            lookup: vi.fn().mockReturnValue(of([])),
            getById: vi.fn(),
            getName: vi.fn().mockReturnValue(''),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphNodeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region draft (via filter$)
  describe('draft (via filter$)', () => {
    it('should populate the form controls from the repository filter', () => {
      filter$.next({
        label: 'lbl',
        uid: 'u1',
        tag: 't1',
        sourceType: NodeSourceType.Item,
        sid: 's1',
        isSidPrefix: true,
        linkedNodeRole: 'O',
      });

      expect(component.form.label().value()).toBe('lbl');
      expect(component.form.uid().value()).toBe('u1');
      expect(component.form.tag().value()).toBe('t1');
      expect(component.form.sourceType().value()).toBe(NodeSourceType.Item);
      expect(component.form.sid().value()).toBe('s1');
      expect(component.form.sidPrefix().value()).toBe(true);
      expect(component.form.linkedNodeRole().value()).toBe('O');
      expect(component.form().dirty()).toBe(false);
    });

    it('should default missing fields to empty/null/false', () => {
      filter$.next({});
      expect(component.form.label().value()).toBe('');
      expect(component.form.uid().value()).toBe('');
      expect(component.form.tag().value()).toBe('');
      expect(component.form.sourceType().value()).toBeNull();
      expect(component.form.sid().value()).toBe('');
      expect(component.form.sidPrefix().value()).toBe(false);
      // linkedNodeRole defaults to 'S' when unset in the filter
      expect(component.form.linkedNodeRole().value()).toBe('S');
    });

    it('should map isClass=true to 1 and isClass=false to 2, and unset to 0', () => {
      filter$.next({ isClass: true });
      expect(component.form.isClass().value()).toBe(1);

      filter$.next({ isClass: false });
      expect(component.form.isClass().value()).toBe(2);

      filter$.next({});
      expect(component.form.isClass().value()).toBe(0);
    });

    it('should forward linkedNodeId and classIds to the repository', () => {
      filter$.next({ linkedNodeId: 5, classIds: [1, 2] });
      expect(repository.setLinkedNodeId).toHaveBeenCalledWith(5);
      expect(repository.setClassNodeIds).toHaveBeenCalledWith([1, 2]);
    });
  });
  //#endregion

  //#region apply / getFilter
  describe('apply', () => {
    it('should build the filter from the form, trimming strings', () => {
      component.form.label().value.set('  lbl  ');
      component.form.uid().value.set('  u1  ');
      component.form.tag().value.set('  t1  ');
      component.form.sid().value.set('  s1  ');
      component.form.sidPrefix().value.set(true);
      component.form.isClass().value.set(1);
      component.form.sourceType().value.set(NodeSourceType.Part);
      component.form.linkedNodeRole().value.set('O');
      repository.getLinkedNode.mockReturnValue(buildUriNode({ id: 9 }));
      repository.getClassNodes.mockReturnValue([
        buildUriNode({ id: 10 }),
        buildUriNode({ id: 11 }),
      ]);

      component.apply();

      expect(repository.setFilter).toHaveBeenCalledWith({
        label: 'lbl',
        isClass: true,
        uid: 'u1',
        tag: 't1',
        sourceType: NodeSourceType.Part,
        sid: 's1',
        isSidPrefix: true,
        linkedNodeId: 9,
        linkedNodeRole: 'O',
        classIds: [10, 11],
      });
    });

    it('should map isClass=2 to false and isClass=0 to undefined', () => {
      component.form.isClass().value.set(2);
      component.apply();
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ isClass: false })
      );

      component.form.isClass().value.set(0);
      component.apply();
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ isClass: undefined })
      );
    });

    it('should map a null sourceType to undefined', () => {
      component.form.sourceType().value.set(null);
      component.apply();
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ sourceType: undefined })
      );
    });
  });

  describe('reset', () => {
    it('should clear the form values and apply an empty filter', () => {
      component.form.label().value.set('hello');
      component.form.isClass().value.set(1);
      component.form.sourceType().value.set(NodeSourceType.Item);
      component.form.sidPrefix().value.set(true);
      component.reset();

      expect(component.form.label().value()).toBe('');
      expect(repository.setFilter).toHaveBeenCalledWith({
        label: undefined,
        isClass: undefined,
        uid: undefined,
        tag: undefined,
        sourceType: undefined,
        sid: undefined,
        isSidPrefix: false,
        linkedNodeId: undefined,
        linkedNodeRole: undefined,
        classIds: [],
      });
    });
  });
  //#endregion

  //#region linked node / class nodes handlers
  it('onResetLinkedNode and clearLinkedNode should clear the linked node', () => {
    component.onResetLinkedNode();
    expect(repository.setLinkedNode).toHaveBeenCalledWith();

    component.clearLinkedNode();
    expect(repository.setLinkedNode).toHaveBeenCalledTimes(2);
  });

  it('onLinkedNodeSet should set the linked node when given one, or undefined otherwise', () => {
    const node = buildUriNode();
    component.onLinkedNodeSet(node);
    expect(repository.setLinkedNode).toHaveBeenCalledWith(node);

    component.onLinkedNodeSet(null);
    expect(repository.setLinkedNode).toHaveBeenCalledWith(undefined);
  });

  it('onClassAdd should add the node only when truthy', () => {
    const node = buildUriNode();
    component.onClassAdd(node);
    expect(repository.addClassNode).toHaveBeenCalledWith(node);

    component.onClassAdd(undefined);
    expect(repository.addClassNode).toHaveBeenCalledTimes(1);
  });

  it('onClassRemove should delete the class node by id', () => {
    component.onClassRemove(7);
    expect(repository.deleteClassNode).toHaveBeenCalledWith(7);
  });
  //#endregion

  it('should unsubscribe from filter$ on destroy', () => {
    const label = component.form.label;
    fixture.destroy();
    repository.setLinkedNodeId.mockClear();
    filter$.next({ label: 'after-destroy', linkedNodeId: 3 });
    expect(label().value()).not.toBe('after-destroy');
    expect(repository.setLinkedNodeId).not.toHaveBeenCalled();
  });

  describe('template', () => {
    function button(tooltip: string): HTMLButtonElement {
      return fixture.nativeElement.querySelector(
        `button[mattooltip="${tooltip}"]`
      );
    }

    it('renders no <form> element; apply is a type=button click', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const apply = button('Apply filters');
      expect(apply.type).toBe('button');
      component.form.label().value.set('x');
      apply.click();
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'x' })
      );
    });

    it('applies when Enter is pressed in a text input, unless disabled', () => {
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input[matinput]');
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'typed' })
      );

      repository.setFilter.mockClear();
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(repository.setFilter).not.toHaveBeenCalled();
    });

    it('rebuilds the draft from the filter after applying', () => {
      component.form.label().value.set('  lbl  ');
      component.apply();
      const applied = repository.setFilter.mock.calls[0][0];
      filter$.next(applied);
      expect(component.form.label().value()).toBe('lbl');
    });
  });

  describe('reset of repository-held filters', () => {
    it('also clears the linked node and the class nodes', () => {
      component.reset();
      expect(repository.setLinkedNode).toHaveBeenCalledWith();
      expect(repository.setClassNodeIds).toHaveBeenCalledWith();
    });
  });
});
