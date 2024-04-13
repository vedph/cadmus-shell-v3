import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';

import {
  FacetDefinition,
  Item,
  LayerPartInfo,
  Part,
  PartDefinition,
  PartGroup,
} from '@myrmidon/cadmus-core';
import { ItemService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';

/**
 * Edited item repository.
 */
@Injectable({ providedIn: 'root' })
export class EditedItemRepository {
  private readonly _loading$: BehaviorSubject<boolean | undefined>;
  // the item being edited
  private readonly _item$: BehaviorSubject<Item | undefined>;
  // the raw list of item's parts
  private readonly _parts$: BehaviorSubject<Part[]>;
  private readonly _partGroups$: BehaviorSubject<PartGroup[]>;
  // the set of all the possible layer parts for this item, either
  // present or absent
  private readonly _layersPartInfo$: BehaviorSubject<LayerPartInfo[]>;
  // the facet definition assigned to the item
  private readonly _facet$: BehaviorSubject<FacetDefinition | undefined>;
  // the part definitions for adding a new part, filtered by the selected
  // facet and the parts already present in the item.
  private readonly _newPartDefinitions$: BehaviorSubject<PartDefinition[]>;

  public get loading$(): Observable<boolean | undefined> {
    return this._loading$.asObservable();
  }
  public get item$(): Observable<Item | undefined> {
    return this._item$.asObservable();
  }
  public get parts$(): Observable<Part[]> {
    return this._parts$.asObservable();
  }
  public get partGroups$(): Observable<PartGroup[]> {
    return this._partGroups$.asObservable();
  }
  public get layers$(): Observable<LayerPartInfo[]> {
    return this._layersPartInfo$.asObservable();
  }
  public get facet$(): Observable<FacetDefinition | undefined> {
    return this._facet$.asObservable();
  }
  public get newPartDefinitions$(): Observable<PartDefinition[]> {
    return this._newPartDefinitions$.asObservable();
  }

  constructor(
    private _appRepository: AppRepository,
    private _itemService: ItemService
  ) {
    this._loading$ = new BehaviorSubject<boolean | undefined>(undefined);
    this._item$ = new BehaviorSubject<Item | undefined>(undefined);
    this._parts$ = new BehaviorSubject<Part[]>([]);
    this._partGroups$ = new BehaviorSubject<PartGroup[]>([]);
    this._layersPartInfo$ = new BehaviorSubject<LayerPartInfo[]>([]);
    this._facet$ = new BehaviorSubject<FacetDefinition | undefined>(undefined);
    this._newPartDefinitions$ = new BehaviorSubject<PartDefinition[]>([]);
  }

  public getItem(): Item | undefined {
    return this._item$.value;
  }

  public getFacet(): FacetDefinition | undefined {
    return this._facet$.value;
  }

  private getExistingPartTypeAndRoleIds(): {
    typeId: string;
    roleId?: string;
  }[] {
    const groups = this.getPartGroups();
    if (!groups) {
      return [];
    }
    const results = [];
    for (const group of groups) {
      for (const part of group.parts) {
        results.push({
          typeId: part.typeId,
          roleId: part.roleId,
        });
      }
    }

    return results;
  }

  private getNewPartDefinitions(): PartDefinition[] {
    const facet = this.getFacet();
    if (!facet) {
      return [];
    }

    const existingTypeRoleIds = this.getExistingPartTypeAndRoleIds();

    const defs: PartDefinition[] = [];
    for (const def of facet.partDefinitions) {
      // exclude layer parts, as these are in the layers tab
      if (def.roleId?.startsWith('fr.')) {
        continue;
      }
      // exclude parts present in the item
      if (
        existingTypeRoleIds.find((tr) => {
          return (
            tr.typeId === def.typeId &&
            ((!tr.roleId && !def.roleId) || tr.roleId === def.roleId)
          );
        })
      ) {
        continue;
      }
      defs.push(def);
    }
    // sort by sort key
    defs.sort((a, b) => {
      return (a.sortKey || '').localeCompare(b.sortKey || '');
    });
    return defs;
  }

  public getPartGroups(): PartGroup[] {
    return this._partGroups$.value;
  }

  private pickDefaultFacet(
    facets: FacetDefinition[]
  ): FacetDefinition | undefined {
    if (!facets.length) {
      return undefined;
    }
    // if there is a facet with id="default", pick it
    const defaultFacet = facets.find((f) => f.id === 'default');
    if (defaultFacet) {
      return defaultFacet;
    }
    // else just pick the first in the list
    return facets[0];
  }

  /**
   * Load the specified item or a new item.
   *
   * @param itemId The item ID, or falsy for a new item.
   */
  public load(itemId?: string): void {
    const facets = this._appRepository.getFacets();

    this._loading$.next(true);
    if (!itemId) {
      // new item
      this._itemService.getItemLayerInfo('new', true).subscribe((layers) => {
        const facet = this.pickDefaultFacet(facets);
        this._loading$.next(false);
        this._item$.next({
          id: '',
          title: '',
          description: '',
          facetId: facet?.id || '',
          groupId: '',
          sortKey: '',
          flags: 0,
          timeCreated: new Date(),
          creatorId: '',
          timeModified: new Date(),
          userId: '',
        });
        this._parts$.next([]);
        this._partGroups$.next([]);
        this._layersPartInfo$.next(layers);
        this._facet$.next(facet);
        this._newPartDefinitions$.next(this.getNewPartDefinitions());
      });
    } else {
      // existing item
      forkJoin({
        item: this._itemService.getItem(itemId, true),
        layers: this._itemService.getItemLayerInfo(itemId, true),
      }).subscribe({
        next: (result) => {
          this._loading$.next(false);

          const itemFacet = facets.find((f) => {
            return f.id === result.item!.facetId;
          });
          const facetParts = itemFacet ? itemFacet.partDefinitions : [];

          this._item$.next(result.item!);
          this._parts$.next(result.item!.parts || []);
          this._partGroups$.next(
            this._itemService.groupParts(result.item!.parts || [], facetParts)
          );
          this._layersPartInfo$.next(result.layers);
          this._facet$.next(itemFacet);
          this._newPartDefinitions$.next(this.getNewPartDefinitions());
        },
      });
    }
  }

  /**
   * Ensure that the item with the specified ID is loaded.
   *
   * @param id The item ID.
   */
  public ensureItemLoaded(id: string): void {
    if (this.getItem()?.id === id) {
      return;
    }
    this.load(id);
  }

  /**
   * Save the specified item in the backend and update this store.
   *
   * @param item The item.
   * @returns Promise with saved item.
   */
  public save(item: Item): Promise<Item> {
    return new Promise((resolve, reject) => {
      this._itemService.addItem(item).subscribe({
        next: (saved) => {
          // update the item and the selected facet from it;
          // this is required when the item was new, and thus loaded
          // with the default facet before saving it
          const facets = this._appRepository.getFacets();
          const itemFacet = facets.find((f) => {
            return f.id === saved.facetId;
          });
          this._item$.next(saved);
          this._facet$.next(itemFacet);
          this._newPartDefinitions$.next(this.getNewPartDefinitions());
          resolve(saved);
        },
        error: (error) => {
          if (error) {
            console.error(JSON.stringify(error));
          }
          reject({ message: 'Error saving item ' + item.id, error: error });
        },
      });
    });
  }

  /**
   * Delete the specified part from this edited item.
   *
   * @param id The part's ID.
   * @returns Promise with part ID.
   */
  public deletePart(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const itemId = this._item$.value?.id;
      if (!itemId) {
        reject({
          message: 'Cannot delete part of unsaved item',
        });
      }
      this._itemService.deletePart(id).subscribe({
        next: (_) => {
          this.load(itemId);
          resolve(id);
        },
        error: (error) => {
          if (error) {
            console.error(JSON.stringify(error));
          }
          reject({
            message: "Error deleting item's part " + id,
            error: error,
          });
        },
      });
    });
  }

  /**
   * Add a new layer part to this item.
   *
   * @param typeId The part type ID.
   * @param roleId The part role ID.
   * @returns Promise with new part.
   */
  public addNewLayerPart(typeId: string, roleId?: string): Promise<Part> {
    return new Promise((resolve, reject) => {
      const itemId = this._item$.value?.id;
      if (!itemId) {
        reject({
          message: 'Cannot add part to unsaved item',
        });
      }
      const part: Part = {
        itemId: itemId!,
        typeId,
        roleId,
        id: '',
        creatorId: '',
        userId: '',
        timeCreated: new Date(),
        timeModified: new Date(),
      };
      this._itemService.addPart(part).subscribe({
        next: (part) => {
          this.load(itemId);
          resolve(part);
        },
        error: (error) => {
          if (error) {
            console.error(JSON.stringify(error));
          }
          reject({
            message: 'Error adding new layer part for item ' + itemId,
            error: error,
          });
        },
      });
    });
  }

  /**
   * Set the scope for the specified parts in this item.
   *
   * @param ids The part IDs.
   * @param scope The scope to set.
   * @returns Promise.
   */
  public setPartThesaurusScope(ids: string[], scope: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const itemId = this._item$.value?.id;
      if (!itemId) {
        reject({
          message: 'Cannot set scope for unsaved item',
        });
      }
      this._itemService.setPartThesaurusScope(ids, scope).subscribe({
        next: (_) => {
          this.load(itemId);
          resolve(true);
        },
        error: (error) => {
          if (error) {
            console.error(JSON.stringify(error));
          }
          reject({
            message: "Error setting item's part scope",
            error: error,
          });
        },
      });
    });
  }
}
