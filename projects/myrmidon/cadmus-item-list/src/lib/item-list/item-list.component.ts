import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AsyncPipe, DatePipe } from '@angular/common';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { Observable, Subscription } from 'rxjs';

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

import { DataPage } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';

import {
  FacetDefinition,
  FlagDefinition,
  ItemInfo,
} from '@myrmidon/cadmus-core';
import { UserLevelService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';
import { FacetBadgeComponent, FlagsBadgeComponent } from '@myrmidon/cadmus-ui';

import { ItemListRepository } from '../state/item-list.repository';
import { ItemFilterComponent } from '../item-filter/item-filter.component';

@Component({
  selector: 'cadmus-item-list',
  templateUrl: './item-list.component.html',
  styleUrls: ['./item-list.component.css'],
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    ItemFilterComponent,
    MatProgressBar,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatPaginator,
    MatCardActions,
    MatButton,
    AsyncPipe,
    DatePipe,
    FacetBadgeComponent,
    FlagsBadgeComponent,
  ],
})
export class ItemListComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  public loading$: Observable<boolean | undefined>;
  public page$: Observable<DataPage<ItemInfo>>;
  public facets: FacetDefinition[] = [];
  public flags: FlagDefinition[] = [];

  public readonly user = signal<User | undefined>(undefined);
  public readonly userLevel = signal<number>(0);

  constructor(
    private _repository: ItemListRepository,
    private _dialogService: DialogService,
    private _router: Router,
    private _authService: AuthJwtService,
    private _userLevelService: UserLevelService,
    private _appRepository: AppRepository
  ) {
    this.loading$ = _repository.loading$;
    this.page$ = _repository.page$;
  }

  public async ngOnInit() {
    // ensure app data is loaded
    await this._appRepository.load();
    this.facets = this._appRepository.getFacets();
    this.flags = this._appRepository.getFlags();

    this._sub = this._authService.currentUser$.subscribe(
      (user: User | null) => {
        this.user.set(user ?? undefined);
        this.userLevel.set(this._userLevelService.getCurrentUserLevel());
      }
    );
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onPageChange(event: PageEvent): void {
    this._repository.setPage(event.pageIndex + 1, event.pageSize);
  }

  public addItem(): void {
    this._router.navigate(['/items', 'new']);
  }

  public editItem(item: ItemInfo): void {
    this._router.navigate(['/items', item.id]);
  }

  public deleteItem(item: ItemInfo): void {
    if (this.user()?.roles.every((r) => r !== 'admin' && r !== 'editor')) {
      return;
    }

    this._dialogService
      .confirm('Confirm Deletion', `Delete item "${item.title}"?`)
      .subscribe((yes: boolean) => {
        if (yes) {
          this._repository.deleteItem(item.id);
        }
      });
  }

  public reset(): void {
    this._repository.reset();
  }
}
