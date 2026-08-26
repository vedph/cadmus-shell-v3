import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
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
      expect(component.isLiteral.value).toBe(true);
      expect(component.subjectNode.value).toBeNull();
      expect(component.predicateNode.value).toBeNull();
      // subject, predicate and literal (required by default) are all unset
      expect(component.form.invalid).toBe(true);
    });

    it('should not require objectNode while isLiteral is true', () => {
      // isLiteral true => conditionalValidator predicate is false => valid
      expect(component.objectNode.valid).toBe(true);
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

      expect(component.subjectNode.value).toEqual(subject);
      expect(component.predicateNode.value).toEqual(predicate);
      expect(component.isLiteral.value).toBe(true);
      expect(component.literal.value).toBe('hello');
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

      expect(component.isLiteral.value).toBe(false);
      expect(component.objectNode.value).toEqual(obj);
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
      component.subjectNode.setValue(makeNode(1));

      fixture.componentRef.setInput('triple', undefined);
      fixture.detectChanges();

      expect(component.isNew()).toBe(true);
      expect(component.isLiteral.value).toBe(true);
      expect(component.subjectNode.value).toBeNull();
    });
  });

  describe('onSubjectChange / onPredicateChange / onObjectChange', () => {
    it('onSubjectChange should set and dirty subjectNode', () => {
      const node = makeNode(1);
      component.onSubjectChange(node);
      expect(component.subjectNode.value).toEqual(node);
      expect(component.subjectNode.dirty).toBe(true);
    });

    it('onSubjectChange with no node should clear subjectNode', () => {
      component.onSubjectChange(makeNode(1));
      component.onSubjectChange(undefined);
      expect(component.subjectNode.value).toBeNull();
    });

    it('onPredicateChange should set and dirty predicateNode', () => {
      const node = makeNode(2);
      component.onPredicateChange(node);
      expect(component.predicateNode.value).toEqual(node);
      expect(component.predicateNode.dirty).toBe(true);
    });

    it('onObjectChange should set objectNode and switch off literal mode', () => {
      const node = makeNode(3);
      component.onObjectChange(node);
      expect(component.objectNode.value).toEqual(node);
      expect(component.isLiteral.value).toBe(false);
      expect(component.isLiteral.dirty).toBe(true);
    });

    it('onObjectChange with no node should clear objectNode without touching isLiteral', () => {
      component.isLiteral.setValue(false);
      component.onObjectChange(undefined);
      expect(component.objectNode.value).toBeNull();
      expect(component.isLiteral.value).toBe(false);
    });
  });

  describe('isLiteral toggling (ngOnInit subscription)', () => {
    it('should require objectNode and drop literal validators when switched to non-literal', () => {
      component.isLiteral.setValue(false);
      component.objectNode.updateValueAndValidity();
      component.literal.updateValueAndValidity();

      expect(component.objectNode.hasError('required')).toBe(true);
      expect(component.literal.valid).toBe(true);
    });

    it('should require literal and drop objectNode validators when switched back to literal', () => {
      component.isLiteral.setValue(false);
      component.isLiteral.setValue(true);
      component.objectNode.updateValueAndValidity();
      component.literal.updateValueAndValidity();

      expect(component.objectNode.valid).toBe(true);
      expect(component.literal.hasError('required')).toBe(true);
    });
  });

  describe('save', () => {
    it('should not update the triple model when the form is invalid', () => {
      const before = component.triple();
      component.save();
      expect(component.triple()).toBe(before);
    });

    it('should build and set the triple from form values when literal', () => {
      component.subjectNode.setValue(makeNode(1));
      component.predicateNode.setValue(makeNode(2));
      component.literal.setValue('some text');

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
      component.subjectNode.setValue(makeNode(1));
      component.predicateNode.setValue(makeNode(2));
      component.isLiteral.setValue(false);
      component.objectNode.setValue(makeNode(3));

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

  describe('literal maxlength validation', () => {
    it('should flag a "maxlength" error (not "maxLength") when literal exceeds 15000 chars', () => {
      // Validators.maxLength sets the lowercase 'maxlength' error key; the
      // template used to check the (non-existent) 'maxLength' key, so the
      // error message never showed up. Verified here at the control level,
      // and fixed in graph-triple-editor.component.html.
      component.literal.setValue('a'.repeat(15001));
      component.literal.markAsDirty();
      fixture.detectChanges();

      expect(component.literal.hasError('maxlength')).toBe(true);
      expect(component.literal.hasError('maxLength' as any)).toBe(false);
    });
  });
});
