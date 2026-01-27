import {
  FacetDefinition,
  FlagDefinition,
  Thesaurus,
} from '@myrmidon/cadmus-core';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';

import {
  FacetService,
  FlagService,
  ThesaurusService,
  PreviewService,
  EditorSettingsService,
} from '@myrmidon/cadmus-api';

/**
 * App state repository.
 */
@Injectable({ providedIn: 'root' })
export class AppRepository {
  // all the available facets definitions
  private readonly _facets$: BehaviorSubject<FacetDefinition[]>;
  // all the available flags definitions
  private readonly _flags$: BehaviorSubject<FlagDefinition[]>;
  // the thesaurus for model-types. This (if present) is used to display
  // human-friendly part types names from their IDs. Otherwise, the raw
  // IDs are displayed.
  private readonly _typeThesaurus$: BehaviorSubject<Thesaurus | undefined>;
  // the items browsers thesaurus. This (if present) is used to display
  // the items browsers menu.
  private readonly _itemBrowserThesaurus$: BehaviorSubject<
    Thesaurus | undefined
  >;
  // the preview JSON renderers keys. Empty when preview is disabled.
  private readonly _previewJKeys$: BehaviorSubject<string[]>;
  // the preview text flatteners keys. Empty when preview is disabled.
  private readonly _previewFKeys$: BehaviorSubject<string[]>;
  // the preview item composer keys. Empty when preview is disabled.
  private readonly _previewCKeys$: BehaviorSubject<string[]>;
  // editor settings cache, lazily loaded
  private readonly _settingsCache: Map<string, any>;

  public get facets$(): Observable<FacetDefinition[]> {
    return this._facets$;
  }
  public get flags$(): Observable<FlagDefinition[]> {
    return this._flags$;
  }
  public get typeThesaurus$(): Observable<Thesaurus | undefined> {
    return this._typeThesaurus$;
  }
  public get itemBrowserThesaurus$(): Observable<Thesaurus | undefined> {
    return this._itemBrowserThesaurus$;
  }
  public get previewJKeys$(): Observable<string[]> {
    return this._previewJKeys$;
  }
  public get previewFKeys$(): Observable<string[]> {
    return this._previewFKeys$;
  }
  public get previewCKeys$(): Observable<string[]> {
    return this._previewCKeys$;
  }

  constructor(
    private _facetService: FacetService,
    private _flagService: FlagService,
    private _thesaurusService: ThesaurusService,
    private _previewService: PreviewService,
    private _settingService: EditorSettingsService,
  ) {
    this._facets$ = new BehaviorSubject<FacetDefinition[]>([]);
    this._flags$ = new BehaviorSubject<FlagDefinition[]>([]);
    this._typeThesaurus$ = new BehaviorSubject<Thesaurus | undefined>(
      undefined,
    );
    this._itemBrowserThesaurus$ = new BehaviorSubject<Thesaurus | undefined>(
      undefined,
    );
    this._previewJKeys$ = new BehaviorSubject<string[]>([]);
    this._previewFKeys$ = new BehaviorSubject<string[]>([]);
    this._previewCKeys$ = new BehaviorSubject<string[]>([]);
    this._settingsCache = new Map<string, any>();
  }

  /**
   * Get the loaded model types thesaurus.
   * @returns Thesaurus or undefined if not loaded.
   */
  public getTypeThesaurus(): Thesaurus | undefined {
    return this._typeThesaurus$.value;
  }

  /**
   * Get the loaded items facets.
   * @returns The facets.
   */
  public getFacets(): FacetDefinition[] {
    return this._facets$.value;
  }

  /**
   * Get the loaded items flags.
   * @returns The flags.
   */
  public getFlags(): FlagDefinition[] {
    return this._flags$.value;
  }

