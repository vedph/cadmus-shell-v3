import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  WritableSignal,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FieldTree, FormField, form, maxLength } from '@angular/forms/signals';
import { Observable } from 'rxjs';

import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatLabel, MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

import { UriNode, TripleFilter } from '@myrmidon/cadmus-api';

import { GraphTripleListRepository } from '../../state/graph-triple-list.repository';
import { GraphNodeLookupService } from '../../services/graph-node-lookup.service';

/**
 * The editable shape behind the filter form. Text fields use '' as their
 * empty value, as they are bound to native inputs.
 */
interface GraphTripleFilterControls {
  literal: boolean;
  objectLit: string;
  sid: string;
  sidPrefix: boolean;
  tag: string;
}

/**
 * The values of a cleared filter form.
 */
function makeEmptyDraft(): GraphTripleFilterControls {
  return { literal: false, objectLit: '', sid: '', sidPrefix: false, tag: '' };
}

function toDraft(filter: TripleFilter): GraphTripleFilterControls {
  return {
    literal: !!filter.literalPattern,
    objectLit: filter.literalPattern || '',
    sid: filter.sid || '',
    // sidPrefix is not part of TripleFilter: the old form never set it
    // from the filter either
    sidPrefix: false,
    tag: filter.tag || '',
  };
}

/**
 * Graph triples filter used in graph triples list.
 * Its data are in the graph triples store, which gets updated when
 * users apply new filters.
 */
@Component({
  selector: 'cadmus-graph-triple-filter',
  templateUrl: './graph-triple-filter.component.html',
  styleUrls: ['./graph-triple-filter.component.css'],
  imports: [
    FormField,
    RefLookupComponent,
    MatIconButton,
    MatIcon,
    MatCheckbox,
    MatLabel,
    MatFormField,
    MatInput,
    MatTooltip,
    AsyncPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphTripleFilterComponent {
  public filter$: Observable<TripleFilter>;

  public subjectNode$: Observable<UriNode | undefined>;
  public predicateNode$: Observable<UriNode | undefined>;
  public objectNode$: Observable<UriNode | undefined>;

  public readonly disabled = input<boolean>();

  /**
   * The editable draft: rebuilt from the repository filter whenever it
   * changes (including after apply), and locally edited in between.
   */
  private readonly _draft: WritableSignal<GraphTripleFilterControls>;

  public readonly form: FieldTree<GraphTripleFilterControls>;

  constructor(
    public lookupService: GraphNodeLookupService,
    private _repository: GraphTripleListRepository
  ) {
    this.filter$ = _repository.filter$;
    this.subjectNode$ = _repository.subjectNode$;
    this.predicateNode$ = _repository.predicateNode$;
    this.objectNode$ = _repository.objectNode$;

    const filter = toSignal(_repository.filter$, { requireSync: true });
    this._draft = linkedSignal(() => toDraft(filter()));
    this.form = form(this._draft, (path) => {
      // [formField] renders these as the inputs' maxlength attributes
      maxLength(path.objectLit, 100);
      maxLength(path.sid, 500);
      maxLength(path.tag, 50);
    });

    // the subject/predicate/object terms are not in the form: they live
    // in the repository, which loads them from the filter's IDs
    _repository.filter$.pipe(takeUntilDestroyed()).subscribe((f) => {
      this._repository.setTermId(f.subjectId, 'S');
      this._repository.setTermId(
        f.predicateIds?.length ? f.predicateIds[0] : null,
        'P'
      );
      this._repository.setTermId(f.objectId, 'O');
    });
  }

  private getFilter(): TripleFilter {
    const v = this._draft();
    const pid = this._repository.getTerm('P')?.id;
    return {
      subjectId: this._repository.getTerm('S')?.id,
      predicateIds: pid ? [pid] : undefined,
      objectId: v.literal ? undefined : this._repository.getTerm('O')?.id,
      literalPattern: v.literal ? v.objectLit.trim() || undefined : undefined,
      sid: v.sid.trim() || undefined,
      tag: v.tag.trim() || undefined,
    };
  }

  public onSubjectNodeChange(node?: unknown): void {
    this._repository.setTerm(node as UriNode, 'S');
  }

  public clearSubjectNode(): void {
    this._repository.setTerm(null, 'S');
  }

  public onPredicateNodeChange(node?: unknown): void {
    this._repository.setTerm(node as UriNode, 'P');
  }

  public clearPredicateNode(): void {
    this._repository.setTerm(null, 'P');
  }

  public onObjectNodeChange(node?: unknown): void {
    this._repository.setTerm(node as UriNode, 'O');
  }

  public clearObjectNode(): void {
    this._repository.setTerm(null, 'O');
  }

  public reset(): void {
    this._draft.set(makeEmptyDraft());
    // the subject/predicate/object node terms live in the repository and
    // must be cleared too, or a previously picked node would survive a
    // "reset filters" action.
    this._repository.setTerm(null, 'S');
    this._repository.setTerm(null, 'P');
    this._repository.setTerm(null, 'O');
    this.apply();
  }

  public apply(): void {
    if (this.form().invalid()) {
      return;
    }
    const filter = this.getFilter();

    // update filter in state
    this._repository.setFilter(filter);
  }
}
