import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  linkedSignal,
  model,
  untracked,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { take } from 'rxjs/operators';

import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatChipListbox,
  MatChipOption,
  MatChipRemove,
} from '@angular/material/chips';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { GraphNodeLookupService } from '@myrmidon/cadmus-graph-ui';
import { GraphService, UriNode, NodeSourceType } from '@myrmidon/cadmus-api';

import { PagedLinkedNodeFilter } from '../../graph-walker';

/**
 * The editable shape behind the filter form. Text fields use '' as their
 * empty value, as they are bound to native inputs; class nodes are picked
 * via a lookup.
 */
interface LinkedNodeFilterControls {
  pageNumber: number;
  pageSize: number;
  uid: string;
  isClass: boolean | null;
  tag: string;
  label: string;
  sourceType: NodeSourceType | null;
  sid: string;
  isSidPrefix: boolean;
  classes: UriNode[];
}

/**
 * Bound filter -> draft. Class nodes are not part of the filter (only
 * their IDs are), so they start empty and get loaded afterwards.
 */
function toDraft(filter: PagedLinkedNodeFilter): LinkedNodeFilterControls {
  return {
    pageNumber: filter.pageNumber,
    pageSize: filter.pageSize,
    uid: filter.uid || '',
    isClass: filter.isClass ?? null,
    tag: filter.tag || '',
    label: filter.label || '',
    sourceType: filter.sourceType ?? null,
    sid: filter.sid || '',
    isSidPrefix: filter.isSidPrefix || false,
    classes: [],
  };
}

/**
 * Draft -> filter. The context node, predicate and direction are not
 * user-editable filter criteria: they are carried over from the bound
 * filter.
 */
function toFilter(
  v: LinkedNodeFilterControls,
  filter: PagedLinkedNodeFilter
): PagedLinkedNodeFilter {
  return {
    pageNumber: +v.pageNumber,
    pageSize: +v.pageSize,
    uid: v.uid || undefined,
    isClass: v.isClass ?? undefined,
    tag: v.tag || undefined,
    label: v.label || undefined,
    sourceType: v.sourceType ?? undefined,
    sid: v.sid || undefined,
    isSidPrefix: v.isSidPrefix ? true : undefined,
    classIds: v.classes.length ? v.classes.map((n) => n.id) : undefined,
    otherNodeId: filter.otherNodeId,
    predicateId: filter.predicateId,
    isObject: filter.isObject || false,
  };
}

function isSameFilter(
  filter: PagedLinkedNodeFilter,
  v: LinkedNodeFilterControls
): boolean {
  return JSON.stringify(filter) === JSON.stringify(toFilter(v, filter));
}

/**
 * Linked non-literal node filter.
 */
@Component({
  selector: 'cadmus-walker-linked-node-filter',
  templateUrl: './linked-node-filter.component.html',
  styleUrls: ['./linked-node-filter.component.css'],
  imports: [
    FormField,
    MatPaginator,
    MatFormField,
    MatInput,
    MatSelect,
    MatOption,
    MatCheckbox,
    RefLookupComponent,
    MatChipListbox,
    MatChipOption,
    MatTooltip,
    MatChipRemove,
    MatIcon,
    MatIconButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkedNodeFilterComponent {
  /**
   * True if this component is disabled.
   */
  public readonly disabled = input<boolean>();

  /**
   * True if this component should show a pager.
   */
  public readonly hasPager = input<boolean>(false);

  /**
   * The total number of nodes returned from the last
   * page fetch operation. Used when hasPager is true.
   */
  public readonly total = input<number>(0);

  /**
   * The filter.
   */
  public readonly filter = model<PagedLinkedNodeFilter>({
    pageNumber: 1,
    pageSize: 10,
    otherNodeId: 0,
    predicateId: 0,
  });

  /**
   * The ID of the context node of the bound filter.
   */
  public get otherNodeId(): number {
    return this.filter().otherNodeId;
  }

  /**
   * The ID of the predicate of the bound filter.
   */
  public get predicateId(): number {
    return this.filter().predicateId;
  }

  /**
   * True if the bound filter is for the object direction.
   */
  public get isObject(): boolean {
    return this.filter().isObject || false;
  }

  /**
   * The editable draft, derived from filter. On the echo of our own apply
   * the live draft is kept (with its already loaded class nodes).
   */
  private readonly _draft = linkedSignal<
    PagedLinkedNodeFilter,
    LinkedNodeFilterControls
  >({
    source: () => this.filter(),
    computation: (filter, previous) =>
      previous && isSameFilter(filter, previous.value)
        ? previous.value
        : toDraft(filter),
  });

  public readonly form = form(this._draft);

  constructor(
    public lookupService: GraphNodeLookupService,
    private _graphService: GraphService
  ) {
    // a new filter was bound: clear interaction state and load its class
    // nodes. Nothing to do on the echo of our own apply, as the draft
    // already has those nodes.
    effect(() => {
      const filter = this.filter();
      untracked(() => {
        if (!isSameFilter(filter, this._draft())) {
          this.form().reset();
          this.loadClasses(filter);
        }
      });
    });
  }

  /**
   * Load the referenced class nodes so we can show them by label.
   */
  private loadClasses(filter: PagedLinkedNodeFilter): void {
    if (!filter.classIds?.length) {
      return;
    }
    this._graphService
      .getNodeSet(filter.classIds)
      .pipe(take(1))
      .subscribe((nodes) => {
        // ignore a late response for a filter no longer bound
        if (
          JSON.stringify(this.filter().classIds) !==
          JSON.stringify(filter.classIds)
        ) {
          return;
        }
        // fresh objects, not the service's own
        this.form
          .classes()
          .value.set(nodes.filter((n) => n).map((n) => ({ ...n! })));
      });
  }

  public onPageChange(page: PageEvent): void {
    this.form.pageNumber().value.set(page.pageIndex + 1);
    this.filter.set(toFilter(this._draft(), this.filter()));
  }

  public onClassAdd(node: unknown): void {
    if (!node) {
      return;
    }
    // a fresh object, not the lookup's own
    this.form
      .classes()
      .value.update((nodes) => [...nodes, { ...(node as UriNode) }]);
    this.form.classes().markAsDirty();
  }

  public onClassRemove(node: UriNode): void {
    const nodes = this.form.classes().value();
    if (nodes.includes(node)) {
      this.form.classes().value.set(nodes.filter((n) => n !== node));
      this.form.classes().markAsDirty();
    }
  }

  public reset(): void {
    const filter = this.filter();
    this._draft.set(
      toDraft({
        pageNumber: 1,
        pageSize: 10,
        otherNodeId: filter.otherNodeId,
        predicateId: filter.predicateId,
      })
    );
    this.filter.set(toFilter(this._draft(), filter));
  }

  public apply(): void {
    this.filter.set(toFilter(this._draft(), this.filter()));
    this.form().reset();
  }
}
