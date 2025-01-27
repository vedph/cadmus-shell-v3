import { Component, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';

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

import {
  TokenLocation,
  LibraryRouteService,
  TextLayerService,
  ComponentCanDeactivate,
  LayerHint,
} from '@myrmidon/cadmus-core';
import { EditedLayerRepository } from '@myrmidon/cadmus-state';
import { UserLevelService } from '@myrmidon/cadmus-api';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import {
  DecoratedTokenTextComponent,
  LayerHintsComponent,
} from '@myrmidon/cadmus-ui';
import { CurrentItemBarComponent, CurrentLayerPartBarComponent } from '@myrmidon/cadmus-ui-pg';

/**
 * Token-based text layer part feature editor. This is a special type of editor,
 * rather than being a simple wrapper like the others; it is used for editing
 * any text layer (using token-based coordinates), whatever the type of its
 * fragments. Being a sort of portal for accessing a fragments editor, it has
 * no save capability: the single fragments are edited and saved as needed.
 */
@Component({
  selector: 'cadmus-token-text-layer-part-feature',
  templateUrl: './token-text-layer-part-feature.component.html',
  styleUrls: ['./token-text-layer-part-feature.component.css'],
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
    LayerHintsComponent,
    CurrentItemBarComponent,
    CurrentLayerPartBarComponent,
    DecoratedTokenTextComponent,
  ],
})
export class TokenTextLayerPartFeatureComponent
  implements OnInit, ComponentCanDeactivate
{
  public itemId: string;
  public partId?: string;
  public roleId?: string;

  public loading$: Observable<boolean>;
  public saving$: Observable<boolean>;
  public baseText$: Observable<string | undefined>;
  public locations$: Observable<TokenLocation[] | undefined>;
  public breakChance$: Observable<number>;
  public layerHints$: Observable<LayerHint[]>;

  public pickedLocation?: string;
  public userLevel: number;

  public textSize: number;

  constructor(
    route: ActivatedRoute,
    private _router: Router,
    private _repository: EditedLayerRepository,
    private _textLayerService: TextLayerService,
    private _libraryRouteService: LibraryRouteService,
    private _editedItemRepository: EditedItemRepository,
    private _dialogService: DialogService,
    userLevelService: UserLevelService
  ) {
    this.textSize = 14;
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

    this.loading$ = this._repository.loading$;
    this.saving$ = this._repository.saving$;
    this.baseText$ = this._repository.baseText$;
    this.locations$ = this._repository.locations$;
    this.breakChance$ = this._repository.breakChance$;
    this.layerHints$ = this._repository.layerHints$;
  }

  public canDeactivate(): boolean {
    return true;
  }

  public makeLarger(): void {
    const size = this.textSize + 2;
    if (size > 24) {
      return;
    }
    this.textSize = size;
  }

  public makeSmaller(): void {
    const size = this.textSize - 2;
    if (size < 12) {
      return;
    }
    this.textSize = size;
  }

  public ngOnInit(): void {
    // ensure the container item is loaded
    this._editedItemRepository.ensureItemLoaded(this.itemId);

    // load the layer part data
    this._repository.reset();
    if (this.partId) {
      this._repository.load(this.itemId, this.partId);
    }
  }

  public deleteFragment() {
    const range = this._textLayerService.getSelectedRange();
    if (!range) {
      return;
    }
    const location = this._textLayerService.getSelectedLocationForEdit(range);
    if (!location) {
      return;
    }

    this._dialogService
      .confirm('Delete Fragment', `Delete the fragment at ${location}?`)
      .subscribe((ok: boolean) => {
        if (ok) {
          // find the fragment and remove it from the part
          const i = this._repository.getPart()?.fragments.findIndex((p) => {
            return TokenLocation.parse(p.location)?.overlaps(location);
          });
          if (i === -1) {
            return;
          }
          this._repository.deleteFragment(location);
        }
      });
  }

  public deleteFragmentFromHint(hint: LayerHint): void {
    const loc = TokenLocation.parse(hint.location);
    if (loc) {
      this._repository.deleteFragment(loc);
    }
  }

  public refreshBreakChance(): void {
    this._repository.refreshBreakChance();
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
    const range = this._textLayerService.getSelectedRange();
    if (!range) {
      return;
    }
    const location = this._textLayerService.getSelectedLocationForEdit(range);
    if (location) {
      this.navigateToFragmentEditor(location.toString());
    }
  }

  public editFragmentFromHint(hint: LayerHint): void {
    this.navigateToFragmentEditor(hint.location);
  }

  public addFragment(): void {
    const range = this._textLayerService.getSelectedRange();
    if (!range) {
      return;
    }
    const location = this._textLayerService.getSelectedLocationForNew(
      range,
      this._repository.getBaseText() || ''
    );
    if (location) {
      this.navigateToFragmentEditor(location.toString());
    }
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

  public applyLayerPatches(patches: string[]): void {
    if (this.partId) {
      this._repository.applyLayerPatches(this.partId, patches);
    }
  }

  public pickLocation(): void {
    const range = this._textLayerService.getSelectedRange();
    if (!range) {
      return;
    }
    const location = this._textLayerService.getSelectedLocationForNew(
      range,
      this._repository.getBaseText() || ''
    );
    if (location) {
      this.pickedLocation = location.toString();
    }
  }

  public close(): void {
    this._router.navigate(['/items', this.itemId]);
  }
}
