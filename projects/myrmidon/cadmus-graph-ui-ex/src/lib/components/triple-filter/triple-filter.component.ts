import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin, from } from 'rxjs';

import { GraphNodeLookupService } from '@myrmidon/cadmus-graph-ui';

import { GraphService, UriNode } from '@myrmidon/cadmus-api';

import { PagedTripleFilter } from '../../graph-walker';

/**
 * Triples filter.
 */
@Component({
  selector: 'cadmus-walker-triple-filter',
  templateUrl: './triple-filter.component.html',
  styleUrls: ['./triple-filter.component.css'],
  standalone: false,
})
export class TripleFilterComponent implements OnInit {
  private _filter: PagedTripleFilter;

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
  public get filter(): PagedTripleFilter {
    return this._filter;
  }
  public set filter(value: PagedTripleFilter) {
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
  public filterChange: EventEmitter<PagedTripleFilter>;

  public pageNumber: FormControl<number>;
  public pageSize: FormControl<number>;
  public litPattern: FormControl<string | null>;
  public litType: FormControl<string | null>;
  public litLanguage: FormControl<string | null>;
  public minLitNumber: FormControl<number | null>;
  public maxLitNumber: FormControl<number | null>;

  public subj: FormControl<UriNode | null>;
  public isNotPred: FormControl<boolean>;
  public preds: FormControl<UriNode[]>;
  public notPreds: FormControl<UriNode[]>;
  public hasLiteralObj: FormControl<boolean | null>;
  public obj: FormControl<UriNode | null>;
  public sid: FormControl<string | null>;
  public isSidPrefix: FormControl<boolean>;
  public tag: FormControl<string | null>;

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
    this.filterChange = new EventEmitter<PagedTripleFilter>();
    // form
    this.pageNumber = formBuilder.control(1, { nonNullable: true });
    this.pageSize = formBuilder.control(10, { nonNullable: true });
    this.litPattern = formBuilder.control(null);
    this.litType = formBuilder.control(null);
    this.litLanguage = formBuilder.control(null);
    this.minLitNumber = formBuilder.control(null);
    this.maxLitNumber = formBuilder.control(null);

    this.subj = formBuilder.control(null);
    this.preds = formBuilder.control([], { nonNullable: true });
    this.isNotPred = formBuilder.control(false, { nonNullable: true });
    this.notPreds = formBuilder.control([], { nonNullable: true });
    this.hasLiteralObj = formBuilder.control(null);
    this.obj = formBuilder.control(null);
    this.sid = formBuilder.control(null);
    this.isSidPrefix = formBuilder.control(false, { nonNullable: true });
    this.tag = formBuilder.control(null);

    this.form = formBuilder.group({
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      litPattern: this.litPattern,
      litType: this.litType,
      litLanguage: this.litLanguage,
      minLitNumber: this.minLitNumber,
      maxLitNumber: this.maxLitNumber,

      subj: this.subj,
      preds: this.preds,
      isNotPred: this.isNotPred,
      notPreds: this.notPreds,
      hasLiteralObj: this.hasLiteralObj,
      obj: this.obj,
      sid: this.sid,
      isSidPrefix: this.isSidPrefix,
      tag: this.tag,
    });
  }

  ngOnInit(): void {}

  private updateForm(filter: PagedTripleFilter): void {
    this.pageNumber.setValue(filter.pageNumber);
    this.pageSize.setValue(filter.pageSize);
    this.litPattern.setValue(filter.literalPattern || null);
    this.litType.setValue(filter.literalType || null);
    this.litLanguage.setValue(filter.literalLanguage || null);
    this.minLitNumber.setValue(filter.minLiteralNumber || null);
    this.maxLitNumber.setValue(filter.maxLiteralNumber || null);

    this.hasLiteralObj.setValue(filter.hasLiteralObject || null);
    this.sid.setValue(filter.sid || null);
    this.isSidPrefix.setValue(filter.isSidPrefix || false);
    this.tag.setValue(filter.tag || null);

    // load the referenced nodes so we can show them by label
    forkJoin({
      s: filter.subjectId
        ? this._graphService.getNode(filter.subjectId)
        : from([null]),
      p: filter.predicateIds?.length
        ? this._graphService.getNodeSet(filter.predicateIds)
        : from([]),
      o: filter.objectId
        ? this._graphService.getNode(filter.objectId)
        : from([null]),
    }).subscribe((result) => {
      this.subj.setValue(result.s);
      this.preds.setValue(result.p.filter((n) => n) as UriNode[]);
      this.obj.setValue(result.o);
      this.form.markAsPristine();
    });
  }

  private getFilter(): PagedTripleFilter {
    return {
      pageNumber: +this.pageNumber.value,
      pageSize: +this.pageSize.value,
      literalPattern: this.litPattern.value || undefined,
      literalType: this.litType.value || undefined,
      literalLanguage: this.litLanguage.value || undefined,
      minLiteralNumber: this.minLitNumber.value || undefined,
      maxLiteralNumber: this.maxLitNumber.value || undefined,

      subjectId: this.subj.value?.id || undefined,
      predicateIds: this.preds.value?.length
        ? this.preds.value.map((n) => n.id)
        : undefined,
      notPredicateIds: this.notPreds.value?.length
        ? this.notPreds.value.map((n) => n.id)
        : undefined,
      hasLiteralObject:
        this.hasLiteralObj.value !== null
          ? this.hasLiteralObj.value
          : undefined,
      objectId: this.obj.value?.id || undefined,
      sid: this.sid.value || undefined,
      isSidPrefix: this.isSidPrefix.value,
      tag: this.tag.value || undefined,
    };
  }

  private emitFilterChange(): void {
    this.filterChange.emit(this.getFilter());
  }

  public onPageChange(page: PageEvent): void {
    this.pageNumber.setValue(page.pageIndex + 1);
    this.emitFilterChange();
  }

  public onSubjectNodeChange(node: unknown): void {
    this.subj.setValue(node as UriNode);
  }

  public onObjectNodeChange(node: unknown): void {
    this.obj.setValue(node as UriNode);
  }

  public onPredicateNodeChange(node: unknown): void {
    if (!node) {
      return;
    }
    const un = node as UriNode;
    if (this.isNotPred.value) {
      const nodes = [...this.notPreds.value];
      if (nodes.some((n) => n.id === un.id)) {
        return;
      }
      nodes.push(un);
      this.notPreds.setValue(nodes);
      this.notPreds.updateValueAndValidity();
      this.notPreds.markAsDirty();
    } else {
      const nodes = [...this.preds.value];
      if (nodes.some((n) => n.id === un.id)) {
        return;
      }
      nodes.push(un);
      this.preds.setValue(nodes);
      this.preds.updateValueAndValidity();
      this.preds.markAsDirty();
    }
  }

  public deleteNotPred(node: UriNode): void {
    const nodes = [...this.notPreds.value];
    const i = nodes.indexOf(node);
    nodes.splice(i, 1);
    this.notPreds.setValue(nodes);
    this.notPreds.updateValueAndValidity();
    this.notPreds.markAsDirty();
  }

  public deletePred(node: UriNode): void {
    const nodes = [...this.preds.value];
    const i = nodes.indexOf(node);
    nodes.splice(i, 1);
    this.preds.setValue(nodes);
    this.preds.updateValueAndValidity();
    this.preds.markAsDirty();
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
