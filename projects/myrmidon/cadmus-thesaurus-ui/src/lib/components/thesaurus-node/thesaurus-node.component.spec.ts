import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThesaurusNodeComponent } from './thesaurus-node.component';
import { ThesaurusNode } from '../../services/thesaurus-nodes.service';

function makeNode(overrides?: Partial<ThesaurusNode>): ThesaurusNode {
  return {
    id: 'n1',
    value: 'Node 1',
    level: 1,
    ordinal: 1,
    ...overrides,
  };
}

describe('ThesaurusNodeComponent', () => {
  let component: ThesaurusNodeComponent;
  let fixture: ComponentFixture<ThesaurusNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThesaurusNodeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ThesaurusNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with an empty form when there is no node', () => {
    expect(component).toBeTruthy();
    expect(component.form.id().value()).toBe('');
    expect(component.editing()).toBe(false);
  });

  describe('updateForm (via the node model effect)', () => {
    it('should populate id/value and turn off editing when a node is set', () => {
      component.toggleEdit(true);
      fixture.componentRef.setInput('node', makeNode({ id: 'n2', value: 'V2' }));
      fixture.detectChanges();

      expect(component.form.id().value()).toBe('n2');
      expect(component.form.value().value()).toBe('V2');
      expect(component.editing()).toBe(false);
    });

    it('should reset the form and indent when the node becomes undefined', () => {
      fixture.componentRef.setInput('node', makeNode());
      fixture.detectChanges();
      fixture.componentRef.setInput('node', undefined);
      fixture.detectChanges();

      expect(component.form.id().value()).toBe('');
      expect(component.indent()).toBe('');
    });

    it('should compute the indent from the node level (level - 1 bullets)', () => {
      fixture.componentRef.setInput('node', makeNode({ level: 3 }));
      fixture.detectChanges();
      expect(component.indent()).toBe('••');
    });

    it('should use an empty indent for level 1 (or falsy level)', () => {
      fixture.componentRef.setInput('node', makeNode({ level: 1 }));
      fixture.detectChanges();
      expect(component.indent()).toBe('');
    });
  });

  describe('toggleEdit', () => {
    it('should set the editing signal', () => {
      component.toggleEdit(true);
      expect(component.editing()).toBe(true);
      component.toggleEdit(false);
      expect(component.editing()).toBe(false);
    });
  });

  describe('save', () => {
    it('should not update the node when not editing (regression: editing() must be called, not the signal itself)', () => {
      fixture.componentRef.setInput('node', makeNode({ id: 'n1', value: 'V1' }));
      fixture.detectChanges();
      component.form.id().value.set('changed');
      component.form.value().value.set('changed');
      // editing is false here (updateForm always turns it off)
      expect(component.editing()).toBe(false);

      component.save();

      // the node model must be untouched: still the original values
      expect(component.node()!.id).toBe('n1');
      expect(component.node()!.value).toBe('V1');
    });

    it('should not save when the form is invalid', () => {
      fixture.componentRef.setInput('node', makeNode());
      fixture.detectChanges();
      component.toggleEdit(true);
      component.form.id().value.set(''); // required -> invalid

      component.save();

      expect(component.node()!.id).toBe('n1');
    });

    it('should save the trimmed id/value and turn off editing when valid', () => {
      fixture.componentRef.setInput('node', makeNode({ id: 'n1', value: 'V1' }));
      fixture.detectChanges();
      component.toggleEdit(true);
      component.form.id().value.set('  new-id  ');
      component.form.value().value.set('  New Value  ');

      component.save();

      expect(component.node()!.id).toBe('new-id');
      expect(component.node()!.value).toBe('New Value');
      expect(component.editing()).toBe(false);
      expect(component.form().dirty()).toBe(false);
    });

    it('should preserve level and ordinal from the current node', () => {
      fixture.componentRef.setInput(
        'node',
        makeNode({ id: 'n1', value: 'V1', level: 2, ordinal: 5 })
      );
      fixture.detectChanges();
      component.toggleEdit(true);
      component.form.value().value.set('changed');

      component.save();

      expect(component.node()!.level).toBe(2);
      expect(component.node()!.ordinal).toBe(5);
    });
  });

  describe('emitRequest', () => {
    it('should emit the request id with the current node payload', () => {
      fixture.componentRef.setInput('node', makeNode({ id: 'n1', value: 'V1' }));
      fixture.detectChanges();
      const spy = vi.fn();
      component.request.subscribe(spy);

      component.emitRequest('delete');

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'delete',
          payload: expect.objectContaining({ id: 'n1', value: 'V1' }),
        })
      );
    });
  });

  describe('signal form', () => {
    function startEditing(): HTMLInputElement[] {
      fixture.componentRef.setInput('node', makeNode({ id: 'n1', value: 'V1' }));
      fixture.detectChanges();
      component.toggleEdit(true);
      fixture.detectChanges();
      return Array.from(fixture.nativeElement.querySelectorAll('input'));
    }

    it('renders no <form> while editing; save is a type=button click', () => {
      startEditing();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const save: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[mattooltip="Save changes"]'
      );
      expect(save.type).toBe('button');
      expect(save.disabled).toBe(true);
    });

    it('saves on Enter once edited, not while pristine', () => {
      const inputs = startEditing();
      inputs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.editing()).toBe(true);

      inputs[1].value = 'V1 changed ';
      inputs[1].dispatchEvent(new Event('input'));
      inputs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.editing()).toBe(false);
      expect(component.node()?.value).toBe('V1 changed');
    });

    it('cancels editing on Escape', () => {
      const inputs = startEditing();
      inputs[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      expect(component.editing()).toBe(false);
    });
  });

  describe('discard', () => {
    it('reverts the edited values', () => {
      fixture.componentRef.setInput('node', makeNode({ id: 'n1', value: 'V1' }));
      fixture.detectChanges();
      component.toggleEdit(true);
      component.form.value().value.set('changed');
      component.form.value().markAsDirty();

      component.toggleEdit(false);
      component.toggleEdit(true);

      expect(component.form.value().value()).toBe('V1');
      expect(component.form().dirty()).toBe(false);
      expect(component.node()?.value).toBe('V1');
    });
  });
});
