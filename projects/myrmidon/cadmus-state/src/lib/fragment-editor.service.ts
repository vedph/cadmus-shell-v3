import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import {
  Fragment,
  Part,
  TextLayerPart,
  EditedObject,
  FragmentIdentity,
} from '@myrmidon/cadmus-core';

/**
 * Service used by layer part editor wrappers to load part and thesauri
 * or save parts.
 */
@Injectable({
  providedIn: 'root',
})
export class FragmentEditorService {
  private _loading$: BehaviorSubject<boolean>;
  private _saving$: BehaviorSubject<boolean>;

  public loading$: Observable<boolean>;
  public saving$: Observable<boolean>;

  constructor(
    private _itemService: ItemService,
    private _thesaurusService: ThesaurusService
  ) {
    this._loading$ = new BehaviorSubject<boolean>(false);
    this.loading$ = this._loading$.asObservable();
    this._saving$ = new BehaviorSubject<boolean>(false);
    this.saving$ = this._saving$.asObservable();
  }

  private getFragmentFromPart(part: TextLayerPart, loc: string): Fragment {
    const fr = part.fragments.find((f) => f.location === loc);
    return (
      fr ?? {
        location: loc,
      }
    );
  }

  private loadWithThesauri(
    identity: FragmentIdentity,
    thesauriIds: string[]
  ): Promise<EditedObject<Fragment> | null> {
    // remove trailing ! from IDs if any
    const unscopedIds = thesauriIds.map((id) => {
      return this._thesaurusService.getScopedId(id);
    });
    return new Promise<EditedObject<Fragment> | null>((resolve, reject) => {
      // load part and thesauri
      forkJoin({
        part: this._itemService.getPart(identity.partId || ''),
        thesauri: this._thesaurusService.getThesauriSet(unscopedIds),
        t: this._itemService.getBaseTextPart(identity.itemId),
      }).subscribe({
        next: (result) => {
          const layerPart = result.part as TextLayerPart;
          const thesauri = result.thesauri;
          const fr = this.getFragmentFromPart(layerPart, identity.loc);

          // if the loaded part has a thesaurus scope, reload the thesauri
          if (layerPart.thesaurusScope) {
            const scopedIds: string[] = thesauriIds.map((id) => {
              return this._thesaurusService.getScopedId(
                id,
                layerPart.thesaurusScope
              );
            });
            this._thesaurusService.getThesauriSet(scopedIds).subscribe({
              next: (scopedThesauri) => {
                this._loading$.next(false);
                resolve({
                  value: fr,
                  layerPart: layerPart,
                  baseText: result.t.text,
                  thesauri: scopedThesauri,
                });
              },
              error: (error) => {
                this._loading$.next(false);
                console.error(error);
                reject({
                  message: 'Error loading thesauri ' + scopedIds.join(', '),
                  error: error,
                });
              },
            });
          } else {
            // else just use the loaded thesauri
            this._loading$.next(false);
            resolve({
              value: fr,
              layerPart: layerPart,
              baseText: result.t.text,
              thesauri: thesauri,
            });
          }
        },
        error: (error) => {
          this._loading$.next(false);
          console.error(error);
          reject({
            message: 'Error loading thesauri ' + unscopedIds.join(', '),
            error: error,
          });
        },
      });
    });
  }

  private loadWithoutThesauri(
    identity: FragmentIdentity
  ): Promise<EditedObject<Fragment> | null> {
    this._loading$.next(true);
    return new Promise<EditedObject<Fragment> | null>((resolve, reject) => {
      // load layer part and base text
      forkJoin({
        t: this._itemService.getBaseTextPart(identity.itemId),
        p: this._itemService.getPart(identity.partId!),
      }).subscribe({
        next: (result) => {
          this._loading$.next(false);
          const layerPart = result.p as TextLayerPart;
          resolve({
            value: this.getFragmentFromPart(layerPart, identity.loc),
            layerPart: layerPart,
            baseText: result.t.text,
            thesauri: {},
          });
        },
        error: (error) => {
          this._loading$.next(false);
          console.error(error);
          reject({
            message: 'Error loading layer part ' + identity.partId,
            error: error,
          });
        },
      });
    });
  }

  /**
   * Load into the state the part with the specified ID
   * and its thesauri.
   * If the ID is not specified, it's a new part; in this case,
   * it will get a null ID, but use the specified itemId and roleId.
   *
   * @param identity The part identity.
   * @param thesauriIds The thesauri IDs array.
   */
  public load(
    identity: FragmentIdentity,
    thesauriIds?: string[]
  ): Promise<EditedObject<Fragment> | null> {
    if (thesauriIds?.length) {
      return this.loadWithThesauri(identity, thesauriIds);
    } else {
      return this.loadWithoutThesauri(identity);
    }
  }

  /**
   * Save the fragments in their layer part.
   *
   * @param part The part.
   * @returns Promise which when successful returns the saved part.
   */
  public save(part: Part): Promise<Part> {
    this._saving$.next(true);

    return new Promise((resolve, reject) => {
      this._itemService.addPart(part).subscribe({
        next: (saved: Part) => {
          this._saving$.next(false);
          resolve(saved);
        },
        error: (error) => {
          this._saving$.next(false);
          console.error(error);
          reject({
            message: 'Error saving part ' + part.id,
            error: error,
          });
        },
      });
    });
  }
}
