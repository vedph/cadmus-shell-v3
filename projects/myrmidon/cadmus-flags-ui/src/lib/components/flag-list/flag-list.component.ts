import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';

import { FlagDefinition } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

import { AppRepository } from '@myrmidon/cadmus-state';

import { FlagDefinitionEditorComponent } from '../flag-definition-editor/flag-definition-editor.component';
import { FlagBitPipe } from '../../pipes/flag-bit.pipe';
import { FlagListRepository } from './flag-list.repository';

@Component({
  selector: 'cadmus-flag-list',
  templateUrl: './flag-list.component.html',
  styleUrls: ['./flag-list.component.scss'],
  imports: [
    MatProgressBar,
    MatIconButton,
    MatIcon,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    FlagDefinitionEditorComponent,
    MatTooltip,
    MatButton,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    AsyncPipe,
    FlagBitPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlagListComponent {
  public flags$: Observable<FlagDefinition[]>;
  public editedFlag$: Observable<FlagDefinition | null>;
  public loading$: Observable<boolean>;

  constructor(
    private _repository: FlagListRepository,
    private _appRepository: AppRepository,
    private _dialogService: DialogService,
    private _snackbar: MatSnackBar
  ) {
    this.flags$ = _repository.flags$;
    this.editedFlag$ = _repository.activeFlag$;
    this.loading$ = _repository.loading$;
    // ensure flags are loaded
    this._appRepository.load();
  }

  public addFlag(): void {
    this._repository.addNewFlag();
  }

  public deleteFlag(flag: FlagDefinition): void {
    this._dialogService
      .confirm('Confirmation', 'Delete this flag?')
      .subscribe((yes) => {
        if (yes) {
          this._repository.deleteFlag(flag.id);
        }
      });
  }

  public editFlag(flag: FlagDefinition): void {
    this._repository.setActive(flag.id);
  }

  public onFlagEditorClose(): void {
    this._repository.setActive(null);
  }

  public onFlagChange(flag: FlagDefinition): void {
    this._repository.addFlag(flag);
    this._repository.setActive(null);
  }

  public reset(): void {
    this._repository.reset();
  }

  public save(): void {
    this._repository.save().then(() => {
      this._snackbar.open('Flags saved', 'OK', {
        duration: 1500,
      });
      this._appRepository.loadFlags();
    });
  }
}
