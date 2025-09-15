import { Component, Input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

import { DataPage, EnvService } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';

import { Thesaurus } from '@myrmidon/cadmus-core';
import { ThesaurusService, UserLevelService } from '@myrmidon/cadmus-api';

import { ThesaurusFilterComponent } from '../thesaurus-filter/thesaurus-filter.component';
import { ThesaurusListRepository } from '../state/thesaurus-list.repository';
import { ThesaurusImportComponent } from '../thesaurus-import/thesaurus-import.component';

@Component({
  selector: 'cadmus-thesaurus-list',
  templateUrl: './thesaurus-list.component.html',
  styleUrls: ['./thesaurus-list.component.css'],
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    ThesaurusFilterComponent,
    MatProgressBar,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatPaginator,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    ThesaurusImportComponent,
    MatCardActions,
    MatButton,
    AsyncPipe,
  ],
})
export class ThesaurusListComponent implements OnInit {
  public loading$: Observable<boolean | undefined>;
  public page$: Observable<DataPage<Thesaurus>>;

  public readonly userLevel = signal<number>(0);
  public readonly downloading = signal<boolean>(false);
  public readonly importEnabled = signal<boolean>(false);

  constructor(
    private _repository: ThesaurusListRepository,
    private _thesaurusService: ThesaurusService,
    private _dialogService: DialogService,
    private _router: Router,
    private _authService: AuthJwtService,
    private _userLevelService: UserLevelService,
    private _snackbar: MatSnackBar,
    env: EnvService
  ) {
    this.loading$ = _repository.loading$;
    this.page$ = _repository.page$;
    this.importEnabled.set(
      _authService.isCurrentUserInRole('admin') && env.get('thesImportEnabled')
        ? true
        : false
    );
  }

  ngOnInit(): void {
    this._authService.currentUser$.subscribe((user: User | null) => {
      this.userLevel.set(this._userLevelService.getCurrentUserLevel());
    });
  }

  public onPageChange(event: PageEvent): void {
    this._repository.setPage(event.pageIndex + 1, event.pageSize);
  }

  public addThesaurus(): void {
    this._router.navigate(['/thesauri', 'new']);
  }

  public editThesaurus(thesaurus: Thesaurus): void {
    this._router.navigate(['/thesauri', thesaurus.id]);
  }

  public deleteThesaurus(thesaurus: Thesaurus): void {
    if (this.userLevel() < 3) {
      return;
    }

    this._dialogService
      .confirm('Confirm Deletion', `Delete thesaurus "${thesaurus.id}"?`)
      .subscribe((yes: boolean) => {
        if (yes) {
          this._repository.deleteThesaurus(thesaurus.id);
        }
      });
  }

  public downloadThesaurus(id: string): void {
    if (this.downloading()) {
      return;
    }
    this.downloading.set(true);

    this._thesaurusService.getThesaurus(id).subscribe({
      next: (thesaurus) => {
        this.downloading.set(false);
        const json = JSON.stringify(thesaurus, null, 2);

        const element = document.createElement('a');
        const file = new Blob([json], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = `${thesaurus.id}.json`;
        document.body.appendChild(element);
        element.click();
      },
      error: (err) => {
        this.downloading.set(false);
        console.error(err);
        this._snackbar.open('Error downloading thesaurus', 'OK');
      },
    });
  }

  public onUploadEnd(): void {
    this._repository.reset();
  }
}
