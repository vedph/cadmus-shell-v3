import { GraphNodeLabelPipe } from './graph-node-label.pipe';
import { GraphNode } from '../graph-interfaces';

describe('GraphNodeLabelPipe', () => {
  let pipe: GraphNodeLabelPipe;

  beforeEach(() => {
    pipe = new GraphNodeLabelPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the value unchanged when it has no id', () => {
    const node = { label: 'l' } as GraphNode;
    expect(pipe.transform(node)).toBe(node);
  });

  it('should return the value unchanged when it has no label', () => {
    const node = { id: 'N1' } as GraphNode;
    expect(pipe.transform(node)).toBe(node);
  });

  it('should return the plain label for a non-P node', () => {
    const node: GraphNode = { id: 'N1', label: 'alpha', data: {} };
    expect(pipe.transform(node)).toBe('alpha');
  });

  it('should return uri=label for a P node with a data uri', () => {
    const node: GraphNode = {
      id: 'P1',
      label: '3',
      data: { uri: 'rdfs:label' },
    };
    expect(pipe.transform(node)).toBe('rdfs:label=3');
  });

  it('should return the plain label for a P node without a data uri', () => {
    const node: GraphNode = { id: 'P1', label: '3', data: {} };
    expect(pipe.transform(node)).toBe('3');
  });

  it('should not throw for a P node with no data object', () => {
    // node.data is optional per GraphNode; a P-prefixed id with no `data`
    // must not throw when reading node.data.uri.
    const node: GraphNode = { id: 'P1', label: '3' };
    expect(() => pipe.transform(node)).not.toThrow();
    expect(pipe.transform(node)).toBe('3');
  });

  it('should pass through non-GraphNode values unchanged', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeUndefined();
  });
});
