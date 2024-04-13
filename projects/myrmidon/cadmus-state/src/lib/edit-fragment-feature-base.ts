import { Subscription } from 'rxjs';
import {
  TokenLocation,
  ComponentCanDeactivate,
  LibraryRouteService,
  Fragment,
  Part,
  TextLayerPart,
} from '@myrmidon/cadmus-core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EditedObject, FragmentIdentity } from '@myrmidon/cadmus-ui';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { FragmentEditorService } from './fragment-editor.service';

/**
 * Base class for fragment feature editors.
 * This is similar to the EditPartFeatureBase class.
 */
@Component({
  template: '',
})
export abstract class EditFragmentFeatureBase
  implements OnInit, OnDestroy, ComponentCanDeactivate
{
  private _loadingSub?: Subscription;
  private _savingSub?: Subscription;

  /**
   * The fragment being edited.
   */
  public data?: EditedObject<Fragment>;

  /**
   * The identity of the fragment being edited. This gets built from the current
   * route.
   */
  public identity: FragmentIdentity;

  /**
   * True when the wrapped editor component data is dirty.
   */
  public dirty?: boolean;

  /**
   * True when loading data.
   */
  public loading?: boolean;

  /**
   * True when saving data.
   */
  public saving?: boolean;

  /**
   * The location of the fragment being edited.
   */
  public frLoc: TokenLocation | undefined;

  constructor(
    private _router: Router,
    route: ActivatedRoute,
    protected snackbar: MatSnackBar,
    protected editorService: FragmentEditorService,
    private _libraryRouteService: LibraryRouteService
  ) {
    // fragment route:
    // /items/<iid>/@partGroup/fragment/<pid>/@frTypeId/<loc>?frrid
    const itemId = route.snapshot.params['iid'];
    const partId = route.snapshot.params['pid'];
    const frTypeId = route.snapshot.url[2]?.path;
    const loc = route.snapshot.params['loc'];
    const frRoleId = route.snapshot.queryParams['frrid'];

    this.identity = {
      itemId: itemId,
      typeId: '',
      partId: partId,
      roleId: frTypeId,
      frTypeId: frTypeId,
      frRoleId: frRoleId,
      loc: loc,
    };

    // subscriptions
    this._loadingSub = this.editorService.loading$.subscribe(
      (loading) => (this.loading = loading)
    );
    this._savingSub = this.editorService.saving$.subscribe(
      (saving) => (this.saving = saving)
    );
  }

  /**
   * Override in derived classes to return the IDs of the thesauri requested
   * for this editor.
   *
   * @return Array with thesauri IDs, eventually empty.
   */
  protected getReqThesauriIds(): string[] {
    return [];
  }

  /**
   * Called once data has been loaded.
   */
  protected onDataLoaded(): void {}

  public ngOnInit(): void {
    this.loading = true;
    this.frLoc = TokenLocation.parse(this.identity.loc) ?? undefined;
    const thesIds = this.getReqThesauriIds();
    this.editorService
      .load(this.identity, thesIds)
      .then((data) => {
        if (data) {
          this.data = data;
          this.onDataLoaded();
        }
      })
      .catch((reason) => {
        this.snackbar.open(reason.message, 'OK');
      });
  }

  public ngOnDestroy(): void {
    this._loadingSub?.unsubscribe();
    this._savingSub?.unsubscribe();
  }

  public canDeactivate(): boolean {
    return !this.dirty;
  }

  /**
   * Called when the wrapped editor dirty state changes.
   * In the HTML template, you MUST bind this handler to the dirtyChange event
   * emitted by your wrapped editor (i.e. (dirtyChange)="onDirtyChange($event)").
   *
   * @param value The value of the dirty state.
   */
  public onDirtyChange(value: boolean): void {
    console.log('part dirty change (from editor): ' + value);
    this.dirty = value;
  }

  /**
   * Save the fragment.
   *
   * @param fragment The fragment to be saved.
   */
  public save(fragment: Fragment): void {
    // update a copy of the edited part with new fragment
    const part = { ...this.data!.layerPart } as TextLayerPart;
    const frIndex = part.fragments.findIndex(
      (f: { location: string }) => f.location === this.identity.loc
    );
    if (frIndex > -1) {
      part.fragments.splice(frIndex, 1, fragment);
    } else {
      part.fragments.push(fragment);
    }

    // save the new layer part with the replaced fragment
    this.editorService.save(part).then(
      (p: Part) => {
        console.log(p.id);
        this.snackbar.open('Fragment saved', 'OK', {
          duration: 3000,
        });
      },
      (error) => {
        console.error(error);
        this.snackbar.open('Error saving fragment', 'OK');
      }
    );
  }

  public close(): void {
    // /items/<id>/<part-group>/<part-typeid>/<part-id>?rid=<role-id>
    const part = this.data!.layerPart!;

    const editorKey = this._libraryRouteService.getEditorKeyFromPartType(
      part.typeId,
      part.roleId
    );

    const url = `/items/${this.identity.itemId}/${editorKey.partKey}/${part.typeId}/${this.identity.partId}`;
    this._router.navigate([url], {
      queryParams: {
        rid: this.identity.frTypeId,
      },
    });
  }
}
