import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { Observable } from 'rxjs';

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

import { ItemListRepository } from '../state/item-list.repository';

@Component({
  selector: 'cadmus-item-list',
  templateUrl: './item-list.component.html',
  styleUrls: ['./item-list.component.css'],
  standalone: false,
})
export class ItemListComponent implements OnInit {
  public loading$: Observable<boolean | undefined>;
  public page$: Observable<DataPage<ItemInfo>>;
  public facets: FacetDefinition[];
  public flags: FlagDefinition[];

  public user?: User;
  public userLevel: number;

  constructor(
    private _repository: ItemListRepository,
    private _dialogService: DialogService,
    private _router: Router,
    private _authService: AuthJwtService,
    private _userLevelService: UserLevelService,
    appRepository: AppRepository
  ) {
    this.userLevel = 0;
    this.loading$ = _repository.loading$;
    this.page$ = _repository.page$;
    this.facets = appRepository.getFacets();
    this.flags = appRepository.getFlags();
  }

  public ngOnInit(): void {
    this._authService.currentUser$.subscribe((user: User | null) => {
      this.user = user ?? undefined;
      this.userLevel = this._userLevelService.getCurrentUserLevel();
    });
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
    if (this.user?.roles.every((r) => r !== 'admin' && r !== 'editor')) {
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
