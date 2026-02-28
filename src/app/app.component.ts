import { ChangeDetectionStrategy, Component, OnInit, Inject, OnDestroy, signal } from '@angular/core';
import { Thesaurus, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Router, RouterModule } from '@angular/router';
import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

// myrmidon
import { EnvService, RamStorageService } from '@myrmidon/ngx-tools';
import { AuthJwtService, GravatarPipe, User } from '@myrmidon/auth-jwt-login';

// bricks
import {
  CIT_SCHEME_SERVICE_SETTINGS_KEY,
  CitMappedValues,
  CitSchemeSettings,
  MapFormatter,
} from '@myrmidon/cadmus-refs-citation';
import {
  LOOKUP_CONFIGS_KEY,
  RefLookupConfig,
} from '@myrmidon/cadmus-refs-lookup';
import { ViafRefLookupService } from '@myrmidon/cadmus-refs-viaf-lookup';
import { GeoNamesRefLookupService } from '@myrmidon/cadmus-refs-geonames-lookup';
import {
  BiblissimaCandidate,
  BiblissimaRefLookupService,
} from '@myrmidon/cadmus-refs-biblissima-lookup';

// cadmus
import { AppRepository } from '@myrmidon/cadmus-state';

import { DC_SCHEME, OD_SCHEME } from './cit-schemes';

@Component({
  selector: 'app-root',
  imports: [
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    MatTooltipModule,
    GravatarPipe,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly _subs: Subscription[] = [];

  public readonly user = signal<User | undefined>(undefined);
  public readonly logged = signal<boolean>(false);
  public readonly itemBrowsers = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );
  public readonly version = signal<string>('');

  constructor(
    @Inject('itemBrowserKeys')
    private _itemBrowserKeys: { [key: string]: string },
    private _authService: AuthJwtService,
    private _appRepository: AppRepository,
    private _router: Router,
    env: EnvService,
    storage: RamStorageService,
    viaf: ViafRefLookupService,
    geonames: GeoNamesRefLookupService,
    biblissima: BiblissimaRefLookupService,
  ) {
    this.version.set(env.get('version') || '');

    // configure citation schemes
    this.configureCitationService(storage);

    // configure external lookup for asserted composite IDs
    storage.store(LOOKUP_CONFIGS_KEY, [
      {
        name: 'VIAF',
        iconUrl: '/img/viaf128.png',
        description: 'Virtual International Authority File',
        label: 'ID',
        service: viaf,
        itemIdGetter: (item: any) => item?.viafid,
        itemLabelGetter: (item: any) => item?.term,
      },
      {
        name: 'Biblissima+',
        iconUrl: '/img/biblissima128.png',
        description: 'Biblissima+ knowledge base',
        label: 'entity',
        service: biblissima,
        itemIdGetter: (item: BiblissimaCandidate) => item?.id,
        itemLabelGetter: (item: BiblissimaCandidate) => item?.name,
      },
      {
        name: 'geonames',
        iconUrl: '/img/geonames128.png',
        description: 'GeoNames',
        label: 'ID',
        service: geonames,
        itemIdGetter: (item: any) => item?.geonameId,
        itemLabelGetter: (item: any) => item?.name,
      },
    ] as RefLookupConfig[]);
  }

  private configureCitationService(storage: RamStorageService): void {
    // custom formatters: agl formatter for Odyssey
    const aglFormatter = new MapFormatter();
    const aglMap: CitMappedValues = {};
    for (let n = 0x3b1; n <= 0x3c9; n++) {
      // skip final sigma
      if (n === 0x3c2) {
        continue;
      }
      aglMap[String.fromCharCode(n)] = n - 0x3b0;
    }
    aglFormatter.configure(aglMap);

    // store settings via service
    storage.store(CIT_SCHEME_SERVICE_SETTINGS_KEY, {
      formats: {},
      schemes: {
        dc: DC_SCHEME,
        od: OD_SCHEME,
      },
      formatters: {
        agl: aglFormatter,
      },
    } as CitSchemeSettings);
  }

  public ngOnInit(): void {
    this.user.set(this._authService.currentUserValue || undefined);
    this.logged.set(this.user() !== null);

    // when the user logs in or out, reload the app data
    this._subs.push(
      this._authService.currentUser$.subscribe((user: User | null) => {
        this.logged.set(this._authService.isAuthenticated(true));
        this.user.set(user || undefined);
        if (user) {
          console.log('User logged in: ', user);
          this._appRepository.load();
        } else {
          console.log('User logged out');
        }
      }),
    );

    // when the thesaurus is loaded, get the item browsers
    this._subs.push(
      this._appRepository.itemBrowserThesaurus$.subscribe(
        (thesaurus: Thesaurus | undefined) => {
          this.itemBrowsers.set(thesaurus ? thesaurus.entries : undefined);
        },
      ),
    );
  }

  public ngOnDestroy(): void {
    this._subs.forEach((s) => s.unsubscribe());
  }

  public getItemBrowserRoute(id: string): string {
    return this._itemBrowserKeys[id] || id;
  }

  public logout(): void {
    if (!this.logged()) {
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
