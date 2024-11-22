import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  GraphService,
  ThesaurusService,
  UriTriple,
} from '@myrmidon/cadmus-api';
import { DialogService } from '@myrmidon/ng-mat-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DataPage } from '@myrmidon/ng-tools';

import { GraphTripleListRepository } from '../../state/graph-triple-list.repository';

@Component({
  selector: 'cadmus-graph-triple-list',
  templateUrl: './graph-triple-list.component.html',
  styleUrls: ['./graph-triple-list.component.css'],
  standalone: false,
})
export class GraphTripleListComponent implements OnInit {
  public page$: Observable<DataPage<UriTriple>>;
  public loading$: Observable<boolean | undefined>;
  public editedTriple?: UriTriple;

  /**
   * The optional set of thesaurus entries for triple's tags.
   */
  @Input()
  public tagEntries: ThesaurusEntry[] | undefined;

  constructor(
    private _graphService: GraphService,
    private _dialogService: DialogService,
    private _snackbar: MatSnackBar,
    private _thesService: ThesaurusService,
    private _repository: GraphTripleListRepository
  ) {
    this.page$ = _repository.page$;
    this.loading$ = _repository.loading$;
  }

  ngOnInit(): void {
    this._thesService
      .getThesaurus('graph-triple-tags@en', true)
      .subscribe((thesaurus) => {
        this.tagEntries = thesaurus?.entries || [];
      });
  }

  public onPageChange(event: PageEvent): void {
    this._repository.setPage(event.pageIndex + 1, event.pageSize);
  }

  public addTriple(): void {
    this.editedTriple = {
      id: 0,
      subjectId: 0,
      predicateId: 0,
      objectId: 0,
      subjectUri: '',
      predicateUri: '',
    };
  }

  public editTriple(triple: UriTriple): void {
    this.editedTriple = triple;
  }

  public onTripleChange(triple: UriTriple): void {
    this._graphService
      .addTriple(triple)
      .pipe(take(1))
      .subscribe({
        next: (n) => {
          this.editedTriple = undefined;
          this._repository.reset();
          this._snackbar.open('Triple saved', 'OK', {
            duration: 1500,
          });
        },
        error: (error) => {
          if (error) {
            console.error(JSON.stringify(error));
          }
          this._snackbar.open('Error saving triple', 'OK');
        },
      });
  }

  public onEditorClose(): void {
    this.editedTriple = undefined;
  }

  public deleteTriple(triple: UriTriple): void {
    this._dialogService
      .confirm('Delete Triple', 'Delete triple?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          this._graphService
            .deleteTriple(triple.id)
            .pipe(take(1))
            .subscribe({
              next: (_) => {
                this._repository.reset();
              },
              error: (error) => {
                if (error) {
                  console.error(JSON.stringify(error));
                }
                this._snackbar.open('Error deleting triple', 'OK');
              },
            });
        }
      });
  }

  public reset(): void {
    this._repository.reset();
  }
}
