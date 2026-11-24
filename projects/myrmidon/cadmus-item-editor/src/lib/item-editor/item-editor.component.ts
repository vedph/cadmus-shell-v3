import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  Signal,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { DatePipe } from '@angular/common';
import { take } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatCard, MatCardContent } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { ItemRefLookupService } from '@myrmidon/cadmus-refs-asserted-ids';

import {
  Item,
  PartGroup,
  PartDefinition,
  FacetDefinition,
  FlagDefinition,
  Part,
  LibraryRouteService,
  LayerPartInfo,
  Thesaurus,
  ComponentCanDeactivate,
} from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';
import {
  ItemService,
  MessagingService,
  UserLevelService,
} from '@myrmidon/cadmus-api';
import { MESSAGE_ITEM_LIST_REPOSITORY_RESET } from '@myrmidon/cadmus-item-list';
import {
  DataTableComponent,
  getPartIdName,
  PartBadgeComponent,
} from '@myrmidon/cadmus-ui';

import {
  PartScopeSetRequest,
  PartsScopeEditorComponent,
} from '../parts-scope-editor/parts-scope-editor.component';
import { EditedItemRepository } from '../state/edited-item.repository';
import { CurrentItemBarComponent } from '../current-item-bar/current-item-bar.component';
import { ItemLookupDialogComponent } from '../item-lookup-dialog/item-lookup-dialog.component';
import { ItemGenerateDialogComponent } from '../item-generate-dialog/item-generate-dialog.component';
import { MissingPartsComponent } from '../missing-parts/missing-parts.component';
import { HasPreviewPipe } from '../has-preview.pipe';
import {
  ItemMetadata,
  ItemMetadataEditorComponent,
  ItemMetadataGenerationKey,
} from '../item-metadata-editor/item-metadata-editor.component';
import { ColorMap, ColorService, EnvService } from '@myrmidon/ngx-tools';

/**
 * Item editor page. This loads the item to edit from the route (whose ID is
 * 'new' for a new item, here stored as undefined), and lets users edit its
 * metadata via the "dumb" `ItemMetadataEditorComponent`, and its parts and
 * layers.
 */
@Component({
  selector: 'cadmus-item-editor',
  templateUrl: './item-editor.component.html',
  styleUrls: ['./item-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardContent,
    MatTooltip,
    CdkCopyToClipboard,
    MatProgressBar,
    MatTabGroup,
    MatTab,
    FormField,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatButton,
    MatIcon,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MatMenuTrigger,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatIconButton,
    MissingPartsComponent,
    DatePipe,
    HasPreviewPipe,
    PartsScopeEditorComponent,
    PartBadgeComponent,
    CurrentItemBarComponent,
    ItemMetadataEditorComponent,
    DataTableComponent,
  ],
})
export class ItemEditorComponent implements OnInit, ComponentCanDeactivate {
  /**
   * The colors of part groups headers, keyed by group ID. This is shared by
   * all the instances of the editor, so that a group always gets the same
   * color during the app's lifetime. It is seeded with the sorted group IDs
   * of all the facets, so that colors are also stable across sessions with
   * the same facets.
   */
  private static readonly _groupColorMap = new ColorMap();

  // signals from edited-item repository
  public readonly item: Signal<Item | undefined>;
  public readonly parts: Signal<Part[]>;
  public readonly partGroups: Signal<PartGroup[]>;
  public readonly layerPartInfos: Signal<LayerPartInfo[]>;
  public readonly facet: Signal<FacetDefinition | undefined>;
  public readonly newPartDefinitions: Signal<PartDefinition[]>;
  // signals from app repository
  public readonly facets: Signal<FacetDefinition[]>;
  public readonly typeThesaurus: Signal<Thesaurus | undefined>;
  public readonly previewJKeys: Signal<string[]>;
  public readonly previewFKeys: Signal<string[]>;
  public readonly flagDefinitions: Signal<FlagDefinition[]>;

