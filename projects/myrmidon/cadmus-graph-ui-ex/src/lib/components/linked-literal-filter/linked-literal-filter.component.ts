import { ChangeDetectionStrategy, Component, effect, input, model } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
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
 * Linked literal filter.
 */
@Component({
  selector: 'cadmus-walker-linked-literal-filter',
  templateUrl: './linked-literal-filter.component.html',
  styleUrls: ['./linked-literal-filter.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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

    effect(() => {
      this.updateForm(this.filter());
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

  public onSubjectNodeChange(node: unknown): void {
    this.subj.setValue(node as UriNode);
  }

  public onPredicateNodeChange(node: unknown): void {
    this.pred.setValue(node as UriNode);
  }

  public onPageChange(page: PageEvent): void {
    this.pageNumber.setValue(page.pageIndex + 1);
    this.filter.set(this.getFilter());
  }

  public reset(): void {
    this.form.reset();
    this.filter.set(this.getFilter());
  }

  public apply(): void {
    if (this.form.invalid) {
      return;
    }
    this.filter.set(this.getFilter());
    this.form.markAsPristine();
  }
}
