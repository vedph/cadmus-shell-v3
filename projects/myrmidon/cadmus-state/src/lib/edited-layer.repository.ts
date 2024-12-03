import {
  Fragment,
  LayerHint,
  Part,
  TextLayerPart,
  ThesauriSet,
  TokenLocation,
} from '@myrmidon/cadmus-core';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';

import {
  FacetService,
  ItemService,
  ThesaurusService,
} from '@myrmidon/cadmus-api';
import { deepCopy } from '@myrmidon/ngx-tools';

/**
 * Edited layer part repository.
 */
@Injectable({ providedIn: 'root' })
export class EditedLayerRepository {
  // the layer part (=collection of fragments) being edited
  private _part$: BehaviorSubject<TextLayerPart | undefined>;
  // the base text rendered into a plain string, whatever its original model.
  // This is used for reference (e.g. show it to the user while editing),
  // even if in some cases it can be enough to work with the base text in the
  // layer part editor itself (this is the case of the token-based text,
  // but not e.g. for the tiles-based text).
  private _baseText$: BehaviorSubject<string | undefined>;
  // the base text part
  private _baseTextPart$: BehaviorSubject<Part | undefined>;
  // the fragments locations, collected from all the fragments
  private _locations$: BehaviorSubject<TokenLocation[]>;
  // the estimated chance of broken fragments in this layer: 0=safe,
  // 1=potentially broken, 2=broken
  private _breakChance$: BehaviorSubject<number>;
  // the layer fragments reconciliation hints. There is one hint for each
  // fragment in the layer.
  private _layerHints$: BehaviorSubject<LayerHint[]>;
  private _thesauriSet: BehaviorSubject<ThesauriSet | undefined>;

  private _loading$: BehaviorSubject<boolean>;
  private _saving$: BehaviorSubject<boolean>;

  public get loading$(): Observable<boolean> {
    return this._loading$.asObservable();
  }
  public get saving$(): Observable<boolean> {
    return this._saving$.asObservable();
  }

  public get part$(): Observable<TextLayerPart | undefined> {
    return this._part$.asObservable();
  }
  public get baseText$(): Observable<string | undefined> {
    return this._baseText$.asObservable();
  }
  public get baseTextPart$(): Observable<Part | undefined> {
    return this._baseTextPart$.asObservable();
  }
  public get locations$(): Observable<TokenLocation[]> {
    return this._locations$.asObservable();
  }
  public get breakChance$(): Observable<number> {
    return this._breakChance$.asObservable();
  }
  public get layerHints$(): Observable<LayerHint[]> {
    return this._layerHints$.asObservable();
  }

  constructor(
    private _itemService: ItemService,
    private _facetService: FacetService,
    private _thesaurusService: ThesaurusService
  ) {
    this._part$ = new BehaviorSubject<TextLayerPart | undefined>(undefined);
    this._baseText$ = new BehaviorSubject<string | undefined>(undefined);
    this._baseTextPart$ = new BehaviorSubject<Part | undefined>(undefined);
    this._locations$ = new BehaviorSubject<TokenLocation[]>([]);
    this._breakChance$ = new BehaviorSubject<number>(-1);
    this._layerHints$ = new BehaviorSubject<LayerHint[]>([]);
    this._thesauriSet = new BehaviorSubject<ThesauriSet | undefined>(undefined);
    this._loading$ = new BehaviorSubject<boolean>(false);
    this._saving$ = new BehaviorSubject<boolean>(false);
  }

  public reset(): void {
    this._part$.next(undefined);
    this._baseText$.next(undefined);
    this._baseTextPart$.next(undefined);
    this._locations$.next([]);
    this._breakChance$.next(-1);
    this._layerHints$.next([]);
  }

  public getPart(): TextLayerPart | undefined {
    return this._part$.value;
  }

  public getBaseText(): string | undefined {
    return this._baseText$.value;
  }

