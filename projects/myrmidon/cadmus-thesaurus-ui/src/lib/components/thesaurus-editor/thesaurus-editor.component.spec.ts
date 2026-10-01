import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { ThesaurusEditorComponent } from './thesaurus-editor.component';
import { ThesaurusNodesService, ThesaurusNode } from '../../services/thesaurus-nodes.service';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { ThesaurusNodeListRepository } from '../../state/thesaurus-node-list.repository';
import { Thesaurus } from '@myrmidon/cadmus-core';

function makeThesaurus(overrides?: Partial<Thesaurus>): Thesaurus {
  return {
    id: 'colors@en',
    entries: [
      { id: 'r', value: 'red' },
      { id: 'g', value: 'green' },
    ],
    ...overrides,
  };
}

function makeNode(overrides?: Partial<ThesaurusNode>): ThesaurusNode {
  return { id: 'n1', value: 'V1', level: 1, ordinal: 1, ...overrides };
}

describe('ThesaurusEditorComponent', () => {
  let component: ThesaurusEditorComponent;
  let fixture: ComponentFixture<ThesaurusEditorComponent>;
  let nodesService: {
    add: ReturnType<typeof vi.fn>;
    toggleAll: ReturnType<typeof vi.fn>;
    moveUp: ReturnType<typeof vi.fn>;
    moveDown: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    importEntries: ReturnType<typeof vi.fn>;
    getNodes: ReturnType<typeof vi.fn>;
    selectParentIds: ReturnType<typeof vi.fn>;
    selectNodes: ReturnType<typeof vi.fn>;
  };
  let nodes$: BehaviorSubject<ThesaurusNode[]>;
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let repository: {
    loading$: Subject<any>;
    filter$: Subject<any>;
    page$: Subject<any>;
    reset: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
    setPage: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    nodes$ = new BehaviorSubject<ThesaurusNode[]>([]);
    nodesService = {
      add: vi.fn(),
      toggleAll: vi.fn(),
      moveUp: vi.fn(),
      moveDown: vi.fn(),
      delete: vi.fn(),
      importEntries: vi.fn(),
      getNodes: vi.fn().mockReturnValue([]),
      selectParentIds: vi.fn().mockReturnValue(of([])),
      selectNodes: vi.fn().mockReturnValue(nodes$),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    repository = {
      loading$: new Subject(),
      filter$: new Subject(),
      page$: new Subject(),
      reset: vi.fn(),
      setFilter: vi.fn(),
      setPage: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ThesaurusEditorComponent],
      providers: [
        { provide: ThesaurusNodesService, useValue: nodesService },
        { provide: DialogService, useValue: dialogService },
        { provide: ThesaurusNodeListRepository, useValue: repository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThesaurusEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('updateForm (via the thesaurus model effect)', () => {
    it('should populate the form and import entries as non-flat by default', () => {
      fixture.componentRef.setInput('thesaurus', makeThesaurus());
      fixture.detectChanges();

      expect(component.form.id().value()).toBe('colors@en');
      expect(component.form.alias().value()).toBe(false);
      expect(nodesService.importEntries).toHaveBeenCalledWith(
        [
          { id: 'r', value: 'red' },
          { id: 'g', value: 'green' },
        ],
        false
      );
    });

    it('should import model-types@ thesauri as flat', () => {
      fixture.componentRef.setInput(
        'thesaurus',
        makeThesaurus({ id: 'model-types@en' })
      );
      fixture.detectChanges();

      expect(nodesService.importEntries).toHaveBeenCalledWith(
        expect.anything(),
        true
      );
    });

    it('should set alias=true and populate targetId for an alias thesaurus', () => {
      fixture.componentRef.setInput(
        'thesaurus',
        makeThesaurus({ id: 'alias@en', targetId: 'colors', entries: undefined })
      );
      fixture.detectChanges();

      expect(component.form.alias().value()).toBe(true);
      expect(component.form.targetId().value()).toBe('colors');
    });

    it('should reset the form when the thesaurus becomes undefined', () => {
      fixture.componentRef.setInput('thesaurus', makeThesaurus());
      fixture.detectChanges();
      fixture.componentRef.setInput('thesaurus', undefined);
      fixture.detectChanges();

      expect(component.form.id().value()).toBe('');
    });
  });

  describe('validators toggle with alias', () => {
    it('should require targetId and not entries when alias is true', () => {
      component.form.alias().value.set(true);
      expect(component.form.targetId().getError('required')).toBeTruthy();
      expect(component.form().getError('noEntries')).toBeFalsy();
    });

    it('should require entries and not targetId when alias is false', () => {
      component.form.alias().value.set(true);
      component.form.alias().value.set(false);
      expect(component.form().getError('noEntries')).toBeTruthy();
      expect(component.form.targetId().getError('required')).toBeFalsy();
    });
  });

  describe('onTargetIdChange', () => {
    it('should set the targetId control', () => {
      component.onTargetIdChange('new-target');
      expect(component.form.targetId().value()).toBe('new-target');
    });
  });

  describe('onPageChange', () => {
    it('should forward as a 1-based page number', () => {
      component.onPageChange({ pageIndex: 1, pageSize: 10 } as any);
      expect(repository.setPage).toHaveBeenCalledWith(2, 10);
    });
  });

  describe('applyFilter', () => {
    it('should map empty filter values to undefined', () => {
      component.filterForm.idOrValue().value.set('');
      component.filterForm.parentId().value.set('');
      component.applyFilter();
      expect(repository.setFilter).toHaveBeenCalledWith({
        idOrValue: undefined,
        parentId: undefined,
      });
    });

    it('should pass through non-empty filter values', () => {
      component.filterForm.idOrValue().value.set('red');
      component.filterForm.parentId().value.set('colors');
      component.applyFilter();
      expect(repository.setFilter).toHaveBeenCalledWith({
        idOrValue: 'red',
        parentId: 'colors',
      });
    });
  });

  describe('addNode', () => {
    it('should add the node and reset the repository', () => {
      const node = makeNode();
      component.addNode(node);
      expect(nodesService.add).toHaveBeenCalledWith(node);
      expect(repository.reset).toHaveBeenCalled();
    });
  });

  describe('expandAll / collapseAll', () => {
    it('expandAll should call toggleAll(false)', () => {
      component.expandAll();
      expect(nodesService.toggleAll).toHaveBeenCalledWith(false);
      expect(repository.reset).toHaveBeenCalled();
    });

    it('collapseAll should call toggleAll(true)', () => {
      component.collapseAll();
      expect(nodesService.toggleAll).toHaveBeenCalledWith(true);
      expect(repository.reset).toHaveBeenCalled();
    });
  });

  describe('onRequest', () => {
    it('expand: should add with collapsed=false', () => {
      const node = makeNode({ collapsed: true });
      component.onRequest({ id: 'expand', payload: node });
      expect(nodesService.add).toHaveBeenCalledWith({ ...node, collapsed: false });
    });

    it('collapse: should add with collapsed=true', () => {
      const node = makeNode();
      component.onRequest({ id: 'collapse', payload: node });
      expect(nodesService.add).toHaveBeenCalledWith({ ...node, collapsed: true });
    });

    it('move-up: should delegate to moveUp', () => {
      const node = makeNode({ id: 'x1' });
      component.onRequest({ id: 'move-up', payload: node });
      expect(nodesService.moveUp).toHaveBeenCalledWith('x1');
    });

    it('move-down: should delegate to moveDown', () => {
      const node = makeNode({ id: 'x1' });
      component.onRequest({ id: 'move-down', payload: node });
      expect(nodesService.moveDown).toHaveBeenCalledWith('x1');
    });

    it('delete: should confirm then delete', () => {
      const node = makeNode({ id: 'x1' });
      component.onRequest({ id: 'delete', payload: node });
      expect(dialogService.confirm).toHaveBeenCalled();
      expect(nodesService.delete).toHaveBeenCalledWith('x1');
    });

    it('delete: should not delete when the user cancels', () => {
      dialogService.confirm.mockReturnValue(of(false));
      component.onRequest({ id: 'delete', payload: makeNode() });
      expect(nodesService.delete).not.toHaveBeenCalled();
    });

    it('add-sibling: should add a blank sibling after the current node', () => {
      const node = makeNode({ level: 2, ordinal: 3, parentId: 'p1' });
      component.onRequest({ id: 'add-sibling', payload: node });
      expect(nodesService.add).toHaveBeenCalledWith({
        id: '',
        value: '',
        level: 2,
        ordinal: 4,
        parentId: 'p1',
      });
    });

    it('add-child: should add a blank child one level deeper', () => {
      const node = makeNode({ id: 'parent1', level: 1 });
      component.onRequest({ id: 'add-child', payload: node });
      expect(nodesService.add).toHaveBeenCalledWith({
        id: '',
        value: '',
        level: 2,
        ordinal: 0,
        parentId: 'parent1',
      });
    });

    it('add-child: should also expand the parent if it was collapsed', () => {
      const node = makeNode({ id: 'parent1', level: 1, collapsed: true });
      component.onRequest({ id: 'add-child', payload: node });
      expect(nodesService.add).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'parent1', collapsed: false })
      );
    });

    it('add-child: should not touch the parent when it was not collapsed', () => {
      const node = makeNode({ id: 'parent1', level: 1, collapsed: false });
      component.onRequest({ id: 'add-child', payload: node });
      // only the new child add() call, not a 2nd add() for the parent
      expect(nodesService.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('appendNode', () => {
    it('should add a blank top-level node and reset', () => {
      component.appendNode();
      expect(nodesService.add).toHaveBeenCalledWith({
        id: '',
        value: '',
        level: 1,
        ordinal: 1,
      });
      expect(repository.reset).toHaveBeenCalled();
    });
  });

  describe('close / save', () => {
    it('should emit editorClose on close()', () => {
      const spy = vi.fn();
      component.editorClose.subscribe(spy);
      component.close();
      expect(spy).toHaveBeenCalled();
    });

    it('should not save when the form is invalid', () => {
      component.save();
      expect(component.thesaurus()).toBeUndefined();
    });

    it('should save a non-alias thesaurus built from the current nodes', () => {
      component.form.id().value.set('colors@en');
      component.form.alias().value.set(false);
      nodes$.next([makeNode({ id: 'r', value: 'red' })]);
      nodesService.getNodes.mockReturnValue([
        { id: 'r', value: 'red', level: 1, ordinal: 1 },
      ]);

      component.save();

      expect(component.thesaurus()).toEqual({
        id: 'colors@en',
        language: 'en',
        entries: [{ id: 'r', value: 'red' }],
      });
    });

    it('should save an alias thesaurus with a targetId and no entries', () => {
      component.form.id().value.set('alias@en');
      component.form.alias().value.set(true);
      // targetId is validated against THES_ID_PATTERN, same shape as a
      // thesaurus id (id@lang) - a bare id like 'colors' is invalid here
      component.form.targetId().value.set('colors@en');

      component.save();

      const saved = component.thesaurus();
      expect(saved!.targetId).toBe('colors@en');
      expect(saved!.entries).toEqual([]);
    });
  });

  describe('signal form', () => {
    it('requires a valid target ID only for aliases, and entries otherwise', () => {
      fixture.componentRef.setInput('thesaurus', makeThesaurus());
      fixture.detectChanges();
      component.form.alias().value.set(true);
      expect(component.form.targetId().getError('required')).toBeTruthy();
      expect(component.form().getError('noEntries')).toBeFalsy();

      component.form.alias().value.set(false);
      expect(component.form.targetId().valid()).toBe(true);
      nodes$.next([]);
      expect(component.form().getError('noEntries')).toBeTruthy();
    });

    it('renders no <form>, not even nested for the filters', () => {
      fixture.componentRef.setInput('thesaurus', makeThesaurus());
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('applies the filter on Enter in its text box, and on click', () => {
      fixture.componentRef.setInput('thesaurus', makeThesaurus());
      fixture.detectChanges();
      const input: HTMLInputElement = Array.from<HTMLInputElement>(
        fixture.nativeElement.querySelectorAll('input[matinput]')
      )[1];
      input.value = 'x';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(repository.setFilter).toHaveBeenLastCalledWith({
        idOrValue: 'x',
        parentId: undefined,
      });
      expect(component.thesaurus()?.id).toBe(makeThesaurus().id);

      repository.setFilter.mockClear();
      const apply: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[mattooltip="Apply filters"]'
      );
      expect(apply.type).toBe('button');
      apply.click();
      expect(repository.setFilter).toHaveBeenCalled();
    });

    it('re-imports the entries also on the echo of its own save', () => {
      fixture.componentRef.setInput('thesaurus', makeThesaurus());
      fixture.detectChanges();
      // as the real service does on import
      nodes$.next([makeNode({ id: 'r', value: 'red' })]);
      nodesService.importEntries.mockClear();
      component.save();
      fixture.detectChanges();
      expect(nodesService.importEntries).toHaveBeenCalledTimes(1);
    });
  });

  describe('entries of a new thesaurus', () => {
    it('becomes valid once a node is added', () => {
      fixture.componentRef.setInput('thesaurus', { id: 'new@en', entries: [] });
      fixture.detectChanges();
      expect(component.form().valid()).toBe(false);

      nodes$.next([makeNode({ id: 'n1', value: 'one' })]);
      fixture.detectChanges();

      expect(component.form().valid()).toBe(true);
    });

    it('becomes invalid again when its last node is deleted', () => {
      fixture.componentRef.setInput('thesaurus', makeThesaurus());
      nodes$.next([makeNode({ id: 'n1', value: 'one' })]);
      fixture.detectChanges();
      expect(component.form().valid()).toBe(true);

      nodes$.next([]);
      fixture.detectChanges();
      expect(component.form().valid()).toBe(false);
    });
  });
});
