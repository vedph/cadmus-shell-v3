import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { Thesaurus, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { EnvService, RamStorageService } from '@myrmidon/ngx-tools';
import { AppRepository } from '@myrmidon/cadmus-state';
import { ViafRefLookupService } from '@myrmidon/cadmus-refs-viaf-lookup';
import { GeoNamesRefLookupService } from '@myrmidon/cadmus-refs-geonames-lookup';
import { ASSERTED_COMPOSITE_ID_CONFIGS_KEY } from '@myrmidon/cadmus-refs-asserted-ids';
import { RefLookupConfig } from '@myrmidon/cadmus-refs-lookup';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private _authSub?: Subscription;
  private _brSub?: Subscription;

  public user?: User;
  public logged?: boolean;
  public itemBrowsers?: ThesaurusEntry[];
  public version: string;

  constructor(
    @Inject('itemBrowserKeys')
    private _itemBrowserKeys: { [key: string]: string },
    private _authService: AuthJwtService,
    private _appRepository: AppRepository,
    private _router: Router,
    env: EnvService,
    storage: RamStorageService,
    viaf: ViafRefLookupService,
    geonames: GeoNamesRefLookupService
  ) {
    this.version = env.get('version') || '';

    // configure external lookup for asserted composite IDs
    storage.store(ASSERTED_COMPOSITE_ID_CONFIGS_KEY, [
      {
        name: 'VIAF',
        iconUrl: '/assets/img/viaf128.png',
        description: 'Virtual International Authority File',
        label: 'ID',
        service: viaf,
        itemIdGetter: (item: any) => item?.viafid,
        itemLabelGetter: (item: any) => item?.term,
      },
      {
        name: 'geonames',
        iconUrl: '/assets/img/geonames128.png',
        description: 'GeoNames',
        label: 'ID',
        service: geonames,
        itemIdGetter: (item: any) => item?.geonameId,
        itemLabelGetter: (item: any) => item?.name,
      },
    ] as RefLookupConfig[]);
  }

  ngOnInit(): void {
    this.user = this._authService.currentUserValue || undefined;
    this.logged = this.user !== null;

    this._authSub = this._authService.currentUser$.subscribe(
      (user: User | null) => {
        this.logged = this._authService.isAuthenticated(true);
        this.user = user || undefined;
        if (user) {
          this._appRepository.load();
        }
      }
    );

    this._brSub = this._appRepository.itemBrowserThesaurus$.subscribe(
      (thesaurus: Thesaurus | undefined) => {
        this.itemBrowsers = thesaurus ? thesaurus.entries : undefined;
      }
    );
  }

  ngOnDestroy(): void {
    this._authSub?.unsubscribe();
    this._brSub?.unsubscribe();
  }

  public getItemBrowserRoute(id: string): string {
    return this._itemBrowserKeys[id] || id;
  }

  public logout(): void {
    if (!this.logged) {
      return;
    }
    this._authService
      .logout()
      .pipe(take(1))
      .subscribe((_) => {
        this._router.navigate(['/home']);
      });
  }
}