  public getLocations(): TokenLocation[] {
    return this._locations$.value;
  }

  private getPartLocations(part: TextLayerPart): TokenLocation[] {
    const locations: TokenLocation[] = [];

    if (part && part.fragments) {
      part.fragments.forEach((p) => {
        locations.push(TokenLocation.parse(p.location)!);
      });
    }
    return locations;
  }

  private loadWithThesauri(
    itemId: string,
    partId: string,
    thesauriIds: string[]
  ): void {
    // remove trailing ! from IDs if any
    const unscopedIds = thesauriIds.map((id) => {
      return this._thesaurusService.getScopedId(id);
    });

    this._loading$.next(true);
    forkJoin({
      // TODO: eventually optimize by adding method param to load only fragments locations
      layerPart: this._itemService.getPart(partId),
      baseText: this._itemService.getBaseTextPart(itemId),
      layers: this._facetService.getFacetParts(itemId, true),
      breakChance: this._itemService.getLayerPartBreakChance(partId),
      layerHints: this._itemService.getLayerPartHints(partId),
      thesauri: this._thesaurusService.getThesauriSet(unscopedIds),
    }).subscribe({
      next: (result) => {
        // if the loaded part has a thesaurus scope, reload the thesauri
        if (result.layerPart?.thesaurusScope) {
          const scopedIds: string[] = thesauriIds.map((id) => {
            return this._thesaurusService.getScopedId(
              id,
              result.layerPart!.thesaurusScope
            );
          });
          this._thesaurusService.getThesauriSet(scopedIds).subscribe({
            next: (thesauri) => {
              this._loading$.next(false);
              this._part$.next(result.layerPart as TextLayerPart);
              this._baseText$.next(result.baseText.text);
              this._baseTextPart$.next(result.baseText.part);
              this._locations$.next(
                this.getPartLocations(result.layerPart as TextLayerPart)
              );
              this._breakChance$.next(result.breakChance.chance);
              this._layerHints$.next(result.layerHints);
              this._thesauriSet.next(thesauri);
            },
            error: (error) => {
              this._loading$.next(false);
              console.error(
                'Error loading thesauri: ' + JSON.stringify(error || {})
              );
            },
          });
        } else {
          this._loading$.next(false);
          this._part$.next(result.layerPart as TextLayerPart);
          this._baseText$.next(result.baseText.text);
          this._baseTextPart$.next(result.baseText.part);
          this._locations$.next(
            this.getPartLocations(result.layerPart as TextLayerPart)
          );
          this._breakChance$.next(result.breakChance.chance);
          this._layerHints$.next(result.layerHints);
          this._thesauriSet.next(result.thesauri);
        }
      },
      error: (error) => {
        this._loading$.next(false);
        console.error(
          'Error loading text layer part: ' + JSON.stringify(error || {})
        );
      },
    });
  }

  private loadWithoutThesauri(itemId: string, partId: string): void {
    this._loading$.next(true);
    forkJoin({
      // TODO: eventually optimize by adding method param to load only fragments locations
      layerPart: this._itemService.getPart(partId),
      baseText: this._itemService.getBaseTextPart(itemId),
      layers: this._facetService.getFacetParts(itemId, true),
      breakChance: this._itemService.getLayerPartBreakChance(partId),
      layerHints: this._itemService.getLayerPartHints(partId),
    }).subscribe({
      next: (result) => {
        this._loading$.next(false);
        this._part$.next(result.layerPart as TextLayerPart);
        this._baseText$.next(result.baseText.text);
        this._baseTextPart$.next(result.baseText.part);
        this._locations$.next(
          this.getPartLocations(result.layerPart as TextLayerPart)
        );
        this._breakChance$.next(result.breakChance.chance);
        this._layerHints$.next(result.layerHints);
      },
      error: (error) => {
        this._loading$.next(false);
        console.error(
          'Error loading text layer part: ' + JSON.stringify(error || {})
        );
      },
    });
  }

