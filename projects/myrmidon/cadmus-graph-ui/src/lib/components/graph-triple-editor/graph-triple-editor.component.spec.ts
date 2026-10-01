import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError, Subject } from 'rxjs';
import { vi } from 'vitest';

import { GraphService, NodeSourceType, UriNode, UriTriple } from '@myrmidon/cadmus-api';

import { GraphTripleEditorComponent } from './graph-triple-editor.component';

function makeNode(id: number, overrides?: Partial<UriNode>): UriNode {
  return {
    id,
    uri: `x:node${id}`,
    label: `Node ${id}`,
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('GraphTripleEditorComponent', () => {
  let component: GraphTripleEditorComponent;
  let fixture: ComponentFixture<GraphTripleEditorComponent>;
  let graphService: { getNode: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    graphService = {
      getNode: vi.fn().mockReturnValue(of(makeNode(1))),
    };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GraphTripleEditorComponent],
      providers: [
        { provide: GraphService, useValue: graphService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphTripleEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial form state', () => {
    it('should default to a new literal triple with an invalid form', () => {
      expect(component.isNew()).toBe(true);
      expect(component.form.isLiteral().value()).toBe(true);
      expect(component.form.subjectNode().value()).toBeNull();
      expect(component.form.predicateNode().value()).toBeNull();
      // subject, predicate and literal (required by default) are all unset
      expect(component.form().invalid()).toBe(true);
    });

    it('should not require objectNode while isLiteral is true', () => {
      // isLiteral true => the objectNode required rule does not apply
      expect(component.form.objectNode().valid()).toBe(true);
    });
  });

  describe('populate from triple input', () => {
    it('should load subject/predicate nodes and mark the triple as existing', async () => {
      const subject = makeNode(1, { label: 'Subject' });
      const predicate = makeNode(2, { label: 'Predicate' });
      graphService.getNode.mockImplementation((id: number) => {
        if (id === 1) return of(subject);
        if (id === 2) return of(predicate);
        return of(makeNode(id));
      });
      const triple: UriTriple = {
        id: 42,
        subjectId: 1,
        predicateId: 2,
        objectLiteral: 'hello',
        subjectUri: 'x:1',
        predicateUri: 'x:2',
      };

      fixture.componentRef.setInput('triple', triple);
      fixture.detectChanges();
      await flush();
      fixture.detectChanges();

      expect(component.form.subjectNode().value()).toEqual(subject);
      expect(component.form.predicateNode().value()).toEqual(predicate);
      expect(component.form.isLiteral().value()).toBe(true);
      expect(component.form.literal().value()).toBe('hello');
      expect(component.isNew()).toBe(false);
    });

    it('should switch to non-literal mode and load the object node when objectId is set', async () => {
      const obj = makeNode(3, { label: 'Object' });
      graphService.getNode.mockImplementation((id: number) => of(makeNode(id, id === 3 ? { label: 'Object' } : undefined)));
      const triple: UriTriple = {
        id: 7,
        subjectId: 1,
        predicateId: 2,
        objectId: 3,
        subjectUri: 'x:1',
        predicateUri: 'x:2',
        objectUri: 'x:3',
      };

      fixture.componentRef.setInput('triple', triple);
      fixture.detectChanges();
      await flush();
      fixture.detectChanges();

      expect(component.form.isLiteral().value()).toBe(false);
      expect(component.form.objectNode().value()).toEqual(obj);
    });

    it('should reset the form and mark as new when the triple input becomes undefined', () => {
      // gotcha: setting undefined twice in a row is a no-op for a signal
      // input, so first set a real value, then clear it
      fixture.componentRef.setInput('triple', {
        id: 1,
        subjectId: 0,
        predicateId: 0,
        subjectUri: '',
        predicateUri: '',
        objectLiteral: 'x',
      } as UriTriple);
      fixture.detectChanges();
      component.form.subjectNode().value.set(makeNode(1));

      fixture.componentRef.setInput('triple', undefined);
      fixture.detectChanges();

      expect(component.isNew()).toBe(true);
      expect(component.form.isLiteral().value()).toBe(true);
      expect(component.form.subjectNode().value()).toBeNull();
    });
  });

  describe('onSubjectChange / onPredicateChange / onObjectChange', () => {
    it('onSubjectChange should set and dirty subjectNode', () => {
      const node = makeNode(1);
      component.onSubjectChange(node);
      expect(component.form.subjectNode().value()).toEqual(node);
      expect(component.form.subjectNode().dirty()).toBe(true);
    });

    it('onSubjectChange with no node should clear subjectNode', () => {
      component.onSubjectChange(makeNode(1));
      component.onSubjectChange(undefined);
      expect(component.form.subjectNode().value()).toBeNull();
    });

    it('onPredicateChange should set and dirty predicateNode', () => {
      const node = makeNode(2);
      component.onPredicateChange(node);
      expect(component.form.predicateNode().value()).toEqual(node);
      expect(component.form.predicateNode().dirty()).toBe(true);
    });

    it('onObjectChange should set objectNode and switch off literal mode', () => {
      const node = makeNode(3);
      component.onObjectChange(node);
      expect(component.form.objectNode().value()).toEqual(node);
      expect(component.form.isLiteral().value()).toBe(false);
      expect(component.form.isLiteral().dirty()).toBe(true);
    });

    it('onObjectChange with no node should clear objectNode without touching isLiteral', () => {
      component.form.isLiteral().value.set(false);
      component.onObjectChange(undefined);
      expect(component.form.objectNode().value()).toBeNull();
      expect(component.form.isLiteral().value()).toBe(false);
    });
  });

  describe('isLiteral toggling (conditional validators)', () => {
    it('should require objectNode and drop literal validators when switched to non-literal', () => {
      component.form.isLiteral().value.set(false);

      expect(component.form.objectNode().getError('required')).toBeTruthy();
      expect(component.form.literal().valid()).toBe(true);
    });

    it('should require literal and drop objectNode validators when switched back to literal', () => {
      component.form.isLiteral().value.set(false);
      component.form.isLiteral().value.set(true);

      expect(component.form.objectNode().valid()).toBe(true);
      expect(component.form.literal().getError('required')).toBeTruthy();
    });
  });

  describe('save', () => {
    it('should not update the triple model when the form is invalid', () => {
      const before = component.triple();
      component.save();
      expect(component.triple()).toBe(before);
    });

    it('should build and set the triple from form values when literal', () => {
      component.form.subjectNode().value.set(makeNode(1));
      component.form.predicateNode().value.set(makeNode(2));
      component.form.literal().value.set('some text');

      component.save();

      const t = component.triple();
      expect(t?.subjectId).toBe(1);
      expect(t?.predicateId).toBe(2);
      expect(t?.objectId).toBeUndefined();
      expect(t?.objectLiteral).toBe('some text');
      expect(t?.subjectUri).toBe('x:node1');
      expect(t?.predicateUri).toBe('x:node2');
    });

    it('should build and set the triple from form values when not literal', () => {
      component.form.subjectNode().value.set(makeNode(1));
      component.form.predicateNode().value.set(makeNode(2));
      component.form.isLiteral().value.set(false);
      component.form.objectNode().value.set(makeNode(3));

      component.save();

      const t = component.triple();
      expect(t?.objectId).toBe(3);
      expect(t?.objectUri).toBe('x:node3');
      expect(t?.objectLiteral).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('should emit editorClose', () => {
      const spy = vi.fn();
      component.editorClose.subscribe(spy);
      component.cancel();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('literal maxLength validation', () => {
    it('should flag a "maxLength" error when literal exceeds 15000 chars', () => {
      component.form.literal().value.set('a'.repeat(15001));
      component.form.literal().markAsDirty();
      fixture.detectChanges();
      expect(component.form.literal().getError('maxLength')).toBeTruthy();

      // Material shows mat-error only once its control's errorState is
      // true, which (default ErrorStateMatcher) requires touched
      component.form.literal().markAsTouched();
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('mat-error')?.textContent
      ).toContain('literal too long');
    });

    it('should not flag a too long literal while not in literal mode', () => {
      component.form.literal().value.set('a'.repeat(15001));
      component.form.isLiteral().value.set(false);
      expect(component.form.literal().valid()).toBe(true);
    });
  });

  describe('template and draft sync', () => {
    function flushAll(): Promise<void> {
      fixture.detectChanges();
      return flush().then(() => {
        fixture.detectChanges();
      });
    }

    it('renders no <form> element, and saves via a type=button click', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      component.form.subjectNode().value.set(makeNode(1));
      component.form.predicateNode().value.set(makeNode(2));
      component.form.literal().value.set('lit');
      fixture.detectChanges();

      const buttons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button')
      );
      const save = buttons[buttons.length - 1];
      expect(save.type).toBe('button');
      expect(save.disabled).toBe(false);
      save.click();

      expect(component.triple()?.objectLiteral).toBe('lit');
    });

    it('does not reload nodes nor reset the draft on the echo of its own save', async () => {
      graphService.getNode.mockImplementation((id: number) => of(makeNode(id)));
      fixture.componentRef.setInput('triple', {
        id: 9,
        subjectId: 1,
        predicateId: 2,
        objectLiteral: 'old',
        subjectUri: 'x:node1',
        predicateUri: 'x:node2',
      } as UriTriple);
      await flushAll();
      expect(graphService.getNode).toHaveBeenCalledTimes(2);
      expect(component.form.subjectNode().value()?.id).toBe(1);

      component.form.literal().value.set('new');
      component.save();
      await flushAll();

      expect(component.triple()?.objectLiteral).toBe('new');
      expect(component.triple()?.id).toBe(9);
      expect(graphService.getNode).toHaveBeenCalledTimes(2);
      expect(component.form.subjectNode().value()?.id).toBe(1);
      expect(component.form.literal().value()).toBe('new');
    });

    it('rebuilds the draft and reloads nodes when another triple is bound', async () => {
      graphService.getNode.mockImplementation((id: number) => of(makeNode(id)));
      fixture.componentRef.setInput('triple', {
        id: 9,
        subjectId: 1,
        predicateId: 2,
        objectLiteral: 'old',
        subjectUri: 'x:node1',
        predicateUri: 'x:node2',
      } as UriTriple);
      await flushAll();
      component.form.literal().value.set('edited');
      component.form.literal().markAsDirty();

      fixture.componentRef.setInput('triple', {
        id: 10,
        subjectId: 3,
        predicateId: 2,
        objectLiteral: 'other',
        subjectUri: 'x:node3',
        predicateUri: 'x:node2',
      } as UriTriple);
      await flushAll();

      expect(component.form.literal().value()).toBe('other');
      expect(component.form.subjectNode().value()?.id).toBe(3);
      expect(graphService.getNode).toHaveBeenCalledTimes(4);
      expect(component.form.literal().dirty()).toBe(false);
    });
  });

  describe('stale node responses', () => {
    it('ignores a node loaded for a triple no longer bound', async () => {
      const late = new Subject<UriNode>();
      graphService.getNode.mockImplementation((id: number) =>
        id === 1 ? late : of(makeNode(id))
      );
      fixture.componentRef.setInput('triple', {
        id: 1, subjectId: 1, predicateId: 2, objectLiteral: 'a',
        subjectUri: 'x:node1', predicateUri: 'x:node2',
      } as UriTriple);
      fixture.detectChanges();
      await flush();

      fixture.componentRef.setInput('triple', {
        id: 2, subjectId: 3, predicateId: 2, objectLiteral: 'b',
        subjectUri: 'x:node3', predicateUri: 'x:node2',
      } as UriTriple);
      fixture.detectChanges();
      await flush();
      expect(component.form.subjectNode().value()?.id).toBe(3);

      // the response for the first triple arrives late
      late.next(makeNode(1));
      late.complete();
      await flush();

      expect(component.form.subjectNode().value()?.id).toBe(3);
    });
  });
});
