import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  OnInit,
  Signal,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
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
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { ItemRefLookupService } from '@myrmidon/cadmus-refs-asserted-ids';
import { Flag, FlagSetComponent } from '@myrmidon/cadmus-ui-flag-set';

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
import { getPartIdName, PartBadgeComponent } from '@myrmidon/cadmus-ui';

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

/**
 * Item editor. This can edit a new or existing item's metadata and parts.
 * The ID of the item being edited is extracted from the route. For a new item
 * this is 'new', which here is stored as an empty string.
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
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    MatButton,
    MatIcon,
    MatDivider,
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
    FlagSetComponent,
  ],
})
export class ItemEditorComponent implements OnInit, ComponentCanDeactivate {
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

  // flag-set signals
  private readonly _flagsValue: Signal<number>;
  /** Flags adapted for FlagSetComponent; admin flags excluded for non-admins. */
  public readonly flagSetFlags: Signal<Flag[]>;
  /** Admin-only flags shown read-only to non-admin users. */
  public readonly adminFlagDefs: Signal<FlagDefinition[]>;
  /** Currently checked flag IDs derived from the flags form control value. */
  public readonly checkedFlagIds: Signal<string[]>;

  // new part form
  public newPartType: FormControl<PartDefinition | null>;
  public newPart: FormGroup;
  // item metadata form
  public title: FormControl<string | null>;
  public sortKey: FormControl<string | null>;
  public description: FormControl<string | null>;
  public facetCtrl: FormControl<string | null>;
  public group: FormControl<string | null>;
  public flags: FormControl<number>;
  public metadata: FormGroup;

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
    _formBuilder: FormBuilder,
  ) {
    this.id.set(this._route.snapshot.params['id']);
    if (this.id() === 'new') {
      this.id.set(undefined);
    }

    // new part form
    this.newPartType = _formBuilder.control(null, Validators.required);
    this.newPart = _formBuilder.group({
      newPartType: this.newPartType,
    });

    // item metadata form
    this.title = _formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.sortKey = _formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.sortKey.disable();
    this.description = _formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(1000),
    ]);
    this.facetCtrl = _formBuilder.control(null, Validators.required);
    this.group = _formBuilder.control(null, Validators.maxLength(100));
    this.flags = _formBuilder.control(0, { nonNullable: true });
    this.metadata = _formBuilder.group({
      title: this.title,
      sortKey: this.sortKey,
      description: this.description,
      facet: this.facetCtrl,
      group: this.group,
      flags: this.flags,
    });

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

    // flags signal (tracks the flags form control value)
    this._flagsValue = toSignal(this.flags.valueChanges, { initialValue: 0 });

    // flags for FlagSetComponent: exclude admin flags for non-admins
    this.flagSetFlags = computed<Flag[]>(() =>
      this.flagDefinitions()
        .filter((def) => this.userLevel() >= 4 || !def.isAdmin)
        .map((def) => ({
          id: String(def.id),
          label: def.label,
          color: '#' + def.colorKey,
        })),
    );

    // admin-only flags shown read-only when user is not admin
    this.adminFlagDefs = computed<FlagDefinition[]>(() => {
      if (this.userLevel() >= 4) return [];
      return this.flagDefinitions().filter((def) => def.isAdmin === true);
    });

    // checked flag IDs derived from the bitmask value
    this.checkedFlagIds = computed<string[]>(() => {
      const value = this._flagsValue();
      return this.flagDefinitions()
        .filter((def) => (value & def.id) !== 0)
        .map((def) => String(def.id));
    });

    // update the metadata form whenever the item changes
    effect(() => {
      this.updateMetadataForm(this.item());
    });
  }

  public ngOnInit(): void {
    this._repository.load(this.id());
  }

  public canDeactivate(): boolean | Observable<boolean> {
    return !this.metadata.dirty;
  }

  private updateMetadataForm(item?: Item): void {
    if (!item) {
      this.metadata.reset();
    } else {
      this.title.setValue(item.title);
      this.sortKey.setValue(item.sortKey);
      this.description.setValue(item.description);
      this.facetCtrl.setValue(item.facetId ?? null);
      this.group.setValue(item.groupId ?? null);
      this.flags.setValue(item.flags);
      this.metadata.markAsPristine();
    }
  }

  /**
   * Called when the FlagSetComponent emits new checked flag IDs.
   * Converts the string IDs back to a bitmask integer and updates
   * the flags form control, preserving admin-flag bits for non-admins.
   */
  public onFlagCheckedIdsChange(ids: string[]): void {
    let value = 0;
    // non-admins cannot change admin flags: preserve their current bits
    if (this.userLevel() < 4) {
      const current = this.flags.value;
      for (const def of this.flagDefinitions()) {
        if (def.isAdmin && (current & def.id) !== 0) {
          value |= def.id;
        }
      }
    }
    for (const id of ids) {
      value |= Number(id);
    }
    this.flags.setValue(value);
    this.flags.markAsDirty();
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

  public save(): void {
    if (this.busy() || !this.metadata.valid) {
      return;
    }
    const currentItem = this._repository.getItem();
    if (!currentItem) {
      return;
    }
    const item = { ...currentItem };
    item.title = this.title.value?.trim() || '';
    item.sortKey = this.sortKey.value?.trim() || '';
    item.description = this.description.value?.trim() || '';
    item.facetId = this.facetCtrl.value?.trim() || '';
    item.groupId = this.group.value?.trim() || '';
    item.flags = this.flags.value;

    this.busy.set(true);
    this._repository
      .save(item as Item)
      .then((saved) => {
        this._messaging.sendMessage(MESSAGE_ITEM_LIST_REPOSITORY_RESET);
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
    if (!def && !this.newPartType.valid) {
      return;
    }
    if (!this.id()) {
      this._snackbar.open('Please save the item before adding parts', 'OK', {
        duration: 3000,
      });
      return;
    }
    const typeId = def ? def.typeId : this.newPartType.value!.typeId;
    const roleId = def ? def.roleId : this.newPartType.value!.roleId;

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
      if (this.facetCtrl.value !== targetItem.facetId) {
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
}
