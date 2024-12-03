import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

import { DataPage, EnvService } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';

import { Thesaurus } from '@myrmidon/cadmus-core';
import { ThesaurusService, UserLevelService } from '@myrmidon/cadmus-api';

import { ThesaurusListRepository } from '../state/thesaurus-list.repository';

@Component({
  selector: 'cadmus-thesaurus-list',
  templateUrl: './thesaurus-list.component.html',
  styleUrls: ['./thesaurus-list.component.css'],
  standalone: false,
})
export class ThesaurusListComponent implements OnInit {
  public loading$: Observable<boolean | undefined>;
  public page$: Observable<DataPage<Thesaurus>>;
  public user?: User;
  public userLevel: number;
  public downloading?: boolean;
  public importEnabled?: boolean;

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
    this.userLevel = 0;
    this.loading$ = _repository.loading$;
    this.page$ = _repository.page$;
    this.importEnabled =
      _authService.isCurrentUserInRole('admin') && env.get('thesImportEnabled')
        ? true
        : false;
  }

  ngOnInit(): void {
    this._authService.currentUser$.subscribe((user: User | null) => {
      this.user = user ?? undefined;
      this.userLevel = this._userLevelService.getCurrentUserLevel();
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
    if (this.user?.roles.every((r) => r !== 'admin' && r !== 'editor')) {
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
    if (this.downloading) {
      return;
    }
    this.downloading = true;

    this._thesaurusService.getThesaurus(id).subscribe({
      next: (thesaurus) => {
        this.downloading = false;
        const json = JSON.stringify(thesaurus, null, 2);

        const element = document.createElement('a');
        const file = new Blob([json], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = `${thesaurus.id}.json`;
        document.body.appendChild(element);
        element.click();
      },
      error: (err) => {
        this.downloading = false;
        console.error(err);
        this._snackbar.open('Error downloading thesaurus', 'OK');
      },
    });
  }

  public onUploadEnd(): void {
    this._repository.reset();
  }
}