  public readonly id = signal<string | undefined>(undefined);
  private readonly _currentUser: Signal<User | null>;
  public readonly user: Signal<User | undefined>;
  public readonly userLevel: Signal<number>;
  public readonly busy = signal<boolean>(false);
  public readonly hasMetadataBuilders = signal<boolean>(false);
  /**
   * True when the edit history view is enabled (historyEnabled in env).
   */
  public readonly historyEnabled = signal<boolean>(false);
  /**
   * True when the metadata editor has unsaved changes.
   */
  public readonly metadataDirty = signal<boolean>(false);

  /**
   * The metadata editor. This is created once the metadata tab is shown,
   * and preserved when switching tabs.
   */
  public readonly metadataEditor = viewChild(ItemMetadataEditorComponent);

  /**
   * The background and foreground colors for the item's facet.
   */
  public readonly facetColors: Signal<{ bg: string; fg: string }>;

  /**
   * The count of parts defined by the item's facet.
   */
  public readonly facetPartCount = computed<number>(
    () => this.facet()?.partDefinitions?.length || 0,
  );

  /**
   * The tooltip for the parts count.
   */
  public readonly partsCountTip = computed<string>(
    () =>
      `${this.parts().length} part(s) in this item, ` +
      `out of ${this.facetPartCount()} defined by its facet`,
  );

  /**
   * The background and foreground colors for each part group, keyed by
   * group ID.
   */
  public readonly groupColors: Signal<
    Record<string, { bg: string; fg: string }>
  >;

  /**
   * True if the current user can delete parts.
   */
  public readonly canDeleteParts: Signal<boolean>;

  /**
   * The maximum count of action buttons in a part row, used to size the
   * actions column uniformly across all the groups.
   */
  public readonly partActionCount: Signal<number>;

  /**
   * The keys of the collapsed part groups.
   */
  public readonly collapsedGroups = signal<ReadonlySet<string>>(new Set());

  /**
   * True if any part group is expanded.
   */
  public readonly anyGroupExpanded = computed<boolean>(() =>
    this.partGroups().some((g) => !this.collapsedGroups().has(g.key)),
  );

  // new part form
  public readonly newPart = form(
    signal<{ newPartType: PartDefinition | null }>({ newPartType: null }),
    (path) => {
      required(path.newPartType);
      // nothing to pick when all the facet's parts are already present
      disabled(path.newPartType, () => !this.newPartDefinitions().length);
    },
  );

