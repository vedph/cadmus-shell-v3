import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
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
  ComponentCanDeactivate,
  LayerHint,
} from '@myrmidon/cadmus-core';
import { EditedLayerRepository } from '@myrmidon/cadmus-state';
import { UserLevelService } from '@myrmidon/cadmus-api';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import {
  DecoratedTokenTextComponent,
  DecoratedTokenTextSelection,
  LayerHintsComponent,
} from '@myrmidon/cadmus-ui';
import { CurrentItemBarComponent, CurrentLayerPartBarComponent } from '@myrmidon/cadmus-item-editor';

/**
 * Token-based text layer part feature editor. This is a special type of editor,
 * rather than being a simple wrapper like the others; it is used for editing
 * any text layer (using token-based coordinates), whatever the type of its
 * fragments. Being a sort of portal for accessing a fragments editor, it has
 * no save capability: the single fragments are edited and saved as needed.
 *
 * The base text is displayed by `DecoratedTokenTextComponent`, where the
 * characters of existing fragments are highlighted and cannot be selected.
 * Users can:
 * - select any other portion of the text, to add a new fragment there
 * (or to pick its location as the target for moving a fragment from the
 * layer hints).
 * - click an existing fragment, to edit or delete it.
 */
@Component({
  selector: 'cadmus-token-text-layer-part-feature',
  templateUrl: './token-text-layer-part-feature.component.html',
  styleUrls: ['./token-text-layer-part-feature.component.css'],
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

  /**
   * The location of the current text selection, i.e. of a new fragment
   * covering it; null when there is no selection.
   */
  public readonly newLocation = signal<TokenLocation | null>(null);

  /**
   * The location of the existing fragment picked by the user, if any.
   */
  public readonly selectedLocation = signal<TokenLocation | undefined>(
    undefined,
  );

  constructor(
    route: ActivatedRoute,
    private _router: Router,
    private _repository: EditedLayerRepository,
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

  /**
   * Handle a new selection in the base text.
   */
  public onSelectionChange(selection: DecoratedTokenTextSelection): void {
    this.newLocation.set(selection.location);
  }

  /**
   * Get the location of the part's fragment corresponding to the specified
   * location, exactly as stored in the part. This ensures that the fragment
   * editor finds the fragment, even if its location is stored in a
   * non-canonical form (e.g. 1.2@1x1 rather than 1.2@1).
   */
  private getStoredLocation(location: TokenLocation): string {
    const key = location.toString();
    return (
      this._repository
        .getPart()
        ?.fragments?.find(
          (f) => TokenLocation.parse(f.location)?.toString() === key,
        )?.location || key
    );
  }

  public deleteFragment() {
    const location = this.selectedLocation();
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
          this.selectedLocation.set(undefined);
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
    const location = this.selectedLocation();
    if (location) {
      this.navigateToFragmentEditor(this.getStoredLocation(location));
    }
  }

  public editFragmentFromHint(hint: LayerHint): void {
    this.navigateToFragmentEditor(hint.location);
  }

  public addFragment(): void {
    const location = this.newLocation();
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
    const location = this.newLocation();
    if (location) {
      this.pickedLocation = location.toString();
    }
  }

  public close(): void {
    this._router.navigate(['/items', this.itemId]);
  }
}
