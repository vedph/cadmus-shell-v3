import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  linkedSignal,
  model,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { forkJoin, from } from 'rxjs';

import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatList, MatListItem } from '@angular/material/list';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { GraphNodeLookupService } from '@myrmidon/cadmus-graph-ui';
import { GraphService, UriNode } from '@myrmidon/cadmus-api';

import { PagedTripleFilter } from '../../graph-walker';

/**
 * The editable shape behind the filter form. Text fields use '' as their
 * empty value, as they are bound to native inputs; nodes are picked via
 * lookups.
 */
interface TripleFilterControls {
  pageNumber: number;
  pageSize: number;
  litPattern: string;
  litType: string;
  litLanguage: string;
  minLitNumber: number | null;
  maxLitNumber: number | null;

  subj: UriNode | null;
  /** UI toggle: true to add picked predicates to notPreds. */
  isNotPred: boolean;
  preds: UriNode[];
  notPreds: UriNode[];
  hasLiteralObj: boolean | null;
  obj: UriNode | null;
  sid: string;
  isSidPrefix: boolean;
  tag: string;
}

/**
 * Bound filter -> draft. Nodes are not part of the filter (only their IDs
 * are), so they start empty and get loaded afterwards.
 */
function toDraft(
  filter: PagedTripleFilter,
  isNotPred = false
): TripleFilterControls {
  return {
    pageNumber: filter.pageNumber,
    pageSize: filter.pageSize,
    litPattern: filter.literalPattern || '',
    litType: filter.literalType || '',
    litLanguage: filter.literalLanguage || '',
    minLitNumber: filter.minLiteralNumber ?? null,
    maxLitNumber: filter.maxLiteralNumber ?? null,

    subj: null,
    isNotPred,
    preds: [],
    notPreds: [],
    hasLiteralObj: filter.hasLiteralObject ?? null,
    obj: null,
    sid: filter.sid || '',
    isSidPrefix: filter.isSidPrefix || false,
    tag: filter.tag || '',
  };
}

function toFilter(v: TripleFilterControls): PagedTripleFilter {
  return {
    pageNumber: +v.pageNumber,
    pageSize: +v.pageSize,
    literalPattern: v.litPattern || undefined,
    literalType: v.litType || undefined,
    literalLanguage: v.litLanguage || undefined,
    minLiteralNumber: v.minLitNumber ?? undefined,
    maxLiteralNumber: v.maxLitNumber ?? undefined,

    subjectId: v.subj?.id || undefined,
    predicateIds: v.preds.length ? v.preds.map((n) => n.id) : undefined,
    notPredicateIds: v.notPreds.length
      ? v.notPreds.map((n) => n.id)
      : undefined,
    hasLiteralObject: v.hasLiteralObj !== null ? v.hasLiteralObj : undefined,
    objectId: v.obj?.id || undefined,
    sid: v.sid || undefined,
    isSidPrefix: v.isSidPrefix,
    tag: v.tag || undefined,
  };
}

function isSameFilter(
  filter: PagedTripleFilter,
  v: TripleFilterControls
): boolean {
  return JSON.stringify(filter) === JSON.stringify(toFilter(v));
}

/**
 * Fresh copies of the non-null nodes, so that the draft never adopts
 * objects owned by a service or a lookup.
 */
function copyNodes(nodes: (UriNode | null | undefined)[]): UriNode[] {
  return nodes.filter((n) => n).map((n) => ({ ...n! }));
}

/**
 * Triples filter.
 */
