import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

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
 * The editable shape behind the filter form. Text fields use '' as their
 * empty value, as they are bound to native inputs.
 */
interface GraphNodeFilterControls {
  label: string;
  /** 0=any, 1=class, 2=not-class. */
  isClass: number;
  uid: string;
  tag: string;
  sourceType: number | null;
  sid: string;
  sidPrefix: boolean;
  linkedNodeRole: 'S' | 'O' | null;
}

/**
 * The values of a cleared filter form.
 */
function makeEmptyDraft(): GraphNodeFilterControls {
  return {
    label: '',
    isClass: 0,
    uid: '',
    tag: '',
    sourceType: null,
    sid: '',
    sidPrefix: false,
    linkedNodeRole: null,
  };
}

function toDraft(filter: NodeFilter): GraphNodeFilterControls {
  return {
    label: filter.label || '',
    isClass:
      filter.isClass === undefined || filter.isClass === null
        ? 0
        : filter.isClass
          ? 1
          : 2,
    uid: filter.uid || '',
    tag: filter.tag || '',
    sourceType:
      filter.sourceType === undefined || filter.sourceType === null
        ? null
        : filter.sourceType,
    sid: filter.sid || '',
    sidPrefix: !!filter.isSidPrefix,
    linkedNodeRole: filter.linkedNodeRole || 'S',
  };
}

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
    FormField,
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
export class GraphNodeFilterComponent {
  public filter$: Observable<NodeFilter>;
  public linkedNode$: Observable<UriNode | undefined>;
  public classNodes$: Observable<UriNode[] | undefined>;

  public readonly disabled = input<boolean>();

  /**
   * The editable draft: rebuilt from the repository filter whenever it
   * changes (including after apply), and locally edited in between.
   */
  private readonly _draft: WritableSignal<GraphNodeFilterControls>;

  public readonly form: FieldTree<GraphNodeFilterControls>;

  constructor(
    public lookupService: GraphNodeLookupService,
    private _repository: NodeListRepository
  ) {
    this.filter$ = _repository.filter$;
    this.linkedNode$ = _repository.linkedNode$;
    this.classNodes$ = _repository.classNodes$;

    const filter = toSignal(_repository.filter$, { requireSync: true });
    this._draft = linkedSignal(() => toDraft(filter()));
    this.form = form(this._draft);

    // the linked node and class nodes are not in the form: they live in
    // the repository, which loads them from the filter's IDs
    _repository.filter$.pipe(takeUntilDestroyed()).subscribe((f) => {
      this._repository.setLinkedNodeId(f.linkedNodeId);
      this._repository.setClassNodeIds(f.classIds);
    });
  }

  private getFilter(): NodeFilter {
    const v = this._draft();
    return {
      label: v.label.trim() || undefined,
      isClass: v.isClass === 0 ? undefined : v.isClass === 1,
      uid: v.uid.trim() || undefined,
      tag: v.tag.trim() || undefined,
      sourceType: v.sourceType === null ? undefined : v.sourceType,
      sid: v.sid.trim() || undefined,
      isSidPrefix: v.sidPrefix,
      linkedNodeId: this._repository.getLinkedNode()?.id,
      linkedNodeRole: v.linkedNodeRole || undefined,
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
    this._draft.set(makeEmptyDraft());
    // the linked node and class nodes are filters too, held in the repository
    this._repository.setLinkedNode();
    this._repository.setClassNodeIds();
    this.apply();
  }

  public apply(): void {
    const filter = this.getFilter();

    // update filter in state
    this._repository.setFilter(filter);
  }
}
