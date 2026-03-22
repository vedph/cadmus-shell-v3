import {
  Component,
  OnInit,
  signal,
  ChangeDetectionStrategy,
  computed,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { Thesaurus, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ComponentCanDeactivate } from '@myrmidon/cadmus-core';
import { ThesaurusService, UserLevelService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';
import {
  EditableStaticThesaurusPagedTreeStoreService,
  EditableThesaurusBrowserComponent,
} from '@myrmidon/cadmus-thesaurus-store';

@Component({
  selector: 'lib-thesaurus-editor-feature',
  templateUrl: './thesaurus-editor-feature.component.html',
  styleUrls: ['./thesaurus-editor-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatProgressBar,
    MatIcon,
    EditableThesaurusBrowserComponent,
  ],
})
export class ThesaurusEditorFeatureComponent
  implements OnInit, ComponentCanDeactivate
{
  private readonly _destroyRef = inject(DestroyRef);

  public readonly id = signal<string | undefined>(undefined);
  public userLevel = signal<number>(0);

  public readonly thesaurus = signal<Thesaurus | undefined>(undefined);
  public readonly entries = signal<ThesaurusEntry[]>([]);
  public readonly busy = signal<boolean>(false);

  public readonly service = computed(
    () => new EditableStaticThesaurusPagedTreeStoreService(this.entries()),
  );

  public readonly entry = signal<ThesaurusEntry | undefined>(undefined);
  public readonly hasChanges = signal<boolean>(false);

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _appRepository: AppRepository,
    userLevelService: UserLevelService,
    private _thesService: ThesaurusService,
    private _dialogService: DialogService,
    private _snackbar: MatSnackBar,
  ) {
    this.id.set(this._route.snapshot.params['id']);
    if (this.id() === 'new') {
      this.id.set(undefined);
    }
    this.userLevel.set(userLevelService.getCurrentUserLevel());
  }

  public canDeactivate(): boolean {
    return !this.hasChanges();
  }

  public ngOnInit(): void {
    // ensure app data is loaded
    this._appRepository.load();

    // load the thesaurus to edit
    if (this.id()) {
      this.busy.set(true);
      this._thesService
        .getThesaurus(this.id()!, true)
        .pipe(takeUntilDestroyed(this._destroyRef))
        .subscribe({
          next: (thesaurus: Thesaurus) => {
            this.busy.set(false);
            this.thesaurus.set(thesaurus);
            this.entries.set(thesaurus.entries || []);
          },
          error: (error) => {
            this.busy.set(false);
            this._snackbar.open(`Error loading thesaurus: ${error}`, 'OK');
            this._router.navigate(['/thesauri']);
          },
        });
    }
  }

  public onChangesStateChange(hasChanges: boolean): void {
    this.hasChanges.set(hasChanges);
  }

  public onReset(): void {
    const thesaurus = this.thesaurus();
    if (!thesaurus) {
      return;
    }
    this.entries.set([...(thesaurus.entries || [])]);
    this.hasChanges.set(false);
    this._snackbar.open('Reset to initial data', 'Close', { duration: 2000 });
  }

  public onClearChanges(): void {
    const currentService = this.service();
    currentService.clearChanges();
    this.hasChanges.set(false);
    this._snackbar.open('Cleared unsaved changes', 'Close', { duration: 2000 });
  }

  public cancel(): void {
    this._dialogService
      .confirm('Close', `Close thesaurus editor?`)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this._router.navigate(['/thesauri']);
      });
  }

  public save(): void {
    if (this.userLevel() < 3 || !this.hasChanges()) {
      return;
    }
    const thesaurus = this.thesaurus();
    if (!thesaurus) {
      return;
    }
    const updated: Thesaurus = {
      ...thesaurus,
      entries: this.service().getCurrentEntries(),
    };
    this._thesService
      .addThesaurus(updated)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this._snackbar.open('Thesaurus saved', 'OK', {
            duration: 1500,
          });
          this.hasChanges.set(false);
          // reload thesauri in app repository
          this._appRepository.loadThesauri();
          // navigate back to list
          this._router.navigate(['/thesauri']);
        },
        error: (error) => {
          this._snackbar.open(`Error saving thesaurus: ${error}`, 'OK');
        },
      });
  }
}