@Component({
  selector: 'cadmus-walker-triple-filter',
  templateUrl: './triple-filter.component.html',
  styleUrls: ['./triple-filter.component.css'],
  imports: [
    FormField,
    MatPaginator,
    MatTabGroup,
    MatTab,
    RefLookupComponent,
    MatCheckbox,
    MatList,
    MatListItem,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatInput,
    MatTooltip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripleFilterComponent {
  /**
   * True if this component is disabled.
   */
  public readonly disabled = input<boolean>(false);

  /**
   * True if this component should show a pager.
   */
  public readonly hasPager = input<boolean>(false);

  /**
   * The total number of triples returned from the last
   * page fetch operation. Used when hasPager is true.
   */
  public readonly total = input<number>(0);

  /**
   * The filter.
   */
  public readonly filter = model<PagedTripleFilter>({
    pageNumber: 1,
    pageSize: 10,
  });

  /**
   * The editable draft, derived from filter. On the echo of our own apply
   * the live draft is kept (with its already loaded nodes). The isNotPred
   * UI toggle is not part of the filter, so it survives a rebuild.
   */
  private readonly _draft = linkedSignal<PagedTripleFilter, TripleFilterControls>(
    {
      source: () => this.filter(),
      computation: (filter, previous) =>
        previous && isSameFilter(filter, previous.value)
          ? previous.value
          : toDraft(filter, previous?.value.isNotPred),
    }
  );

  public readonly form = form(this._draft, (path) => {
    // [formField] renders these as the inputs' maxlength attributes
    maxLength(path.sid, 500);
    maxLength(path.tag, 50);
  });

  constructor(
    public lookupService: GraphNodeLookupService,
    private _graphService: GraphService
  ) {
    // a new filter was bound: clear interaction state and load its nodes.
    // Nothing to do on the echo of our own apply, as the draft already has
    // those nodes.
    effect(() => {
      const filter = this.filter();
      untracked(() => {
        if (!isSameFilter(filter, this._draft())) {
          this.form().reset();
          this.loadNodes(filter);
        }
      });
    });
  }

  /**
   * Load the referenced nodes so we can show them by label.
   */
  private loadNodes(filter: PagedTripleFilter): void {
    forkJoin({
      s: filter.subjectId
        ? this._graphService.getNode(filter.subjectId)
        : from([null]),
      // from([]) emits no value at all, which would make forkJoin never
      // emit (and so never update subj/obj/preds) even when
      // subjectId/objectId ARE set; from([[]]) emits a single empty array,
      // matching the from([null]) placeholder used by the s/o branches.
      p: filter.predicateIds?.length
        ? this._graphService.getNodeSet(filter.predicateIds)
        : from([[]]),
      np: filter.notPredicateIds?.length
        ? this._graphService.getNodeSet(filter.notPredicateIds)
        : from([[]]),
      o: filter.objectId
        ? this._graphService.getNode(filter.objectId)
        : from([null]),
    }).subscribe((result) => {
      // ignore a late response for a filter no longer bound
      const ids = (f: PagedTripleFilter) =>
        JSON.stringify([
          f.subjectId,
          f.predicateIds,
          f.notPredicateIds,
          f.objectId,
        ]);
      if (ids(this.filter()) !== ids(filter)) {
        return;
      }
      this._draft.update((v) => ({
        ...v,
        subj: result.s ? { ...result.s } : null,
        preds: copyNodes(result.p),
        notPreds: copyNodes(result.np),
        obj: result.o ? { ...result.o } : null,
      }));
    });
  }

  public onPageChange(page: PageEvent): void {
    this.form.pageNumber().value.set(page.pageIndex + 1);
    this.filter.set(toFilter(this._draft()));
  }

  public onSubjectNodeChange(node: unknown): void {
    this.form.subj().value.set(node ? { ...(node as UriNode) } : null);
  }

  public onObjectNodeChange(node: unknown): void {
    this.form.obj().value.set(node ? { ...(node as UriNode) } : null);
  }

  public onPredicateNodeChange(node: unknown): void {
    if (!node) {
      return;
    }
    const un = node as UriNode;
    const field = this.form.isNotPred().value()
      ? this.form.notPreds
      : this.form.preds;
    const nodes = field().value();
    if (nodes.some((n) => n.id === un.id)) {
      return;
    }
    field().value.set([...nodes, { ...un }]);
    field().markAsDirty();
  }

  public deleteNotPred(node: UriNode): void {
    this.form
      .notPreds()
      .value.update((nodes) => nodes.filter((n) => n !== node));
    this.form.notPreds().markAsDirty();
  }

  public deletePred(node: UriNode): void {
    this.form.preds().value.update((nodes) => nodes.filter((n) => n !== node));
    this.form.preds().markAsDirty();
  }

  public reset(): void {
    this._draft.set(toDraft({ pageNumber: 1, pageSize: 10 }));
    this.filter.set(toFilter(this._draft()));
  }

  public apply(): void {
    this.filter.set(toFilter(this._draft()));
    this.form().reset();
  }
}
