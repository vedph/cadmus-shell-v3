import { ChangeDetectionStrategy, Component, effect, input, model } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
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
 * Linked non-literal node filter.
 */
@Component({
  selector: 'cadmus-walker-linked-node-filter',
  templateUrl: './linked-node-filter.component.html',
  styleUrls: ['./linked-node-filter.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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

  public otherNodeId: number;
  public predicateId: number;
  public isObject: boolean;

  public pageNumber: FormControl<number>;
  public pageSize: FormControl<number>;
  public uid: FormControl<string | null>;
  public isClass: FormControl<boolean | null>;
  public tag: FormControl<string | null>;
  public label: FormControl<string | null>;
  public sourceType: FormControl<NodeSourceType | null>;
  public sid: FormControl<string | null>;
  public isSidPrefix: FormControl<boolean>;
  public classes: FormControl<UriNode[]>;

  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    public lookupService: GraphNodeLookupService,
    private _graphService: GraphService
  ) {
    this.otherNodeId = 0;
    this.predicateId = 0;
    this.isObject = false;
    // form
    this.pageNumber = formBuilder.control(1, { nonNullable: true });
    this.pageSize = formBuilder.control(10, { nonNullable: true });
    this.uid = formBuilder.control(null);
    this.isClass = formBuilder.control(null);
    this.tag = formBuilder.control(null);
    this.label = formBuilder.control(null);
    this.sourceType = formBuilder.control(null);
    this.sid = formBuilder.control(null);
    this.isSidPrefix = formBuilder.control(false, { nonNullable: true });
    this.classes = formBuilder.control([], { nonNullable: true });

    this.form = formBuilder.group({
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      uid: this.uid,
      isClass: this.isClass,
      tag: this.tag,
      label: this.label,
      sourceType: this.sourceType,
      sid: this.sid,
      isSidPrefix: this.isSidPrefix,
      classes: this.classes,
    });

    effect(() => {
      this.updateForm(this.filter());
    });
  }

  private updateForm(filter: PagedLinkedNodeFilter): void {
    this.otherNodeId = filter.otherNodeId;
    this.predicateId = filter.predicateId;
    this.isObject = filter.isObject || false;

    this.pageNumber.setValue(filter.pageNumber);
    this.pageSize.setValue(filter.pageSize);
    this.uid.setValue(filter.uid || null);
    this.isClass.setValue(filter.isClass || null);
    this.tag.setValue(filter.tag || null);
    this.label.setValue(filter.label || null);
    this.sourceType.setValue(filter.sourceType || null);
    this.sid.setValue(filter.sid || null);
    this.isSidPrefix.setValue(filter.isSidPrefix || false);

    // load the referenced class nodes so we can show them by label
    if (filter.classIds?.length) {
      this._graphService
        .getNodeSet(filter.classIds)
        .pipe(take(1))
        .subscribe((nodes) => {
          this.classes.setValue(nodes.filter((n) => n) as UriNode[]);
          this.form.markAsPristine();
        });
    } else {
      this.classes.setValue([]);
      this.form.markAsPristine();
    }
  }

  private getFilter(): PagedLinkedNodeFilter {
    return {
      pageNumber: +this.pageNumber.value,
      pageSize: +this.pageSize.value,
      uid: this.uid.value || undefined,
      isClass: this.isClass.value || undefined,
      tag: this.tag.value || undefined,
      label: this.label.value || undefined,
      sourceType: this.sourceType.value || undefined,
      sid: this.sid.value || undefined,
      isSidPrefix: this.isSidPrefix.value ? true : undefined,
      classIds: this.classes.value.length
        ? this.classes.value.map((n) => n.id)
        : undefined,
      otherNodeId: this.otherNodeId,
      predicateId: this.predicateId,
      isObject: this.isObject,
    };
  }

  public onPageChange(page: PageEvent): void {
    this.pageNumber.setValue(page.pageIndex + 1);
    this.filter.set(this.getFilter());
  }

  public onClassAdd(node: unknown): void {
    if (!node) {
      return;
    }
    const nodes = [...this.classes.value];
    nodes.push(node as UriNode);
    this.classes.setValue(nodes);
    this.classes.updateValueAndValidity();
    this.classes.markAsDirty();
  }

  public onClassRemove(node: UriNode): void {
    const nodes = [...this.classes.value];
    const i = nodes.indexOf(node);
    if (i > -1) {
      nodes.splice(i, 1);
      this.classes.setValue(nodes);
      this.classes.updateValueAndValidity();
      this.classes.markAsDirty();
    }
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