  /**
   * Load the state for editing layer part(s).
   *
   * @param itemId The item ID the layer part belongs to.
   * @param partId The layer part ID.
   * @param thesauriIds The optional thesauri IDs to load.
   */
  public load(itemId: string, partId: string, thesauriIds?: string[]): void {
    if (thesauriIds?.length) {
      this.loadWithThesauri(itemId, partId, thesauriIds);
    } else {
      this.loadWithoutThesauri(itemId, partId);
    }
  }

  /**
   * Refresh the layer part break chance.
   */
  public refreshBreakChance(): void {
    const part = this._part$.value;
    if (!part) {
      return;
    }
    this._itemService.getLayerPartBreakChance(part.id).subscribe({
      next: (result) => {
        this._breakChance$.next(result.chance);
      },
      error: (error) => {
        console.error(
          'Error calculating break chance: ' + JSON.stringify(error || {})
        );
        this._breakChance$.next(-1);
      },
    });
  }

  public applyLayerPatches(partId: string, patches: string[]): void {
    this._saving$.next(true);
    this._itemService.applyLayerPatches(partId, patches).subscribe({
      next: (part) => {
        this._saving$.next(false);
        this.load(part.itemId, partId);
      },
      error: (error) => {
        this._saving$.next(false);
        console.error(
          'Error patching text layer part: ' + JSON.stringify(error || {})
        );
      },
    });
  }

  /**
   * Delete the fragment at the specified location.
   *
   * @param loc The fragment's location.
   */
  public deleteFragment(loc: TokenLocation): void {
    // find the fragment
    let part = this._part$.value;
    if (!part) {
      return;
    }
    const i = part.fragments.findIndex((p) => {
      return TokenLocation.parse(p.location)?.overlaps(loc);
    });
    if (i === -1) {
      return;
    }

    this._saving$.next(true);
    // remove it from the part
    // work on a copy, as store objects are immutable
    part = deepCopy(part);
    part!.fragments.splice(i, 1);

    // update the part and reload state once done
    this._itemService.addPart(part!).subscribe({
      next: (_) => {
        this._saving$.next(false);
        this.load(part!.itemId, part!.id);
      },
      error: (error) => {
        this._saving$.next(false);
        console.error(error);
        console.error(
          `Error deleting fragment at ${loc} in part ${part!.id}: ` +
            JSON.stringify(error || {})
        );
      },
    });
  }

  /**
   * Save the specified fragment.
   *
   * @param fragment The fragment.
   */
  public saveFragment(fragment: Fragment): void {
    // find the fragment
    let part = this._part$.value;
    if (!part) {
      return;
    }

    // add or replace it
    // work on a copy, as store objects are immutable
    this._saving$.next(true);
    part = deepCopy(part);

    // replace all the overlapping fragments with the new one
    const newLoc = TokenLocation.parse(fragment.location)!;
    let insertAt = 0;
    for (let i = part!.fragments.length - 1; i > -1; i--) {
      const frLoc = TokenLocation.parse(part!.fragments[i].location)!;
      if (newLoc.compareTo(frLoc) >= 0) {
        insertAt = i + 1;
      }
      if (newLoc.overlaps(frLoc)) {
        part!.fragments.splice(i, 1);
        if (insertAt > i && insertAt > 0) {
          insertAt--;
        }
      }
    }

    // add the new fragment
    part!.fragments.splice(insertAt, 0, fragment);

    // update the part and reload once done
    this._itemService.addPart(part!).subscribe({
      next: (_) => {
        this._saving$.next(false);
        this.load(part!.itemId, part!.id);
      },
      error: (error) => {
        this._saving$.next(false);
        console.error(
          `Error saving fragment at ${fragment.location} in part ${
            part!.id
          }: ` + JSON.stringify(error || {})
        );
      },
    });
  }
}
