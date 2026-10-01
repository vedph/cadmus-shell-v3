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
      expect(component.form.literal().value()).toBe(false);
      expect(component.form.objectLit().value()).toBe('');
      expect(component.form.sid().value()).toBe('');
      expect(component.form.sidPrefix().value()).toBe(false);
      expect(component.form.tag().value()).toBe('');
    });
  });

  describe('draft (via filter$)', () => {
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
      expect(component.form.literal().value()).toBe(true);
      expect(component.form.objectLit().value()).toBe('foo');
      expect(component.form.sid().value()).toBe('sid1');
      expect(component.form.tag().value()).toBe('tag1');
      expect(component.form().dirty()).toBe(false);
    });

    it('should pass null predicate id when predicateIds is empty', () => {
      repository.setTermId.mockClear();

      repository.filter$.next({});

      expect(repository.setTermId).toHaveBeenCalledWith(undefined, 'S');
      expect(repository.setTermId).toHaveBeenCalledWith(null, 'P');
      expect(repository.setTermId).toHaveBeenCalledWith(undefined, 'O');
      expect(component.form.literal().value()).toBe(false);
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
      component.form.objectLit().value.set('a'.repeat(101));
      expect(component.form().invalid()).toBe(true);

      component.apply();

      expect(repository.setFilter).not.toHaveBeenCalled();
    });

    it('should build and set the filter from term ids and literal fields', () => {
      component.onSubjectNodeChange(makeNode(1));
      component.onPredicateNodeChange(makeNode(2));
      component.form.sid().value.set('  mysid  ');
      component.form.tag().value.set('  mytag  ');

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
      component.form.literal().value.set(false);

      component.apply();

      const arg = repository.setFilter.mock.calls.at(-1)![0] as TripleFilter;
      expect(arg.objectId).toBe(3);
      expect(arg.literalPattern).toBeUndefined();
    });

    it('should use literalPattern (not object term id) when literal is true', () => {
      component.onObjectNodeChange(makeNode(3));
      component.form.literal().value.set(true);
      component.form.objectLit().value.set(' hello ');

      component.apply();

      const arg = repository.setFilter.mock.calls.at(-1)![0] as TripleFilter;
      expect(arg.objectId).toBeUndefined();
      expect(arg.literalPattern).toBe('hello');
    });
  });

  describe('reset', () => {
    it('should reset the form and re-apply the (now empty) filter', () => {
      component.form.sid().value.set('something');
      component.form.sid().markAsDirty();

      component.reset();

      expect(component.form.sid().value()).toBe('');
      expect(repository.setFilter).toHaveBeenCalledWith({
        subjectId: undefined,
        predicateIds: undefined,
        objectId: undefined,
        literalPattern: undefined,
        sid: undefined,
        tag: undefined,
      });
    });

    it('should clear previously selected subject/predicate/object terms', () => {
      component.onSubjectNodeChange(makeNode(1));

      component.reset();

      const arg = repository.setFilter.mock.calls.at(-1)![0] as TripleFilter;
      expect(arg.subjectId).toBeUndefined();
    });
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
      component.form.sid().value.set('s');
      apply.click();
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ sid: 's' })
      );
    });

    it('renders the length limits as maxlength attributes', () => {
      component.form.literal().value.set(true);
      fixture.detectChanges();
      const inputs: HTMLInputElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('input[matinput]')
      );
      // objectLit, sid, tag
      expect(inputs.map((i) => i.maxLength)).toEqual([100, 500, 50]);
    });

    it('applies when Enter is pressed in a text input, unless disabled', () => {
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input[matinput]');
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ sid: 'typed' })
      );

      repository.setFilter.mockClear();
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(repository.setFilter).not.toHaveBeenCalled();
    });

    it('should stop listening to filter$ on destroy', () => {
      fixture.destroy();
      repository.setTermId.mockClear();
      repository.filter$.next({ subjectId: 5 });
      expect(repository.setTermId).not.toHaveBeenCalled();
    });
  });

  describe('tag and disabled', () => {
    it('lets the user filter by tag', () => {
      const inputs: HTMLInputElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('input[matinput]')
      );
      const tag = inputs[inputs.length - 1];
      tag.value = ' mytag ';
      tag.dispatchEvent(new Event('input'));
      tag.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(repository.setFilter).toHaveBeenCalledWith(
        expect.objectContaining({ tag: 'mytag' })
      );
    });

    it('renders no disabled attribute while enabled', () => {
      const root: HTMLElement = fixture.nativeElement.firstElementChild;
      expect(root.hasAttribute('disabled')).toBe(false);
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      expect(root.getAttribute('disabled')).toBe('true');
    });
  });
});