  constructor(
    public itemLookupService: ItemRefLookupService,
    public dialog: MatDialog,
    private _router: Router,
    private _route: ActivatedRoute,
    private _snackbar: MatSnackBar,
    private _appRepository: AppRepository,
    private _repository: EditedItemRepository,
    private _itemService: ItemService,
    private _libraryRouteService: LibraryRouteService,
    private _dialogService: DialogService,
    private _authService: AuthJwtService,
    private _userLevelService: UserLevelService,
    private _messaging: MessagingService,
    private _envService: EnvService,
    private _colorService: ColorService,
  ) {
    this.id.set(this._route.snapshot.params['id']);
    if (this.id() === 'new') {
      this.id.set(undefined);
    }

    this.hasMetadataBuilders.set(
      String(this._envService.get('hasMetadataBuilders')) === 'true',
    );
    this.historyEnabled.set(
      String(this._envService.get('historyEnabled')) === 'true',
    );

    // signals from repositories
    this.item = toSignal(this._repository.item$);
    this.parts = toSignal(this._repository.parts$, { requireSync: true });
    this.partGroups = toSignal(this._repository.partGroups$, {
      requireSync: true,
    });
    this.layerPartInfos = toSignal(this._repository.layers$, {
      requireSync: true,
    });
    this.facet = toSignal(this._repository.facet$);
    this.newPartDefinitions = toSignal(this._repository.newPartDefinitions$, {
      requireSync: true,
    });
    this.facets = toSignal(this._appRepository.facets$, {
      requireSync: true,
    });
    this.typeThesaurus = toSignal(this._appRepository.typeThesaurus$);
    this.previewJKeys = toSignal(this._appRepository.previewJKeys$, {
      requireSync: true,
    });
    this.previewFKeys = toSignal(this._appRepository.previewFKeys$, {
      requireSync: true,
    });
    this.flagDefinitions = toSignal(this._appRepository.flags$, {
      requireSync: true,
    });

    // colors
    this.facetColors = computed(() => {
      const key = this.facet()?.colorKey;
      const bg = key ? '#' + key : 'var(--mat-sys-secondary-container)';
      return {
        bg,
        fg: key
          ? this._colorService.getContrastColor(bg)
          : 'var(--mat-sys-on-secondary-container)',
      };
    });
    this.groupColors = computed(() => {
      const map = ItemEditorComponent._groupColorMap;
      ItemEditorComponent.seedGroupColors(this.facets());
      const colors: Record<string, { bg: string; fg: string }> = {};
      for (const g of this.partGroups()) {
        const bg = map.getColorForKey(g.key);
        colors[g.key] = { bg, fg: this._colorService.getContrastColor(bg) };
      }
      return colors;
    });

    // user signals
    this._currentUser = toSignal(this._authService.currentUser$, {
      initialValue: null,
    });
    this.user = computed(() => this._currentUser() ?? undefined);
    this.userLevel = computed(() => {
      // track user changes so userLevel is recomputed on login/logout
      this._currentUser();
      return this._userLevelService.getCurrentUserLevel();
    });
    this.canDeleteParts = computed(() => {
      const roles = this.user()?.roles || [];
      return roles.some(
        (r) => r === 'admin' || r === 'editor' || r === 'operator',
      );
    });
    this.partActionCount = computed(() => {
      // edit, copy ID, copy into item, preview + optional delete and history
      return (
        4 + (this.canDeleteParts() ? 1 : 0) + (this.historyEnabled() ? 1 : 0)
      );
    });
  }

  /**
   * Seed the group colors map with the sorted IDs of all the groups in the
   * specified facets, so that colors do not depend on the order in which
   * items are opened. This happens only once, when the map is empty.
   *
   * @param facets The facets definitions.
   */
  private static seedGroupColors(facets: FacetDefinition[]): void {
    const map = ItemEditorComponent._groupColorMap;
    if (map.size || !facets?.length) {
      return;
    }
    const keys = new Set<string>();
    for (const f of facets) {
      for (const d of f.partDefinitions || []) {
        if (d.groupKey) {
          keys.add(d.groupKey);
        }
      }
    }
    [...keys].sort().forEach((k) => map.getColorForKey(k));
  }

  /**
   * Set the expanded state of the specified part group.
   *
   * @param key The group key.
   * @param expanded True if expanded.
   */
  public setGroupExpanded(key: string, expanded: boolean): void {
    const collapsed = this.collapsedGroups();
    if (collapsed.has(key) === !expanded) {
      return;
    }
    const set = new Set(collapsed);
    if (expanded) {
      set.delete(key);
    } else {
      set.add(key);
    }
    this.collapsedGroups.set(set);
  }

  /**
   * Collapse all the part groups if any is expanded, else expand them all.
   */
  public toggleAllGroups(): void {
    this.collapsedGroups.set(
      this.anyGroupExpanded()
        ? new Set(this.partGroups().map((g) => g.key))
        : new Set(),
    );
  }

  public ngOnInit(): void {
    this._repository.load(this.id());
  }

  public canDeactivate(): boolean | Observable<boolean> {
    return !this.metadataDirty();
  }

  public getTypeIdName(typeId: string): string {
    const typeThesaurus = this._appRepository.getTypeThesaurus();
    if (!typeThesaurus) {
      return typeId;
    }
    // strip :suffix if any
    const i = typeId.lastIndexOf(':');
    if (i > -1) {
      typeId = typeId.substring(0, i);
    }
    const entry = typeThesaurus.entries?.find((e) => e.id === typeId);
    return entry ? entry.value : typeId;
  }

  public getRoleIdName(roleId: string): string {
    if (!roleId || !roleId.startsWith('fr.')) {
      return roleId;
    }
    return this.getTypeIdName(roleId);
  }

