import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, map, Observable, take } from 'rxjs';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { Part, EditedObject, PartIdentity } from '@myrmidon/cadmus-core';

/**
 * Service used by part editor wrappers to load part and thesauri
 * or save parts.
 */
@Injectable({
  providedIn: 'root',
})
export class PartEditorService {
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

  private loadWithThesauri(
    identity: PartIdentity,
    thesauriIds: string[]
  ): Promise<EditedObject<Part> | null> {
    // remove trailing ! from IDs if any
    const unscopedIds = thesauriIds.map((id) => {
      return this._thesaurusService.getScopedId(id);
    });

    // return a promise
    this._loading$.next(true);
    return new Promise<EditedObject<Part> | null>((resolve, reject) => {
      // load part and thesauri
      forkJoin({
        part: this._itemService.getPart(identity.partId || ''),
        thesauri: this._thesaurusService.getThesauriSet(unscopedIds),
      }).subscribe({
        next: (result) => {
          const part: Part | null = result.part;
          const thesauri = result.thesauri;

          // if the loaded part has a thesaurus scope, reload the thesauri
          if (part?.thesaurusScope) {
            const scopedIds: string[] = thesauriIds.map((id) => {
              return this._thesaurusService.getScopedId(
                id,
                part.thesaurusScope
              );
            });
            this._thesaurusService.getThesauriSet(scopedIds).subscribe({
              next: (scopedThesauri) => {
                this._loading$.next(false);
                resolve({
                  value: part,
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
              value: part,
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
    partId: string
  ): Promise<EditedObject<Part> | null> {
    return new Promise<EditedObject<Part> | null>((resolve, reject) => {
      this._loading$.next(true);
      this._itemService
        .getPart(partId)
        .pipe(
          take(1),
          map((part: Part | null) => {
            return part
              ? {
                  value: part,
                  thesauri: {},
                }
              : null;
          })
        )
        .subscribe({
          next: (result) => {
            this._loading$.next(false);
            resolve(result);
          },
          error: (error) => {
            this._loading$.next(false);
            console.error(error);
            reject({
              message: 'Error loading part ' + partId,
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
    identity: PartIdentity,
    thesauriIds?: string[]
  ): Promise<EditedObject<Part> | null> {
    if (thesauriIds?.length) {
      return this.loadWithThesauri(identity, thesauriIds);
    } else {
      return this.loadWithoutThesauri(identity.partId!);
    }
  }

  /**
   * Save the part.
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
