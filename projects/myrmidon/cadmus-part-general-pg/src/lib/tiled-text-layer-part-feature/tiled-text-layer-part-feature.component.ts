import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { map, Observable, Subscription } from 'rxjs';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardActions,
  MatCardContent,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatToolbar } from '@angular/material/toolbar';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { LayerHintsComponent } from '@myrmidon/cadmus-ui';
import {
  TokenLocation,
  LibraryRouteService,
  ComponentCanDeactivate,
  LayerHint,
} from '@myrmidon/cadmus-core';
import { UserLevelService } from '@myrmidon/cadmus-api';
import {
  TextTileComponent,
  TextTileRow,
  TiledTextPart,
} from '@myrmidon/cadmus-part-general-ui';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { EditedLayerRepository } from '@myrmidon/cadmus-state';

import { TiledTextLayerView, TextTileLayerView } from './tiled-text-layer-view';
import {
  CurrentItemBarComponent,
  CurrentLayerPartBarComponent,
} from '@myrmidon/cadmus-ui-pg';

/**
 * Tiled text layer part editor.
 * This editor allows picking any layer and see all the text tiles included
 * in a fragment with a color highlight. Users can check any number of tiles
 * not belonging to any fragment in the selected layer, and add a new fragment
 * in the selected layer; or check any number of tiles belonging to a fragment
 * of the selected layer, and edit or delete it.
 * Tiles are thus colorized by the UI to render the fragments extent; and freely
 * checked by users to select the fragments to operate with.
 * All the checked tiles must follow each other, in one or more rows. Users can
 * just check the first and the last of a sequence to get the whole sequence
 * checked.
 */
