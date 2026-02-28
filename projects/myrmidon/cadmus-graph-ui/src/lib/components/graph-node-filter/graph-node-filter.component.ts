import { ChangeDetectionStrategy, Component, input, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import {
  MatChipListbox,
  MatChipOption,
  MatChipRemove,
} from '@angular/material/chips';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { NodeFilter, UriNode } from '@myrmidon/cadmus-api';

import { NodeListRepository } from '../../state/graph-node-list.repository';
import { GraphNodeLookupService } from '../../services/graph-node-lookup.service';

/**
 * Graph nodes filter used in graph nodes list.
 * Its data are in the graph nodes store, which gets updated when
 * users apply new filters.
 */
@Component({
  selector: 'cadmus-graph-node-filter',
  templateUrl: './graph-node-filter.component.html',
  styleUrls: ['./graph-node-filter.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
    MatCheckbox,
    RefLookupComponent,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatChipListbox,
    MatChipOption,
    MatChipRemove,
    AsyncPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphNodeFilterComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  public filter$: Observable<NodeFilter>;
  public linkedNode$: Observable<UriNode | undefined>;
  public classNodes$: Observable<UriNode[] | undefined>;

  public readonly disabled = input<boolean>();

  public label: FormControl<string | null>;
  public isClass: FormControl<number>;
  public uid: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public sourceType: FormControl<number | null>;
  public sid: FormControl<string | null>;
  public sidPrefix: FormControl<boolean>;
  public linkedNodeRole: FormControl<'S' | 'O' | null>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    public lookupService: GraphNodeLookupService,
    private _repository: NodeListRepository
  ) {
    this.filter$ = _repository.filter$;
    this.linkedNode$ = _repository.linkedNode$;
    this.classNodes$ = _repository.classNodes$;
    // form
    this.label = formBuilder.control(null);
    this.isClass = formBuilder.control(0, { nonNullable: true });
    this.uid = formBuilder.control(null);
    this.tag = formBuilder.control(null);
    this.sourceType = formBuilder.control(null);
    this.sid = formBuilder.control(null);
    this.sidPrefix = formBuilder.control(false, { nonNullable: true });
    this.linkedNodeRole = formBuilder.control(null);
    this.form = formBuilder.group({
      label: this.label,
      isClass: this.isClass,
      uid: this.uid,
      tag: this.tag,
      sourceType: this.sourceType,
      sid: this.sid,
      sidPrefix: this.sidPrefix,
      linkedNodeRole: this.linkedNodeRole,
    });
  }

  public ngOnInit(): void {
    this._sub = this.filter$.subscribe((f) => {
      this.updateForm(f);
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private updateForm(filter: NodeFilter): void {
    this.label.setValue(filter.label || null);
    // is-class: 0=unset, 1=class, 2=not-class
    if (filter.isClass !== undefined && filter.isClass !== null) {
      this.isClass.setValue(filter.isClass ? 1 : 2);
    } else {
      this.isClass.setValue(0);
    }
    this.uid.setValue(filter.uid || null);
    this.tag.setValue(filter.tag || null);
    if (filter.sourceType === undefined || filter.sourceType === null) {
      this.sourceType.setValue(null);
    } else {
      this.sourceType.setValue(filter.sourceType);
    }
    this.sid.setValue(filter.sid || null);
    this.sidPrefix.setValue(filter.isSidPrefix ? true : false);
    this._repository.setLinkedNodeId(filter.linkedNodeId);
    this.linkedNodeRole.setValue(filter.linkedNodeRole || 'S');
    this._repository.setClassNodeIds(filter.classIds);
    this.form.markAsPristine();
  }

  private getFilter(): NodeFilter {
    return {
      label: this.label.value?.trim(),
      isClass: this.isClass.value === 0 ? undefined : this.isClass.value === 1,
      uid: this.uid.value?.trim(),
      tag: this.tag.value?.trim(),
      sourceType:
        this.sourceType.value === null ? undefined : this.sourceType.value,
      sid: this.sid.value?.trim(),
      isSidPrefix: this.sidPrefix.value,
      linkedNodeId: this._repository.getLinkedNode()?.id,
      linkedNodeRole: this.linkedNodeRole.value || undefined,
      classIds: this._repository.getClassNodes()?.map((n) => n.id),
    };
  }

  public onResetLinkedNode(): void {
    this._repository.setLinkedNode();
  }

  public onLinkedNodeSet(node: unknown): void {
    this._repository.setLinkedNode((node as UriNode) || undefined);
  }

  public clearLinkedNode(): void {
    this._repository.setLinkedNode();
  }

  public onClassAdd(node: unknown): void {
    if (node) {
      this._repository.addClassNode(node as UriNode);
    }
  }

  public onClassRemove(id: number): void {
    this._repository.deleteClassNode(id);
  }

  public reset(): void {
    this.form.reset();
    this.apply();
  }

  public apply(): void {
    if (this.form.invalid) {
      return;
    }
    const filter = this.getFilter();

    // update filter in state
    this._repository.setFilter(filter);
  }
}
