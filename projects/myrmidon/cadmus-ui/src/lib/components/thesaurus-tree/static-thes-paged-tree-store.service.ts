import { DataPage } from '@myrmidon/ngx-tools';
import {
  PagedTreeNode,
  PagedTreeStoreService,
  TreeNodeFilter,
} from '@myrmidon/paged-data-browsers';
import { Observable, of } from 'rxjs';

export interface ThesaurusEntry {
  id: string;
  value: string;
}

/**
 * The filter for thesaurus entry nodes. The only filtered property is
 * the node's label.
 */
export interface ThesEntryNodeFilter extends TreeNodeFilter {
  label?: string;
}

/**
 * The tree node for thesaurus entries in a paging tree node.
 */
export interface ThesEntryPagedTreeNode
  extends PagedTreeNode<ThesEntryNodeFilter> {
  key: string; // entry.id
  value: string; // entry.value (not rendered; the rendered value is in label)
}

/**
 * A label rendering function which removes from a label
 * all the characters past the last colon, trimming the result.
 * This is a typical rendering when dealing with hierarchical
 * thesaurus entries, e.g. "furniture: table: color", where
 * we can shorten the label to just "color", as "furniture"
 * and "table" are its ancestors.
 */
export const renderLabelFromLastColon = (label: string): string => {
  if (!label) {
    return label;
  }
  const i = label.lastIndexOf(':');
  return i > -1 && i + 1 < label.length ? label.substring(i + 1).trim() : label;
};

interface NumberedEntry extends ThesaurusEntry {
  n: number;
}

/**
 * A static paged tree store service for thesaurus entries.
 * This builds the tree nodes from the thesaurus entries, assuming
 * that entry IDs are hierarchical and separated by dots (.).
 */
export class StaticThesPagedTreeStoreService
  implements PagedTreeStoreService<ThesEntryNodeFilter>
{
  private _nodes: ThesEntryPagedTreeNode[] = [];
  private _built = false;
  private readonly _entries: NumberedEntry[];

  constructor(
    entries: ThesaurusEntry[],
    private _renderLabel?: (label: string) => string
  ) {
    // assign a number to each entry for stable IDs
    this._entries = entries.map((entry, index) => ({
      ...entry,
      n: index + 1,
    }));
  }

  private ensureNodes(): void {
    // lazily build the nodes only once
    if (this._built) {
      return;
    }

    // map where key is node.id and value is max x value for that parent
    // (0 is used for the virtual root)
    const xMap = new Map<number, number>();

    for (const entry of this._entries) {
      const hasDot = entry.id.includes('.');
      const keyParts = entry.id.split('.');

      // create the node
      const node: ThesEntryPagedTreeNode = {
        id: entry.n,
        label:
          hasDot && this._renderLabel
            ? this._renderLabel(entry.value)
            : entry.value,
        key: entry.id,
        value: entry.value,
        paging: { pageNumber: 0, pageCount: 0, total: 0 },
        y: hasDot ? keyParts.length : 1,
        x: 0, // will be set later
        parentId: undefined, // will be set later
        hasChildren: false, // will be set later
      };

      // if it has a dot, find its parent and set parentId
      if (hasDot) {
        // build the parent key
        const parentKey = keyParts.slice(0, keyParts.length - 1).join('.');
        // find the parent node with that key
        const parentNode = this._nodes.find((n) => n.key === parentKey);
        // if found, set parentId and x in child and hasChildren in parent
        if (parentNode) {
          node.parentId = parentNode.id;
          parentNode.hasChildren = true;
          if (xMap.has(parentNode.id)) {
            xMap.set(parentNode.id, xMap.get(parentNode.id)! + 1);
          } else {
            xMap.set(parentNode.id, 1);
          }
          node.x = xMap.get(parentNode.id)!;
        } else {
          // parent not found, treat as root
          if (xMap.has(0)) {
            xMap.set(0, xMap.get(0)! + 1);
          } else {
            xMap.set(0, 1);
          }
          node.x = xMap.get(0)!;
        }
      } else {
        // else it's a root node
        if (xMap.has(0)) {
          xMap.set(0, xMap.get(0)! + 1);
        } else {
          xMap.set(0, 1);
        }
        node.x = xMap.get(0)!;
      }

      this._nodes.push(node);
    }

    this._built = true;
  }

  /**
   * Get the specified page of nodes.
   * @param filter The filter.
   * @param pageNumber The page number.
   * @param pageSize The page size.
   * @param hasMockRoot Whether the root node is a mock node. Not used here.
   */
  public getNodes(
    filter: ThesEntryNodeFilter,
    pageNumber: number,
    pageSize: number,
    hasMockRoot?: boolean
  ): Observable<DataPage<ThesEntryPagedTreeNode>> {
    this.ensureNodes();

    // apply filtering
    let nodes = this._nodes.filter((n) => {
      if (filter.parentId !== undefined && filter.parentId !== null) {
        if (n.parentId !== filter.parentId) {
          return false;
        }
      } else {
        if (n.parentId) {
          return false;
        }
      }

      if (filter.label) {
        const filterValue = filter.label.toLowerCase();
        if (!n.label.toLowerCase().includes(filterValue)) {
          return false;
        }
      }
      return true;
    });

    // apply paging
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedNodes = nodes.slice(startIndex, endIndex);

    // page and return
    const paged = nodes.slice(
      (pageNumber - 1) * pageSize,
      pageNumber * pageSize
    );
    return of({
      items: paged,
      pageNumber: pageNumber,
      pageSize: pageSize,
      pageCount: Math.ceil(nodes.length / pageSize),
      total: nodes.length,
    });
  }
}
