import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

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
import { DialogService } from '@myrmidon/ng-mat-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { ItemService, UserLevelService } from '@myrmidon/cadmus-api';
import { ItemListRepository } from '@myrmidon/cadmus-item-list';
import { ItemRefLookupService } from '@myrmidon/cadmus-refs-asserted-ids';

import { PartScopeSetRequest } from '../parts-scope-editor/parts-scope-editor.component';
import { EditedItemRepository } from '../state/edited-item.repository';
import { ItemLookupDialogComponent } from '../item-lookup-dialog/item-lookup-dialog.component';

/**
 * Item editor. This can edit a new or existing item's metadata and parts.
 * The ID of the item being edited is extracted from the route. For a new item
 * this is 'new', which here is stored as an empty string.
 */
@Component({
  selector: 'cadmus-item-editor',
  templateUrl: './item-editor.component.html',
  styleUrls: ['./item-editor.component.css'],
})
export class ItemEditorComponent implements OnInit, ComponentCanDeactivate {
  private _flagsFrozen?: boolean;

  public flagDefinitions: FlagDefinition[];

  public id?: string;
  public item$: Observable<Item | undefined>;
  public parts$: Observable<Part[] | undefined>;
  public partGroups$: Observable<PartGroup[] | undefined>;
  public layerPartInfos$: Observable<LayerPartInfo[] | undefined>;
  public user?: User;
  public userLevel: number;
  public busy?: boolean;
  // public status$: Observable<StatusState>;
  // lookup data
  public facet$: Observable<FacetDefinition | undefined>;
  public newPartDefinitions$: Observable<PartDefinition[]>;
  public facets$: Observable<FacetDefinition[] | undefined>;
  public typeThesaurus$: Observable<Thesaurus | undefined>;
  public previewJKeys$: Observable<string[]>;
  public previewFKeys$: Observable<string[]>;

