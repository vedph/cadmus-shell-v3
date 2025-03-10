import { Component, input, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

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
 * Graph triples filter used in graph triples list.
 * Its data are in the graph triples store, which gets updated when
 * users apply new filters.
 */
@Component({
  selector: 'cadmus-graph-triple-filter',
  templateUrl: './graph-triple-filter.component.html',
  styleUrls: ['./graph-triple-filter.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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
})
export class GraphTripleFilterComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  public filter$: Observable<TripleFilter>;
  public literal: FormControl<boolean>;
  public objectLit: FormControl<string | null>;
  public sid: FormControl<string | null>;
  public sidPrefix: FormControl<boolean>;
  public tag: FormControl<string | null>;
  public form: FormGroup;

  public subjectNode$: Observable<UriNode | undefined>;
  public predicateNode$: Observable<UriNode | undefined>;
  public objectNode$: Observable<UriNode | undefined>;

  public readonly disabled = input<boolean>();

  constructor(
    formBuilder: FormBuilder,
    public lookupService: GraphNodeLookupService,
    private _repository: GraphTripleListRepository
  ) {
    this.filter$ = _repository.filter$;
    this.subjectNode$ = _repository.subjectNode$;
    this.predicateNode$ = _repository.predicateNode$;
    this.objectNode$ = _repository.objectNode$;
    // form
    this.literal = formBuilder.control(false, { nonNullable: true });
    this.objectLit = formBuilder.control(null, Validators.maxLength(100));
    this.sid = formBuilder.control(null);
    this.sidPrefix = formBuilder.control(false, { nonNullable: true });
    this.tag = formBuilder.control(null);
    this.form = formBuilder.group({
      literal: this.literal,
      objectLit: this.objectLit,
      sid: this.sid,
      sidPrefix: this.sidPrefix,
      tag: this.tag,
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

  private updateForm(filter: TripleFilter): void {
    this._repository.setTermId(filter.subjectId, 'S');
    this._repository.setTermId(
      filter.predicateIds?.length ? filter.predicateIds[0] : null,
      'P'
    );
    this._repository.setTermId(filter.objectId, 'O');
    this.literal.setValue(filter.literalPattern ? true : false);
    this.objectLit.setValue(filter.literalPattern || null);
    this.sid.setValue(filter.sid || null);
    this.tag.setValue(filter.tag || null);
    this.form.markAsPristine();
  }

  private getFilter(): TripleFilter {
    const pid = this._repository.getTerm('P')?.id;
    return {
      subjectId: this._repository.getTerm('S')?.id,
      predicateIds: pid ? [pid] : undefined,
      objectId: this.literal.value
        ? undefined
        : this._repository.getTerm('O')?.id,
      literalPattern: this.literal.value
        ? this.objectLit.value?.trim()
        : undefined,
      sid: this.sid.value?.trim(),
      tag: this.tag.value?.trim(),
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
