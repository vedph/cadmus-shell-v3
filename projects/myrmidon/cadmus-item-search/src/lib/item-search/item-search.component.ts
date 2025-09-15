import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIconButton } from '@angular/material/button';
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

import { ItemQueryComponent } from '../item-query/item-query.component';
import { ItemSearchRepository } from '../state/item-search.repository';

@Component({
  selector: 'cadmus-item-search',
  templateUrl: './item-search.component.html',
  styleUrls: ['./item-search.component.css'],
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    ItemQueryComponent,
    MatProgressBar,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatPaginator,
    AsyncPipe,
    DatePipe,
    FacetBadgeComponent,
    FlagsBadgeComponent,
  ],
})
export class ItemSearchComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  public readonly user = signal<User | undefined>(undefined);
  public readonly userLevel = signal<number>(0);
  public readonly facets = signal<FacetDefinition[]>([]);
  public readonly flags = signal<FlagDefinition[]>([]);
  public loading$: Observable<boolean | undefined>;
  public query$: Observable<string | undefined>;
  public page$: Observable<DataPage<ItemInfo>>;
  public error$: Observable<string | undefined>;
  public lastQueries$: Observable<string[]>;

  constructor(
    private _repository: ItemSearchRepository,
    private _dialogService: DialogService,
    private _router: Router,
    private _authService: AuthJwtService,
    private _userLevelService: UserLevelService,
    private _appRepository: AppRepository
  ) {
    this.page$ = this._repository.page$;
    this.query$ = this._repository.query$;
    this.lastQueries$ = this._repository.lastQueries$;
    this.error$ = this._repository.error$;
    this.loading$ = this._repository.loading$;
  }

  public async ngOnInit() {
    this._sub = this._authService.currentUser$.subscribe(
      (user: User | null) => {
        this.user.set(user ?? undefined);
        this.userLevel.set(this._userLevelService.getCurrentUserLevel());
      }
    );

    await this._appRepository.load();
    this.facets.set(this._appRepository.getFacets());
    this.flags.set(this._appRepository.getFlags());
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onPageChange(event: PageEvent): void {
    this._repository.setPage(event.pageIndex + 1, event.pageSize);
  }

  public submitQuery(query: string): void {
    if (!query) {
      return;
    }
    this._repository.search(query);
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
        if (!yes) {
          return;
        }
        this._repository.deleteItem(item.id);
      });
  }

  public reset(): void {
    this._repository.reset();
  }
}
