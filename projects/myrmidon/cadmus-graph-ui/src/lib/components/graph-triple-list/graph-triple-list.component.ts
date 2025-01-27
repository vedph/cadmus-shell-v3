import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { take } from 'rxjs/operators';

import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
} from '@angular/material/expansion';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { DataPage, EllipsisPipe } from '@myrmidon/ngx-tools';

import {
  GraphService,
  ThesaurusService,
  UriTriple,
} from '@myrmidon/cadmus-api';

import { GraphTripleFilterComponent } from '../graph-triple-filter/graph-triple-filter.component';
import { GraphTripleEditorComponent } from '../graph-triple-editor/graph-triple-editor.component';
import { GraphTripleListRepository } from '../../state/graph-triple-list.repository';

@Component({
  selector: 'cadmus-graph-triple-list',
  templateUrl: './graph-triple-list.component.html',
  styleUrls: ['./graph-triple-list.component.css'],
  imports: [
    MatCard,
    MatCardContent,
    GraphTripleFilterComponent,
    MatProgressBar,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatButton,
    MatPaginator,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    GraphTripleEditorComponent,
    AsyncPipe,
    EllipsisPipe,
  ],
})
export class GraphTripleListComponent {
  public page$: Observable<DataPage<UriTriple>>;
  public loading$: Observable<boolean | undefined>;
  public editedTriple?: UriTriple;

  /**
   * The optional set of thesaurus entries for triple's tags.
   */
  // public readonly tagEntries = input<ThesaurusEntry[]>();

  constructor(
    private _graphService: GraphService,
    private _dialogService: DialogService,
    private _snackbar: MatSnackBar,
    private _repository: GraphTripleListRepository
  ) {
    this.page$ = _repository.page$;
    this.loading$ = _repository.loading$;
  }

  // ngOnInit(): void {
  //   this._thesService
  //     .getThesaurus('graph-triple-tags@en', true)
  //     .subscribe((thesaurus) => {
  //       this.tagEntries = thesaurus?.entries || [];
  //     });
  // }

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
          console.error('Error saving triple', error);
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
                console.error('Error deleting triple', error);
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
