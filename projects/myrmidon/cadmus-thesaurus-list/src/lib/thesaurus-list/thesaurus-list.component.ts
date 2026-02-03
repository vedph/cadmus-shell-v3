import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { AsyncPipe } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  Observable,
  catchError,
  filter,
  finalize,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';

import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatError, MatFormField, MatLabel } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DataPage, EnvService } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import { Thesaurus } from '@myrmidon/cadmus-core';
import { ThesaurusService, UserLevelService } from '@myrmidon/cadmus-api';

import { ThesaurusFilterComponent } from '../thesaurus-filter/thesaurus-filter.component';
import { ThesaurusListRepository } from '../state/thesaurus-list.repository';
import { ThesaurusImportComponent } from '../thesaurus-import/thesaurus-import.component';

/**
 * Thesaurus list component. This lists thesauri with paging and
 * filtering capabilities, and allows adding, editing, deleting,
 * and downloading thesauri; it can also import them if enabled.
 */
@Component({
  selector: 'cadmus-thesaurus-list',
  templateUrl: './thesaurus-list.component.html',
  styleUrls: ['./thesaurus-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatButton,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatError,
    MatProgressBar,
    MatFormField,
    MatIconButton,
    MatIcon,
    MatInput,
    MatLabel,
    MatTooltip,
    MatPaginator,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    ThesaurusFilterComponent,
    ThesaurusImportComponent,
  ],
})
export class ThesaurusListComponent implements OnInit {
  private readonly _destroyRef = inject(DestroyRef);

  public loading$: Observable<boolean | undefined>;
  public page$: Observable<DataPage<Thesaurus>>;

  public readonly userLevel = signal<number>(0);
  public readonly downloading = signal<boolean>(false);
  public readonly importEnabled = signal<boolean>(false);
  public readonly adding = signal<boolean>(false);

  public newThesaurusId: FormControl<string>;
  public newThesaurusTargetId: FormControl<string | null>;
  public newThesaurusForm: FormGroup;

  constructor(
    private _repository: ThesaurusListRepository,
    private _thesaurusService: ThesaurusService,
    private _dialogService: DialogService,
    private _router: Router,
    private _authService: AuthJwtService,
    private _userLevelService: UserLevelService,
    private _snackbar: MatSnackBar,
    env: EnvService,
  ) {
    this.loading$ = _repository.loading$;
    this.page$ = _repository.page$;
    this.importEnabled.set(
      _authService.isCurrentUserInRole('admin') && env.get('thesImportEnabled')
        ? true
        : false,
    );

    // create form with cross-field validator
    this.newThesaurusId = new FormControl<string>('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.newThesaurusTargetId = new FormControl<string | null>(null, {
      validators: Validators.maxLength(100),
    });
    this.newThesaurusForm = new FormGroup(
      {
        newThesaurusId: this.newThesaurusId,
        newThesaurusTargetId: this.newThesaurusTargetId,
      },
      { validators: this.validateTargetIdDifferent },
    );
  }

  /**
   * Cross-field validator: ensures that targetId (when specified)
   * is different from the thesaurus ID.
   */
  private validateTargetIdDifferent(
    group: AbstractControl,
  ): ValidationErrors | null {
    const id = group.get('newThesaurusId')?.value?.trim();
    const targetId = group.get('newThesaurusTargetId')?.value?.trim();
    if (targetId && id && targetId === id) {
      return { sameTargetId: true };
    }
    return null;
  }

  ngOnInit(): void {
    this._authService.currentUser$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => {
        this.userLevel.set(this._userLevelService.getCurrentUserLevel());
      });
  }

  public onPageChange(event: PageEvent): void {
    this._repository.setPage(event.pageIndex + 1, event.pageSize);
  }

  /**
   * Adds a new thesaurus (or alias) after validating that:
   * 1. The thesaurus ID does not already exist
   * 2. If it's an alias, the target thesaurus must exist
   */
  public addThesaurus(): void {
    if (this.newThesaurusForm.invalid) {
      return;
    }

    const id = this.newThesaurusId.value.trim();
    const targetId = this.newThesaurusTargetId.value?.trim() || undefined;

    this.adding.set(true);

    // Step 1: Check if the thesaurus already exists
    this._thesaurusService
      .getThesaurus(id, true)
      .pipe(
        switchMap((existing) => {
          // If thesaurus exists (has entries or targetId), abort
          if (existing.entries?.length || existing.targetId) {
            this._snackbar.open(
              `Thesaurus with ID "${id}" already exists.`,
              'OK',
            );
            return of(null);
          }

          // Step 2: If alias, verify target thesaurus exists
          if (targetId) {
            return this._thesaurusService.getThesaurus(targetId, true).pipe(
              map((target) => {
                // Check if target exists (has entries or is itself an alias)
                if (!target.entries?.length && !target.targetId) {
                  this._snackbar.open(
                    `Target thesaurus "${targetId}" does not exist.`,
                    'OK',
                  );
                  return null;
                }
                return { id, targetId };
              }),
              catchError((err) => {
                console.error(err);
                this._snackbar.open(
                  `Error checking target thesaurus: ${err.message || err}`,
                  'OK',
                );
                return of(null);
              }),
            );
          }

          // Not an alias, proceed directly
          return of({ id, targetId: undefined });
        }),
        filter(
          (data): data is { id: string; targetId: string | undefined } =>
            data !== null,
        ),
        switchMap(({ id, targetId }) => {
          // Step 3: Create and save the new thesaurus
          const thesaurus: Thesaurus = {
            id,
            entries: [],
            targetId,
          };
          return this._thesaurusService.addThesaurus(thesaurus).pipe(
            map(() => thesaurus),
            catchError((err) => {
              console.error(err);
              this._snackbar.open(
                `Error adding thesaurus: ${err.message || err}`,
                'OK',
              );
              return of(null);
            }),
          );
        }),
        filter((thesaurus): thesaurus is Thesaurus => thesaurus !== null),
        tap((thesaurus) => {
          // Step 4: Success - refresh and navigate
          this._repository.reset();
          this._snackbar.open(`Thesaurus "${thesaurus.id}" added.`, 'OK', {
            duration: 3000,
          });
          this.editThesaurus(thesaurus);
        }),
        finalize(() => this.adding.set(false)),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe();
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
