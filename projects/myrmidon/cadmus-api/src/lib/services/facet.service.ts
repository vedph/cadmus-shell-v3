import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, of } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';

import { FacetDefinition, PartDefinition } from '@myrmidon/cadmus-core';
import { EnvService, ErrorService } from '@myrmidon/ngx-tools';

import { EditorSettingsService } from './editor-settings.service';

/**
 * An entry in the facet model settings. The key is the part or fragment
 * type ID, and the value is metadata about whether the part is a base text
 * part (applicable to parts only) and the list of thesauri IDs to use
 * for the part or fragment. Required thesauri are prefixed by an asterisk.
 */
export interface FacetModelSettingsEntry {
  [key: string]: {
    baseText?: boolean;
    thesauriIds?: string[];
  };
}

/**
 * The facet model settings, which is a map of part and fragment type IDs to
 * their metadata for the purpose of facet editing.
 */
export interface FacetModelSettings {
  parts: FacetModelSettingsEntry;
  fragments?: FacetModelSettingsEntry;
}

@Injectable({ providedIn: 'root' })
export class FacetService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService,
    private _settings: EditorSettingsService,
  ) {}

  /**
   * Get a list of facets.
   * @returns Observable with facets array.
   */
  public getFacets(): Observable<FacetDefinition[]> {
    return this._http
      .get<FacetDefinition[]>(`${this._env.get('apiUrl')}facets`)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the facet with the specified ID.
   *
   * @param id The facet's ID.
   */
  public getFacet(id: string): Observable<FacetDefinition> {
    return this._http
      .get<FacetDefinition>(`${this._env.get('apiUrl')}facets/${id}`)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the facet assigned to the item with the specified ID.
   *
   * @param id The item's ID.
   */
  public getFacetFromItemId(id: string): Observable<FacetDefinition> {
    return this._http
      .get<FacetDefinition>(`${this._env.get('apiUrl')}facets/items/${id}`)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get a list of all the parts defined in the specified facet.
   *
   * @param id The facet ID.
   * @param idIsItem True if the received ID refers to an item's ID rather
   * than to the facet ID. In this case, the item's facet will be retrieved
   * first, and then used to get the requested result.
   * @param noRoles True to ignore the roles when collecting parts from
   *  facets. In this case, you will get just 1 part for each part type.
   * @returns Observable with part definitions array.
   */
  public getFacetParts(
    id: string,
    idIsItem: boolean,
    noRoles = false,
  ): Observable<PartDefinition[]> {
    let url = idIsItem
      ? this._env.get('apiUrl')! + `item-facets/${id}/parts`
      : this._env.get('apiUrl')! + `facets/${id}/parts`;
    if (noRoles) {
      url += '?noRoles=true';
    }

    return this._http
      .get<PartDefinition[]>(url)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the text layer part type ID if any.
   * @returns Observable of an object with property typeId=result or null.
   */
  public getTextLayerPartTypeId(): Observable<{ typeId: string }> {
    return this._http
      .get<{ typeId: string }>(`${this._env.get('apiUrl')}facets/layer-type-id`)
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the color of the part with the specified type and role IDs, inside
   * the specified facet (if any).
   *
   * @param typeId The part's type ID.
   * @param roleId The part's optional role ID.
   * @param facet The facet definition including the part being requested.
   */
  public getPartColor(
    typeId: string,
    roleId: string | undefined,
    facet: FacetDefinition | undefined,
  ): string {
    let def: PartDefinition | undefined;
    if (facet) {
      def = facet.partDefinitions.find((d) => {
        return d.typeId === typeId && (!roleId || roleId === d.roleId);
      });
      if (!def) {
        def = facet.partDefinitions.find((d) => {
          return d.typeId === typeId;
        });
      }
    }
    return def ? '#' + def.colorKey : '#f0f0f0';
  }

  /**
   * Add or update the specified facet.
   * @param facet The facet to add or update.
   */
  public addFacet(facet: FacetDefinition): Observable<FacetDefinition> {
    return this._http
      .post<FacetDefinition>(`${this._env.get('apiUrl')}facets`, facet)
      .pipe(catchError(this._error.handleError));
  }

  /**
   * Delete the facet with the specified ID.
   * @param id The facet ID.
   */
  public deleteFacet(id: string): Observable<void> {
    return this._http
      .delete<void>(`${this._env.get('apiUrl')}facets/${id}`)
      .pipe(catchError(this._error.handleError));
  }

  /**
   * Build a baseline FacetModelSettings from the facet definitions alone,
   * without any server-side settings. This is used as a fallback when no
   * "models" setting is stored on the server.
   *
   * For each unique typeId found across all facets' part definitions:
   * - an entry is added to `parts`, keyed by typeId;
   * - if any part with that typeId has a roleId starting with "fr.", the part
   *   entry gets `baseText: true`, and the roleId is also added to `fragments`.
   * No `thesauriIds` are included because that information cannot be derived
   * from FacetDefinition alone.
   */
  private buildDefaultSettings(facets: FacetDefinition[]): FacetModelSettings {
    const parts: FacetModelSettingsEntry = {};
    const fragments: FacetModelSettingsEntry = {};

    for (const facet of facets) {
      for (const pd of facet.partDefinitions) {
        const { typeId, roleId } = pd;
        if (roleId?.startsWith('fr.')) {
          // layer host: mark as base-text and register the fragment type
          parts[typeId] = { ...parts[typeId], baseText: true };
          if (!fragments[roleId]) {
            fragments[roleId] = {};
          }
        } else {
          // plain part: register if not yet seen
          if (!parts[typeId]) {
            parts[typeId] = {};
          }
        }
      }
    }

    const result: FacetModelSettings = { parts };
    if (Object.keys(fragments).length) {
      result.fragments = fragments;
    }
    return result;
  }

  /**
   * Merge server-loaded settings on top of the pre-built defaults.
   * Entries present in `loaded` override or extend those in `defaults`;
   * entries only in `defaults` are kept as-is.
   */
  private mergeSettings(
    defaults: FacetModelSettings,
    loaded: FacetModelSettings,
  ): FacetModelSettings {
    const parts: FacetModelSettingsEntry = { ...defaults.parts };
    if (loaded?.parts) {
      for (const key of Object.keys(loaded.parts)) {
        parts[key] = { ...parts[key], ...loaded.parts[key] };
      }
    }

    const fragments: FacetModelSettingsEntry = {
      ...(defaults.fragments ?? {}),
    };
    if (loaded?.fragments) {
      for (const key of Object.keys(loaded.fragments)) {
        fragments[key] = { ...fragments[key], ...loaded.fragments[key] };
      }
    }

    return {
      parts,
      ...(Object.keys(fragments).length ? { fragments } : {}),
    };
  }

  /**
   * Get the facet model settings, merging server-stored settings with a
   * baseline derived from the facet definitions.
   *
   * Strategy:
   * 1. Load all facets and build a minimal but valid FacetModelSettings from
   *    their part definitions (see buildDefaultSettings). This guarantees
   *    that every part/fragment known to the profile is represented, even when
   *    the server has no "models" setting stored yet.
   * 2. Load the "models" setting from the server and deep-merge it on top of
   *    the defaults (server values win). When no setting has been configured
   *    the server returns an empty object, so the merge leaves the defaults
   *    intact. A catchError guards against genuine network failures and also
   *    returns the defaults in that case.
   */
  public getFacetModelSettings(): Observable<FacetModelSettings> {
    return this.getFacets().pipe(
      map((facets) => this.buildDefaultSettings(facets)),
      switchMap((defaults) =>
        this._settings.getSetting<FacetModelSettings>('models').pipe(
          map((loaded) => this.mergeSettings(defaults, loaded)),
          catchError(() => of(defaults)),
        ),
      ),
    );
  }
}
