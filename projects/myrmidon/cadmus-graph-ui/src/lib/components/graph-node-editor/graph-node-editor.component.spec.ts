import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { NodeSourceType, UriNode } from '@myrmidon/cadmus-api';

import { GraphNodeEditorComponent } from './graph-node-editor.component';

function buildNode(overrides: Partial<UriNode> = {}): UriNode {
  return {
    id: 42,
    uri: 'x:some-uri',
    label: 'Some label',
    isClass: false,
    sourceType: NodeSourceType.User,
    ...overrides,
  };
}

describe('GraphNodeEditorComponent', () => {
  let component: GraphNodeEditorComponent;
  let fixture: ComponentFixture<GraphNodeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphNodeEditorComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphNodeEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with an empty invalid form and isNew=true', () => {
    expect(component.isNew()).toBe(true);
    expect(component.form.uri().value()).toBe('');
    expect(component.form.label().value()).toBe('');
    expect(component.form.isClass().value()).toBe(false);
    expect(component.form.tag().value()).toBe('');
    expect(component.form().invalid()).toBe(true);
  });

  //#region populate from input (model)
  it('should populate the form from an existing node and mark it pristine', () => {
    const node = buildNode({ id: 5, tag: 'tag1', isClass: true });
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();

    expect(component.form.uri().value()).toBe(node.uri);
    expect(component.form.label().value()).toBe(node.label);
    expect(component.form.isClass().value()).toBe(true);
    expect(component.form.tag().value()).toBe('tag1');
    expect(component.isNew()).toBe(false);
    expect(component.form().dirty()).toBe(false);
  });

  it('should treat a node with id=0 as new', () => {
    const node = buildNode({ id: 0 });
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();

    expect(component.isNew()).toBe(true);
  });

  it('should default isClass to false and tag to empty when unset on the node', () => {
    const node = buildNode({ isClass: undefined, tag: undefined });
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();

    expect(component.form.isClass().value()).toBe(false);
    expect(component.form.tag().value()).toBe('');
  });

  it('should reset the form and set isNew=true when node becomes undefined', () => {
    // set a real value first: setting undefined twice in a row is a no-op
    // for signal inputs since the default is already undefined
    fixture.componentRef.setInput('node', buildNode());
    fixture.detectChanges();
    expect(component.isNew()).toBe(false);

    fixture.componentRef.setInput('node', undefined);
    fixture.detectChanges();

    expect(component.form.uri().value()).toBe('');
    expect(component.form.label().value()).toBe('');
    expect(component.form.isClass().value()).toBe(false);
    expect(component.form.tag().value()).toBe('');
    expect(component.isNew()).toBe(true);
  });
  //#endregion

  //#region validation
  it('uri control should be required and limited to 500 chars', () => {
    expect(component.form.uri().getError('required')).toBeTruthy();
    component.form.uri().value.set('a'.repeat(501));
        expect(component.form.uri().getError('maxLength')).toBeTruthy();
    component.form.uri().value.set('http://x');
    expect(component.form.uri().valid()).toBe(true);
  });

  it('label control should be required and limited to 500 chars', () => {
    expect(component.form.label().getError('required')).toBeTruthy();
    component.form.label().value.set('a'.repeat(501));
    expect(component.form.label().getError('maxLength')).toBeTruthy();
    component.form.label().value.set('a label');
    expect(component.form.label().valid()).toBe(true);
  });

  it('tag control should be optional but limited to 50 chars', () => {
    expect(component.form.tag().valid()).toBe(true);
    component.form.tag().value.set('a'.repeat(51));
    expect(component.form.tag().getError('maxLength')).toBeTruthy();
  });
  //#endregion

  //#region save
  it('save should do nothing when the form is invalid', () => {
    const before = component.node();
    component.save();
    expect(component.node()).toBe(before);
  });

  it('save should set the node model from the trimmed form values, keeping id/sourceType', () => {
    fixture.componentRef.setInput(
      'node',
      buildNode({ id: 7, sourceType: NodeSourceType.Item })
    );
    fixture.detectChanges();

    component.form.uri().value.set('  x:trimmed-uri  ');
    component.form.label().value.set('  Trimmed label  ');
    component.form.isClass().value.set(true);
    component.form.tag().value.set('  tag1  ');

    component.save();

    expect(component.node()).toEqual({
      id: 7,
      sourceType: NodeSourceType.Item,
      uri: 'x:trimmed-uri',
      label: 'Trimmed label',
      isClass: true,
      tag: 'tag1',
    });
  });

  it('save should default id=0 and sourceType=User for a brand new node', () => {
    component.form.uri().value.set('x:new');
    component.form.label().value.set('New label');

    component.save();

    expect(component.node()).toEqual({
      id: 0,
      sourceType: NodeSourceType.User,
      uri: 'x:new',
      label: 'New label',
      isClass: false,
      tag: undefined,
    });
  });
  //#endregion

  it('cancel should emit editorClose', () => {
    const spy = vi.fn();
    component.editorClose.subscribe(spy);
    component.cancel();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  //#region template
  describe('template', () => {
    function saveButton(): HTMLButtonElement {
      const buttons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button')
      );
      return buttons[buttons.length - 1];
    }

    it('renders no <form> element, so it stays valid at any nesting depth', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      expect(saveButton().type).toBe('button');
    });

    it('saves on click once valid, via the bound inputs', () => {
      const inputs: HTMLInputElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('input[matinput]')
      );
      // uri, label, tag (no tag entries => text input)
      expect(inputs.length).toBe(3);
      expect(saveButton().disabled).toBe(true);
      inputs[0].value = 'x:typed';
      inputs[0].dispatchEvent(new Event('input'));
      inputs[1].value = 'typed';
      inputs[1].dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(saveButton().disabled).toBe(false);

      saveButton().click();

      expect(component.node()?.uri).toBe('x:typed');
      expect(component.node()?.label).toBe('typed');
    });

    it('maps the "(no tag)" option to an undefined tag', () => {
      fixture.componentRef.setInput('tagEntries', [
        { id: 't1', value: 'tag 1' },
      ]);
      fixture.componentRef.setInput('node', buildNode({ tag: 't1' }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('mat-select')).toBeTruthy();
      component.form.tag().value.set('');
      component.save();
      expect(component.node()?.tag).toBeUndefined();
    });

    it('keeps the typed text when its own save echoes back normalized', () => {
      fixture.componentRef.setInput('node', buildNode());
      fixture.detectChanges();
      component.form.label().value.set('abc ');
      component.save();
      fixture.detectChanges();

      expect(component.node()?.label).toBe('abc');
      expect(component.form.label().value()).toBe('abc ');
    });

    it('rebuilds the draft and clears dirty when a new node is bound', () => {
      fixture.componentRef.setInput('node', buildNode());
      fixture.detectChanges();
      component.form.label().value.set('edited');
      component.form.label().markAsDirty();
      fixture.componentRef.setInput('node', buildNode({ label: 'other' }));
      fixture.detectChanges();

      expect(component.form.label().value()).toBe('other');
      expect(component.form().dirty()).toBe(false);
    });
  });
  //#endregion
});
