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
import { forkJoin, from } from 'rxjs';

import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { GraphNodeLookupService } from '@myrmidon/cadmus-graph-ui';
import { GraphService, UriNode } from '@myrmidon/cadmus-api';

import { PagedLinkedLiteralFilter } from '../../graph-walker';

/**
 * The editable shape behind the filter form. Text fields use '' as their
 * empty value, as they are bound to native inputs; the subject and
 * predicate nodes are picked via lookups.
 */
interface LinkedLiteralFilterControls {
  pageNumber: number;
  pageSize: number;
  litPattern: string;
  litType: string;
  litLanguage: string;
  minLitNumber: number | null;
  maxLitNumber: number | null;
  subj: UriNode | null;
  pred: UriNode | null;
}

/**
 * Bound filter -> draft. Nodes are not part of the filter (only their IDs
 * are), so they start as null and get loaded afterwards.
 */
function toDraft(filter: PagedLinkedLiteralFilter): LinkedLiteralFilterControls {
  return {
    pageNumber: filter.pageNumber,
    pageSize: filter.pageSize,
    litPattern: filter.literalPattern || '',
    litType: filter.literalType || '',
    litLanguage: filter.literalLanguage || '',
    minLitNumber: filter.minLiteralNumber ?? null,
    maxLitNumber: filter.maxLiteralNumber ?? null,
    subj: null,
    pred: null,
  };
}

function toFilter(v: LinkedLiteralFilterControls): PagedLinkedLiteralFilter {
  return {
    pageNumber: +v.pageNumber,
    pageSize: +v.pageSize,
    literalPattern: v.litPattern || undefined,
    literalType: v.litType || undefined,
    literalLanguage: v.litLanguage || undefined,
    minLiteralNumber: v.minLitNumber ?? undefined,
    maxLiteralNumber: v.maxLitNumber ?? undefined,

    subjectId: v.subj?.id,
    predicateId: v.pred?.id,
  };
}

function isSameFilter(
  filter: PagedLinkedLiteralFilter,
  v: LinkedLiteralFilterControls
): boolean {
  return JSON.stringify(filter) === JSON.stringify(toFilter(v));
}

/**
 * Linked literal filter.
 */
@Component({
  selector: 'cadmus-walker-linked-literal-filter',
  templateUrl: './linked-literal-filter.component.html',
  styleUrls: ['./linked-literal-filter.component.css'],
  imports: [
    FormField,
    MatPaginator,
    RefLookupComponent,
    MatFormField,
    MatInput,
    MatIconButton,
    MatTooltip,
    MatIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkedLiteralFilterComponent {
  /**
   * True if this component is disabled.
   */
  public readonly disabled = input<boolean>();

  /**
   * True if this component should show a pager.
   */
  public readonly hasPager = input<boolean>();

  /**
   * The total number of triples returned from the last
   * page fetch operation. Used when hasPager is true.
   */
  public readonly total = input<number>(0);

  /**
   * The filter.
   */
  public readonly filter = model<PagedLinkedLiteralFilter>({
    pageNumber: 1,
    pageSize: 10,
  });

  /**
   * The editable draft, derived from filter. On the echo of our own apply
   * the live draft is kept (with its already loaded nodes).
   */
  private readonly _draft = linkedSignal<
    PagedLinkedLiteralFilter,
    LinkedLiteralFilterControls
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
  private loadNodes(filter: PagedLinkedLiteralFilter): void {
    forkJoin({
      s: filter.subjectId
        ? this._graphService.getNode(filter.subjectId)
        : from([null]),
      // from([]) emits no value at all, which would make forkJoin never
      // emit (and so never update subj/pred) even when subjectId IS set;
      // from([null]) emits a single value, matching the placeholder used
      // by the s branch above.
      p: filter.predicateId
        ? this._graphService.getNode(filter.predicateId)
        : from([null]),
    }).subscribe((result) => {
      // ignore a late response for a filter no longer bound
      const current = this.filter();
      if (
        current.subjectId !== filter.subjectId ||
        current.predicateId !== filter.predicateId
      ) {
        return;
      }
      this.form.subj().value.set(result.s);
      this.form.pred().value.set(result.p);
    });
  }

  public onSubjectNodeChange(node: unknown): void {
    this.form.subj().value.set(node as UriNode);
  }

  public onPredicateNodeChange(node: unknown): void {
    this.form.pred().value.set(node as UriNode);
  }

  public onPageChange(page: PageEvent): void {
    this.form.pageNumber().value.set(page.pageIndex + 1);
    this.filter.set(toFilter(this._draft()));
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