  // new part form
  public newPartType: FormControl<PartDefinition | null>;
  public newPart: FormGroup;
  // item metadata form
  public title: FormControl<string | null>;
  public sortKey: FormControl<string | null>;
  public description: FormControl<string | null>;
  public facet: FormControl<string | null>;
  public group: FormControl<string | null>;
  public flags: FormControl<number>;
  public flagChecks: FormArray;
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
    private _itemListRepository: ItemListRepository,
    private _libraryRouteService: LibraryRouteService,
    private _dialogService: DialogService,
    private _authService: AuthJwtService,
    private _userLevelService: UserLevelService,
    private _formBuilder: FormBuilder
  ) {
    this.id = this._route.snapshot.params['id'];
    this.flagDefinitions = [];
    if (this.id === 'new') {
      this.id = undefined;
    }
    // new part form
    this.newPartType = _formBuilder.control(null, Validators.required);
    this.newPart = _formBuilder.group({
      newPartType: this.newPartType,
    });
    // item's metadata form
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
    this.facet = _formBuilder.control(null, Validators.required);
    this.group = _formBuilder.control(null, Validators.maxLength(100));
    this.flags = _formBuilder.control(0, { nonNullable: true });
    this.flagChecks = _formBuilder.array([]);

    this.metadata = _formBuilder.group({
      title: this.title,
      sortKey: this.sortKey,
      description: this.description,
      facet: this.facet,
      group: this.group,
      flagChecks: this.flagChecks,
    });
    this.userLevel = 0;

    this.item$ = this._repository.item$;
    this.parts$ = this._repository.parts$;
    this.partGroups$ = this._repository.partGroups$;
    this.layerPartInfos$ = this._repository.layers$;
    this.facet$ = this._repository.facet$;
    this.newPartDefinitions$ = this._repository.newPartDefinitions$;
    // app
    this.facets$ = this._appRepository.facets$;
    this.typeThesaurus$ = this._appRepository.typeThesaurus$;
    this.previewJKeys$ = this._appRepository.previewJKeys$;
    this.previewFKeys$ = this._appRepository.previewFKeys$;
  }

  ngOnInit(): void {
    this._authService.currentUser$.subscribe((user: User | null) => {
      this.user = user || undefined;
      this.userLevel = this._userLevelService.getCurrentUserLevel();
    });

    // rebuild the flags controls array when flags definitions change
    this._appRepository.flags$.subscribe((defs) => {
      this.flagDefinitions = defs;
      this.buildFlagsControls();
    });

    // when flags controls values change, update the flags value
    this.flagChecks.valueChanges.subscribe((_) => {
      if (!this._flagsFrozen) {
        this.flags.setValue(this.getFlagsValue());
      }
    });

    // update the metadata form when item changes (e.g. saved)
    this.item$.subscribe((item) => {
      this.updateMetadataForm(item);
    });

    // load the item (if any) and its lookup
    this._repository.load(this.id);
  }

  public canDeactivate(): boolean | Observable<boolean> {
    return !this.metadata.dirty;
  }

  /**
   * Builds the array of flags controls according to the current flags
   * definitions and the current flags value.
   */
  private buildFlagsControls(): void {
    this._flagsFrozen = true;
    this.flagChecks.clear();

    for (const def of this.flagDefinitions) {
      const flagValue = def.id;
      // tslint:disable-next-line: no-bitwise
      const checked = (this.flags.value & flagValue) !== 0;
      this.flagChecks.push(this._formBuilder.control(checked));
    }

    this._flagsFrozen = false;
  }

  /**
   * Update the flags controls from the current flags value.
   */
  private updateFlagControls(): void {
    if (!this.flagDefinitions) {
      return;
    }
    this._flagsFrozen = true;
    const value = this.flags.value;
    for (let i = 0; i < this.flagDefinitions.length; i++) {
      const flagValue = this.flagDefinitions[i].id;
      // tslint:disable-next-line: no-bitwise
      const checked = (value & flagValue) !== 0;
      this.flagChecks.at(i).setValue(checked);
    }
    this._flagsFrozen = false;
  }

  /**
   * Get the flags value from the flags controls.
   */
  private getFlagsValue(): number {
    let flagsValue = 0;

    for (let i = 0; i < this.flagDefinitions.length; i++) {
      const flagValue = this.flagDefinitions[i].id;
      if (this.flagChecks.at(i)?.value) {
        // tslint:disable-next-line: no-bitwise
        flagsValue |= flagValue;
      }
    }
    return flagsValue;
  }

  private updateMetadataForm(item?: Item): void {
    if (!item) {
      this.metadata.reset();
      this.updateFlagControls();
    } else {
      this.title.setValue(item.title);
      this.sortKey.setValue(item.sortKey);
      this.description.setValue(item.description);
      this.facet.setValue(item.facetId);
      this.group.setValue(item.groupId);
      this.flags.setValue(item.flags);
      this.updateFlagControls();

      this.metadata.markAsPristine();
    }
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
    if (this.busy || !this.metadata.valid) {
      return;
    }
    // build item (its ID will be empty if new)
    const item = { ...this._repository.getItem() };
    if (!item) {
      return;
    }
    item.title = this.title.value?.trim();
    item.sortKey = this.sortKey.value?.trim();
    item.description = this.description.value?.trim();
    item.facetId = this.facet.value?.trim() || undefined;
    item.groupId = this.group.value?.trim() || undefined;
    item.flags = this.flags.value;

    // save: this will trigger a change in the store's item, reflected here
    // by updating the metadata form
    this.busy = true;
    this._repository
      .save(item as Item)
      .then((saved) => {
        this._itemListRepository.reset();

        // reload to force change in page URL
        if (!item.id) {
          this.id = saved.id;
          this._router.navigate(['/items', saved.id]);
        }
      })
      .finally(() => {
        this.busy = false;
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
          p.typeId === typeId && ((!p.roleId && !roleId) || p.roleId === roleId)
      );
    });
  }

  public addPart(def?: PartDefinition): void {
    if (!def && !this.newPartType.valid) {
      return;
    }
    if (!this.id) {
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
      this.id,
      'new',
      typeId,
      roleId
    );

    // navigate to the editor
    this._router.navigate(
      [route.route],
      route.rid
        ? {
            queryParams: {
              rid: route.rid,
            },
          }
        : {}
    );
  }

  public editPart(part: Part): void {
    // build the target route to the appropriate part editor
    const route = this._libraryRouteService.buildPartEditorRoute(
      part.itemId,
      part.id,
      part.typeId,
      part.roleId
    );

    // navigate to the editor
    this._router.navigate(
      [route.route],
      route.rid
        ? {
            queryParams: {
              rid: route.rid,
            },
          }
        : {}
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
    if (this.busy) {
      return;
    }
    this._dialogService
      .confirm('Confirm Deletion', `Delete part "${part.typeId}"?`)
      .subscribe((result) => {
        if (!result) {
          return;
        }
        // delete
        this.busy = true;
        this._repository.deletePart(part.id).then(
          (_) => {
            this.busy = false;
          },
          (error) => {
            this.busy = false;
            console.error(error);
            this._snackbar.open('Error deleting part', 'OK');
          }
        );
      });
  }

  public addLayerPart(part: LayerPartInfo): void {
    if (this.busy) {
      return;
    }
    let name = this.getTypeIdName(part.typeId);
    if (part.roleId) {
      name += ' for ' + this.getRoleIdName(part.roleId);
    }
    this.busy = true;
    this._dialogService
      .confirm('Confirm Addition', `Add layer "${name}"?`)
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this._repository
          .addNewLayerPart(part.typeId, part.roleId)
          .finally(() => (this.busy = false));
      });
  }

  public setPartsScope(request: PartScopeSetRequest): void {
    this._repository.setPartThesaurusScope(request.ids, request.scope);
  }

  public onCopyPart(part: Part): void {
    const dialogRef = this.dialog.open(ItemLookupDialogComponent, {
      height: '180px',
      width: '250px',
      data: {},
    });
    dialogRef.afterClosed().subscribe((targetItem: Item) => {
      // nope if no target item or same item
      if (!targetItem || part.itemId === targetItem.id) {
        return;
      }
      // nope if target item has a different facet
      if (this.facet.value !== targetItem.facetId) {
        this._snackbar.open(
          'Cannot copy part to an item with a different facet',
          'OK'
        );
        return;
      }
      // check if the part already exists in the target item
      this.busy = true;
      this._itemService
        .partWithTypeAndRoleExists(targetItem.id, part.typeId, part.roleId)
        .subscribe((exists: boolean) => {
          // part already exists, nope
          if (exists) {
            this._snackbar.open('Part already exists in target item', 'OK');
            this.busy = false;
            return;
          }
          // else add part as a new part to the target item
          part.id = '';
          part.itemId = targetItem.id;
          this._itemService.addPart(part).subscribe({
            next: (_) => {
              this._snackbar.open('Part copied', 'OK', {
                duration: 3000,
              });
            },
            error: (error) => {
              console.error(error);
              this._snackbar.open('Error copying part', 'OK');
            },
            complete: () => {
              this.busy = false;
            },
          });
        });
    });
  }
}