@Component({
  selector: 'cadmus-tiled-text-layer-part-feature',
  templateUrl: './tiled-text-layer-part-feature.component.html',
  styleUrls: ['./tiled-text-layer-part-feature.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatIconButton,
    MatTooltip,
    MatCardActions,
    MatToolbar,
    MatCardContent,
    MatProgressBar,
    MatButton,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    AsyncPipe,
    CurrentItemBarComponent,
    CurrentLayerPartBarComponent,
    LayerHintsComponent,
    TextTileComponent,
  ],
})
export class TiledTextLayerPartFeatureComponent
  implements OnInit, OnDestroy, ComponentCanDeactivate
{
  private _sub?: Subscription;
  public readonly view = signal<TiledTextLayerView | undefined>(undefined);
  public selectedTile?: TextTileLayerView;

  public itemId: string;
  public partId?: string;
  public roleId?: string;

  public loading$: Observable<boolean>;
  public saving$: Observable<boolean>;

  public baseText$: Observable<string | undefined>;
  public locations$: Observable<TokenLocation[]>;
  public rows$: Observable<TextTileRow[]>;
  public breakChance$: Observable<number | undefined>;
  public layerHints$: Observable<LayerHint[]>;

  public pickedLocation?: string;
  public userLevel: number;

  constructor(
    route: ActivatedRoute,
    private _router: Router,
    private _repository: EditedLayerRepository,
    private _libraryRouteService: LibraryRouteService,
    private _editedItemRepository: EditedItemRepository,
    private _dialogService: DialogService,
    userLevelService: UserLevelService
  ) {
    this.itemId = route.snapshot.params['iid'];
    this.partId = route.snapshot.params['pid'];
    if (this.partId === 'new') {
      this.partId = undefined;
    }
    this.roleId = route.snapshot.queryParams['rid'];
    if (this.roleId === 'default') {
      this.roleId = undefined;
    }
    this.userLevel = userLevelService.getCurrentUserLevel();

    // layers part
    this.loading$ = this._repository.loading$;
    this.saving$ = this._repository.saving$;

    this.baseText$ = this._repository.baseText$;
    this.locations$ = this._repository.locations$;
    this.breakChance$ = this._repository.breakChance$;
    this.layerHints$ = this._repository.layerHints$;

    // base text: connect rows to the base text part
    this.rows$ = this._repository.baseTextPart$.pipe(
      map((part) => (part as TiledTextPart)?.rows)
    );
  }

  public canDeactivate(): boolean {
    return true;
  }

  public ngOnInit(): void {
    // when the base text changes, load all the fragments locations
    // and setup their UI state
    this._sub = this.rows$.subscribe((rows) => {
      const v = rows ? new TiledTextLayerView(rows) : undefined;
      v?.setFragmentLocations(this._repository.getLocations());
      this.view.set(v);
    });

    // ensure that the container item is loaded
    this._editedItemRepository.ensureItemLoaded(this.itemId);

    // load the layer part
    this._repository.reset();
    if (this.partId) {
      this._repository.load(this.itemId, this.partId);
    }
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public refreshBreakChance(): void {
    this._repository.refreshBreakChance();
  }

  public onTileChecked(y: number, x: number, checked: boolean): void {
    const v = this.view();
    if (v) {
      v.toggleLinearTileCheck(y, x, checked);
    }
  }

  private getSelectedTileCoords(): { y: number; x: number } | null {
    const v = this.view();
    if (!this.selectedTile || !v) {
      return null;
    }
    for (let i = 0; i < v.rows.length; i++) {
      const j = v.rows[i].tiles.indexOf(this.selectedTile);
      if (j > -1) {
        return { y: i + 1, x: j + 1 };
      }
    }
    return null;
  }

  public selectPrevTile(): void {
    const v = this.view();
    if (!v) {
      return;
    }
    let yx = this.getSelectedTileCoords();
    if (yx) {
      yx = v.getPrevTileCoords(yx.y, yx.x);
      if (yx) {
        this.selectedTile = v.rows[yx.y - 1].tiles[yx.x - 1];
      }
    }
  }

  public selectNextTile(): void {
    const v = this.view();
    if (!v) {
      return;
    }
    let yx = this.getSelectedTileCoords();
    if (yx) {
      yx = v.getNextTileCoords(yx.y, yx.x);
      if (yx) {
        this.selectedTile = v.rows[yx.y - 1].tiles[yx.x - 1];
      }
    }
  }

  public deleteFragment(): void {
    const v = this.view();
    if (!v) {
      return;
    }
    const lf = v.getCheckedLocationAndFragment();
    if (!lf || lf.fragment === -1) {
      return;
    }

    const locations = this._repository.getLocations();
    const loc = locations[lf.fragment];
    this._dialogService
      .confirm('Delete Fragment', `Delete the fragment at ${loc}?`)
      .subscribe((ok: boolean) => {
        if (ok) {
          // find the fragment and remove it from the part
          const i = this._repository.getPart()?.fragments.findIndex((p) => {
            return TokenLocation.parse(p.location)?.overlaps(loc);
          });
          if (i === -1) {
            return;
          }
          this._repository.deleteFragment(loc);
        }
      });
  }

  public deleteFragmentFromHint(hint: LayerHint): void {
    const loc = TokenLocation.parse(hint.location);
    if (loc) {
      this._repository.deleteFragment(loc);
    }
  }

  private navigateToFragmentEditor(loc: string): void {
    const part = this._repository.getPart();
    if (!part) {
      return;
    }

    const { route, rid } = this._libraryRouteService.buildFragmentEditorRoute(
      this._editedItemRepository.getFacet()!.partDefinitions,
      part.itemId,
      part.id,
      part.typeId,
      part.roleId,
      loc
    );

    // navigate to the editor
    this._router.navigate(
      [route],
      rid
        ? {
            queryParams: {
              rid: part.roleId,
            },
          }
        : {}
    );
  }

  public editFragment(): void {
    const v = this.view();
    if (!v) {
      return;
    }
    const lf = v.getCheckedLocationAndFragment();
    if (!lf || lf.fragment === -1) {
      return;
    }
    const locations = this._repository.getLocations();
    this.navigateToFragmentEditor(locations[lf.fragment].toString());
  }

  public editFragmentFromHint(hint: LayerHint): void {
    this.navigateToFragmentEditor(hint.location);
  }

  public moveFragmentFromHint(hint: LayerHint): void {
    if (
      !this.pickedLocation ||
      this.pickedLocation === hint.location ||
      !this.partId
    ) {
      return;
    }
    this._repository.applyLayerPatches(this.partId, [
      `mov ${hint.location} ${this.pickedLocation}`,
    ]);
  }

  public addFragment(): void {
    const v = this.view();
    if (!v) {
      return;
    }
    const lf = v.getCheckedLocationAndFragment();
    if (!lf || lf.fragment > -1) {
      return;
    }
    this.navigateToFragmentEditor(lf.location.toString());
  }

  public pickLocation(): void {
    const v = this.view();
    if (!v) {
      return;
    }
    const lf = v.getCheckedLocationAndFragment();
    if (!lf) {
      return;
    }
    const locations = this._repository.getLocations();
    this.pickedLocation = (
      lf.fragment === -1 ? lf.location : locations[lf.fragment]
    ).toString();
  }

  public clearTileChecks(): void {
    const v = this.view();
    if (!v) {
      return;
    }
    v.setAllTilesViewState({ checked: false });
    this.pickedLocation = undefined;
  }

  public applyLayerPatches(patches: string[]): void {
    if (this.partId) {
      this._repository.applyLayerPatches(this.partId, patches);
    }
  }

  public close(): void {
    this._router.navigate(['/items', this.itemId]);
  }
}
