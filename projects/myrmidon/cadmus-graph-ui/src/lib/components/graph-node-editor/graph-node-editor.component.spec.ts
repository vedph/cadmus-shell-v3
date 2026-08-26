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
    expect(component.uri.value).toBeNull();
    expect(component.label.value).toBeNull();
    expect(component.isClass.value).toBe(false);
    expect(component.tag.value).toBeNull();
    expect(component.form.invalid).toBe(true);
  });

  //#region populate from input (model)
  it('should populate the form from an existing node and mark it pristine', () => {
    const node = buildNode({ id: 5, tag: 'tag1', isClass: true });
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();

    expect(component.uri.value).toBe(node.uri);
    expect(component.label.value).toBe(node.label);
    expect(component.isClass.value).toBe(true);
    expect(component.tag.value).toBe('tag1');
    expect(component.isNew()).toBe(false);
    expect(component.form.pristine).toBe(true);
  });

  it('should treat a node with id=0 as new', () => {
    const node = buildNode({ id: 0 });
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();

    expect(component.isNew()).toBe(true);
  });

  it('should default isClass to false and tag to null when unset on the node', () => {
    const node = buildNode({ isClass: undefined, tag: undefined });
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();

    expect(component.isClass.value).toBe(false);
    expect(component.tag.value).toBeNull();
  });

  it('should reset the form and set isNew=true when node becomes undefined', () => {
    // set a real value first: setting undefined twice in a row is a no-op
    // for signal inputs since the default is already undefined
    fixture.componentRef.setInput('node', buildNode());
    fixture.detectChanges();
    expect(component.isNew()).toBe(false);

    fixture.componentRef.setInput('node', undefined);
    fixture.detectChanges();

    expect(component.uri.value).toBeNull();
    expect(component.label.value).toBeNull();
    expect(component.isClass.value).toBe(false);
    expect(component.tag.value).toBeNull();
    expect(component.isNew()).toBe(true);
  });
  //#endregion

  //#region validation
  it('uri control should be required and limited to 500 chars', () => {
    expect(component.uri.hasError('required')).toBe(true);
    component.uri.setValue('a'.repeat(501));
    // Validators.maxLength sets the 'maxlength' (lowercase) error key
    expect(component.uri.hasError('maxlength')).toBe(true);
    component.uri.setValue('http://x');
    expect(component.uri.valid).toBe(true);
  });

  it('label control should be required and limited to 500 chars', () => {
    expect(component.label.hasError('required')).toBe(true);
    component.label.setValue('a'.repeat(501));
    expect(component.label.hasError('maxlength')).toBe(true);
    component.label.setValue('a label');
    expect(component.label.valid).toBe(true);
  });

  it('tag control should be optional but limited to 50 chars', () => {
    expect(component.tag.valid).toBe(true);
    component.tag.setValue('a'.repeat(51));
    expect(component.tag.hasError('maxlength')).toBe(true);
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

    component.uri.setValue('  x:trimmed-uri  ');
    component.label.setValue('  Trimmed label  ');
    component.isClass.setValue(true);
    component.tag.setValue('  tag1  ');

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
    component.uri.setValue('x:new');
    component.label.setValue('New label');

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
});