  /**
   * Load app data from the API. If the data is already loaded, this
   * does nothing unless refresh is true.
   *
   * @param refresh True to force a refresh.
   * @returns Promise.
   */
  public load(refresh = false): Promise<void> {
    if (this._facets$.value.length && !refresh) {
      return Promise.resolve();
    }
    const facets$ = this._facetService.getFacets();
    const flags$ = this._flagService.getFlags();
    const thesauri$ = this._thesaurusService.getThesauriSet([
      'model-types@en',
      'item-browsers@en',
    ]);
    const jKeys$ = this._previewService.getKeys('J');
    const fKeys$ = this._previewService.getKeys('F');
    const cKeys$ = this._previewService.getKeys('C');

    return new Promise((resolve, reject) => {
      forkJoin({
        facets: facets$,
        flags: flags$,
        thesauri: thesauri$,
        jKeys: jKeys$,
        fKeys: fKeys$,
        cKeys: cKeys$,
      }).subscribe({
        next: (result) => {
          this._facets$.next(result.facets);
          this._flags$.next(result.flags);
          this._typeThesaurus$.next(result.thesauri['model-types']);
          this._itemBrowserThesaurus$.next(result.thesauri['item-browsers']);
          this._previewJKeys$.next(result.jKeys);
          this._previewFKeys$.next(result.fKeys);
          this._previewCKeys$.next(result.cKeys);
          console.log(
            `AppRepository loaded (facets: ${result.facets.length}, flags: ${result.flags.length})`,
          );
          resolve();
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  /**
   * Clear the repository.
   */
  public clear(): void {
    this._facets$.next([]);
    this._flags$.next([]);
    this._typeThesaurus$.next(undefined);
    this._itemBrowserThesaurus$.next(undefined);
    this._previewJKeys$.next([]);
    this._previewFKeys$.next([]);
    this._previewCKeys$.next([]);
    this._settingsCache.clear();
  }

  /**
   * Load the model types and item browsers thesauri.
   */
  public loadThesauri(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._thesaurusService
        .getThesauriSet(['model-types@en', 'item-browsers@en'])
        .subscribe({
          next: (thesauri) => {
            this._typeThesaurus$.next(thesauri['model-types']);
            this._itemBrowserThesaurus$.next(thesauri['item-browsers']);
            resolve();
          },
          error: (err) => {
            reject(err);
          },
        });
    });
  }

  /**
   * Get the color defined for the specified part type ID, reading it
   * from the facets definitions.
   * @param typeId The part type ID.
   * @param roleId The optional role type ID.
   * @returns The color key, or undefined if not found.
   */
  public getPartColor(typeId: string, roleId?: string): string | undefined {
    // for each facet, find typeId and roleId in its part definitions
    for (let facet of this._facets$.value) {
      for (let part of facet.partDefinitions) {
        if (part.typeId === typeId && (!roleId || part.roleId === roleId)) {
          return part.colorKey;
        }
      }
    }
    return undefined;
  }

  /**
   * Load the flags definitions.
   */
  public loadFlags(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._flagService.getFlags().subscribe({
        next: (flags) => {
          this._flags$.next(flags);
          resolve();
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  /**
   * Get the editor setting with the specified ID.
   * @param id The setting ID.
   * @param reload True to force reloading from server.
   * @returns Promise with the settings object.
   */
  public getSetting<T>(id: string, reload = false): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (this._settingsCache.has(id) && !reload) {
        resolve(this._settingsCache.get(id));
        return;
      }
      this._settingService.getSetting<T>(id).subscribe({
        next: (setting) => {
          this._settingsCache.set(id, setting);
          resolve(setting);
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  /**
   * Set the editor setting with the specified ID.
   * @param id The setting ID.
   * @param setting The setting to store.
   */
  public setSetting<T>(id: string, setting: T): void {
    this._settingService.addSetting<T>(id, setting).subscribe({
      next: () => {
        this._settingsCache.set(id, setting);
      },
      error: (err) => {
        console.error(`Error setting setting ${id}:`, err);
      },
    });
  }

  /**
   * Get the editor setting for the specified part or fragment type ID,
   * optionally having the specified role ID.
   * @param typeId The part or fragment type ID.
   * @param roleId The optional role ID.
   * @param reload True to force reloading from server.
   * @returns Promise with settings object.
   */
  public getSettingFor<T>(
    typeId: string,
    roleId?: string,
    reload = false,
  ): Promise<T | undefined> {
    const id = roleId ? `${typeId}_${roleId}` : typeId;
    return this.getSetting(id, reload);
  }

  /**
   * Set the editor setting for the specified part or fragment type ID,
   * optionally having the specified role ID.
   * @param typeId The part or fragment type ID.
   * @param setting The setting to store.
   * @param roleId The optional role ID.
   */
  public setSettingFor<T>(typeId: string, setting: T, roleId?: string): void {
    const id = roleId ? `${typeId}_${roleId}` : typeId;
    this.setSetting(id, setting);
  }
}
