import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin, from } from 'rxjs';

import { GraphNodeLookupService } from '@myrmidon/cadmus-graph-ui';

import { GraphService, UriNode } from '@myrmidon/cadmus-api';

import { PagedLinkedLiteralFilter } from '../../graph-walker';

/**
 * Linked literal filter.
 */
@Component({
  selector: 'cadmus-walker-linked-literal-filter',
  templateUrl: './linked-literal-filter.component.html',
  styleUrls: ['./linked-literal-filter.component.css'],
  standalone: false,
})
export class LinkedLiteralFilterComponent {
  private _filter: PagedLinkedLiteralFilter;

  /**
   * True if this component is disabled.
   */
  @Input()
  public disabled: boolean | undefined | null;

  /**
   * True if this component should show a pager.
   */
  @Input()
  public hasPager: boolean | undefined | null;

  /**
   * The total number of triples returned from the last
   * page fetch operation. Used when hasPager is true.
   */
  @Input()
  public total: number;

  /**
   * The filter.
   */
  @Input()
  public get filter(): PagedLinkedLiteralFilter {
    return this._filter;
  }
  public set filter(value: PagedLinkedLiteralFilter) {
    if (this._filter === value) {
      return;
    }
    this._filter = value;
    this.updateForm(value);
  }

  /**
   * Emitted when filter changes.
   */
  @Output()
  public filterChange: EventEmitter<PagedLinkedLiteralFilter>;

  public pageNumber: FormControl<number>;
  public pageSize: FormControl<number>;
  public litPattern: FormControl<string | null>;
  public litType: FormControl<string | null>;
  public litLanguage: FormControl<string | null>;
  public minLitNumber: FormControl<number | null>;
  public maxLitNumber: FormControl<number | null>;

  public subj: FormControl<UriNode | null>;
  public pred: FormControl<UriNode | null>;

  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    public lookupService: GraphNodeLookupService,
    private _graphService: GraphService
  ) {
    this._filter = {
      pageNumber: 1,
      pageSize: 10,
    };
    this.total = 0;
    this.filterChange = new EventEmitter<PagedLinkedLiteralFilter>();
    // form
    this.pageNumber = formBuilder.control(1, { nonNullable: true });
    this.pageSize = formBuilder.control(10, { nonNullable: true });
    this.litPattern = formBuilder.control(null);
    this.litType = formBuilder.control(null);
    this.litLanguage = formBuilder.control(null);
    this.minLitNumber = formBuilder.control(null);
    this.maxLitNumber = formBuilder.control(null);

    this.subj = formBuilder.control(null);
    this.pred = formBuilder.control(null);

    this.form = formBuilder.group({
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      litPattern: this.litPattern,
      litType: this.litType,
      litLanguage: this.litLanguage,
      minLitNumber: this.minLitNumber,
      maxLitNumber: this.maxLitNumber,
      subj: this.subj,
      pred: this.pred,
    });
  }

  private updateForm(filter: PagedLinkedLiteralFilter): void {
    this.pageNumber.setValue(filter.pageNumber);
    this.pageSize.setValue(filter.pageSize);
    this.litPattern.setValue(filter.literalPattern || null);
    this.litType.setValue(filter.literalType || null);
    this.litLanguage.setValue(filter.literalLanguage || null);
    this.minLitNumber.setValue(filter.minLiteralNumber || null);
    this.maxLitNumber.setValue(filter.maxLiteralNumber || null);

    // load the referenced triples so we can show them by label
    forkJoin({
      s: filter.subjectId
        ? this._graphService.getNode(filter.subjectId)
        : from([null]),
      p: filter.predicateId
        ? this._graphService.getNode(filter.predicateId)
        : from([]),
    }).subscribe((result) => {
      this.subj.setValue(result.s);
      this.pred.setValue(result.p);
      this.form.markAsPristine();
    });
  }

  private getFilter(): PagedLinkedLiteralFilter {
    return {
      pageNumber: +this.pageNumber.value,
      pageSize: +this.pageSize.value,
      literalPattern: this.litPattern.value || undefined,
      literalType: this.litType.value || undefined,
      literalLanguage: this.litLanguage.value || undefined,
      minLiteralNumber: this.minLitNumber.value || undefined,
      maxLiteralNumber: this.maxLitNumber.value || undefined,

      subjectId: this.subj.value?.id,
      predicateId: this.pred.value?.id,
    };
  }

  private emitFilterChange(): void {
    this.filterChange.emit(this.getFilter());
  }

  public onSubjectNodeChange(node: unknown): void {
    this.subj.setValue(node as UriNode);
  }

  public onPredicateNodeChange(node: unknown): void {
    this.pred.setValue(node as UriNode);
  }

  public onPageChange(page: PageEvent): void {
    this.pageNumber.setValue(page.pageIndex + 1);
    this.emitFilterChange();
  }

  public reset(): void {
    this.form.reset();
    this._filter = this.getFilter();
    this.filterChange.emit(this._filter);
  }

  public apply(): void {
    if (this.form.invalid) {
      return;
    }
    this.emitFilterChange();
    this.form.markAsPristine();
  }
}
