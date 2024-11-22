import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { DataPage } from '@myrmidon/ng-tools';
import { DialogService } from '@myrmidon/ng-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import {
  FacetDefinition,
  FlagDefinition,
  ItemInfo,
} from '@myrmidon/cadmus-core';
import { UserLevelService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';

import { ItemSearchRepository } from '../state/item-search.repository';

@Component({
  selector: 'cadmus-item-search',
  templateUrl: './item-search.component.html',
  styleUrls: ['./item-search.component.css'],
  standalone: false,
})
export class ItemSearchComponent implements OnInit {
  public user?: User;
  public userLevel: number;
  public facets: FacetDefinition[];
  public flags: FlagDefinition[];
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
    appRepository: AppRepository
  ) {
    this.userLevel = 0;
    this.page$ = this._repository.page$;
    this.query$ = this._repository.query$;
    this.lastQueries$ = this._repository.lastQueries$;
    this.error$ = this._repository.error$;
    this.loading$ = this._repository.loading$;
    this.facets = appRepository.getFacets();
    this.flags = appRepository.getFlags();
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
    if (this.user?.roles.every((r) => r !== 'admin' && r !== 'editor')) {
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
