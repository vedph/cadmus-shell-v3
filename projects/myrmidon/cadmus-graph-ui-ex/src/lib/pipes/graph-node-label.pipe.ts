import { Pipe, PipeTransform } from '@angular/core';
import { GraphNode } from '../graph-interfaces';

/**
 * Get the extended label for the specified graph node. This returns the label
 * for N nodes, and the uri + "=" + the label for P nodes. That's because P
 * nodes label is just the count of the triples group, so the predicate ID is
 * got from the property node's data uri.
 */
@Pipe({ name: 'graphNodeLabel' })
export class GraphNodeLabelPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    const node = value as GraphNode;
    if (!node?.id || !node?.label) {
      return value;
    }
    if (node.id.startsWith('P') && node.data.uri) {
      return `${node.data.uri}=${node.label}`;
    }
    return node.label;
  }
}