  /**
   * Handle the metadata editor's dirty state change.
   */
  public onMetadataDirtyChange(dirty: boolean): void {
    this.metadataDirty.set(dirty);
  }

  /**
   * Save the item with the specified metadata, as edited by the metadata
   * editor.
   *
   * @param metadata The metadata.
   */
  public onMetadataSave(metadata: ItemMetadata): void {
    if (this.busy()) {
      return;
    }
    const currentItem = this._repository.getItem();
    if (!currentItem) {
      return;
    }
    const item = { ...currentItem, ...metadata };

    this.busy.set(true);
    this._repository
      .save(item as Item)
      .then((saved) => {
        this._messaging.sendMessage(MESSAGE_ITEM_LIST_REPOSITORY_RESET);
        // clear interaction state immediately, so that the pending-changes
        // guard does not prompt the user for an item just saved
        this.metadataEditor()?.markSaved();
        this.metadataDirty.set(false);
        // reload to force change in page URL for new items
        if (!item.id) {
          this.id.set(saved.id);
          this._router.navigate(['/items', saved.id]);
        }
      })
      .finally(() => {
        this.busy.set(false);
      });
  }

  private partExists(typeId: string, roleId?: string): boolean {
    const groups = this._repository.getPartGroups();
    if (!groups) {
      return false;
    }
    return groups.some((g) => {
      return g.parts.some(
        (p) =>
          p.typeId === typeId &&
          ((!p.roleId && !roleId) || p.roleId === roleId),
      );
    });
  }

  public getPartIdName(typeId: string, roleId?: string): string {
    return getPartIdName(
      typeId,
      roleId,
      this._appRepository.getTypeThesaurus(),
    )!;
  }

  public addPart(def?: PartDefinition): void {
    if (!def && (!this.newPartDefinitions().length || !this.newPart().valid())) {
      return;
    }
    if (!this.id()) {
      this._snackbar.open('Please save the item before adding parts', 'OK', {
        duration: 3000,
      });
      return;
    }
    const typeId = def ? def.typeId : this.newPart.newPartType().value()!.typeId;
    const roleId = def ? def.roleId : this.newPart.newPartType().value()!.roleId;

    if (this.partExists(typeId, roleId)) {
      return;
    }

    const route = this._libraryRouteService.buildPartEditorRoute(
      this.id()!,
      'new',
      typeId,
      roleId,
    );

    this._router.navigate(
      [route.route],
      route.rid ? { queryParams: { rid: route.rid } } : {},
    );
  }

  public editPart(part: Part): void {
    const route = this._libraryRouteService.buildPartEditorRoute(
      part.itemId,
      part.id,
      part.typeId,
      part.roleId,
    );

    this._router.navigate(
      [route.route],
      route.rid ? { queryParams: { rid: route.rid } } : {},
    );
  }

  public previewPart(part: Part): void {
    if (part.roleId?.startsWith('fr.')) {
      // layer parts redirect to base-text
      this._itemService
        .getBaseTextPart(part.itemId)
        .pipe(take(1))
        .subscribe((p) => {
          this._router.navigate(['preview', part.itemId, p.part.id, 'text'], {
            queryParams: { lid: part.roleId },
          });
        });
    } else if (part.roleId === 'base-text') {
      this._router.navigate(['preview', part.itemId, part.id, 'text']);
    } else {
      this._router.navigate(['preview', part.itemId, part.id]);
    }
  }

  public deletePart(part: Part): void {
    if (this.busy()) {
      return;
    }
    this._dialogService
      .confirm('Confirm Deletion', `Delete part "${part.typeId}"?`)
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.busy.set(true);
        this._repository.deletePart(part.id).then(
          (_) => {
            this.busy.set(false);
          },
          (error) => {
            this.busy.set(false);
            console.error(error);
            this._snackbar.open('Error deleting part', 'OK');
          },
        );
      });
  }

  public addLayerPart(part: LayerPartInfo): void {
    if (this.busy()) {
      return;
    }
    let name = this.getTypeIdName(part.typeId);
    if (part.roleId) {
      name += ' for ' + this.getRoleIdName(part.roleId);
    }
    this._dialogService
      .confirm('Confirm Addition', `Add layer "${name}"?`)
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.busy.set(true);
        this._repository
          .addNewLayerPart(part.typeId, part.roleId)
          .finally(() => this.busy.set(false));
      });
  }

  public setPartsScope(request: PartScopeSetRequest): void {
    this._repository.setPartThesaurusScope(request.ids, request.scope);
  }

  public onCopyPart(part: Part): void {
    if (this.busy()) {
      return;
    }
    const dialogRef = this.dialog.open(ItemLookupDialogComponent, {
      height: '180px',
      width: '250px',
      data: {},
    });
    dialogRef.afterClosed().subscribe((targetItem: Item) => {
      if (!targetItem || part.itemId === targetItem.id) {
        return;
      }
      if (this.item()?.facetId !== targetItem.facetId) {
        this._snackbar.open(
          'Cannot copy part to an item with a different facet',
          'OK',
        );
        return;
      }
      this.busy.set(true);
      this._itemService
        .partWithTypeAndRoleExists(targetItem.id, part.typeId, part.roleId)
        .subscribe((exists: boolean) => {
          if (exists) {
            this._snackbar.open('Part already exists in target item', 'OK');
            this.busy.set(false);
            return;
          }
          part.id = '';
          part.itemId = targetItem.id;
          this._itemService.addPart(part).subscribe({
            next: (_) => {
              this._snackbar.open('Part copied', 'OK', { duration: 3000 });
            },
            error: (error) => {
              console.error(error);
              this._snackbar.open('Error copying part', 'OK');
            },
            complete: () => {
              this.busy.set(false);
            },
          });
        });
    });
  }

  public onGenerateItems(): void {
    if (this.busy()) {
      return;
    }
    const dialogRef = this.dialog.open(ItemGenerateDialogComponent, {
      height: '400px',
      width: '350px',
      data: {
        flags: this.flagDefinitions(),
      },
    });
    dialogRef
      .afterClosed()
      .subscribe((data: { count: number; title: string; flags: number }) => {
        if (!data) {
          return;
        }
        this.busy.set(true);
        this._itemService
          .generateItems(data.count, this.id()!, data.title, data.flags)
          .subscribe({
            next: (_) => {
              this._messaging.sendMessage(MESSAGE_ITEM_LIST_REPOSITORY_RESET);
              this._snackbar.open('Items generated', 'OK', { duration: 3000 });
            },
            error: (error) => {
              console.error(error);
              this._snackbar.open('Error generating items', 'OK');
            },
            complete: () => {
              this.busy.set(false);
            },
          });
      });
  }

  /**
   * Generate the title (T) or description (D) of the item, as requested by
   * the metadata editor, and set it into the editor.
   *
   * @param key The metadata key.
   */
  public onGenerateMetadata(key: ItemMetadataGenerationKey): void {
    if (this.busy() || !this.id()) {
      return;
    }
    const name = key === 'T' ? 'title' : 'description';
    this.busy.set(true);
    this._itemService.getItemMetadata(this.id()!, key).subscribe({
      next: (metadata) => {
        const result = metadata[key];
        if (result) {
          this.metadataEditor()?.setGenerated(key, result);
        } else {
          this._snackbar.open(`No ${name} generated`, 'OK', {
            duration: 3000,
          });
        }
      },
      error: (error) => {
        console.error(error);
        this._snackbar.open(`Error generating ${name}`, 'OK');
        this.busy.set(false);
      },
      complete: () => {
        this.busy.set(false);
      },
    });
  }

  /**
   * Navigate to the edit history of the specified part. Its route is the
   * part's editor route with a final /history.
   *
   * @param part The part.
   */
  public viewPartHistory(part: Part): void {
    const route = this._libraryRouteService.buildPartEditorRoute(
      part.itemId,
      part.id,
      part.typeId,
      part.roleId,
    );
    this._router.navigate(
      [route.route + '/history'],
      route.rid ? { queryParams: { rid: route.rid } } : {},
    );
  }
}
