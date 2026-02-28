import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

import {
  ComponentCanDeactivate,
  Part,
  EditedObject,
  PartIdentity,
} from '@myrmidon/cadmus-core';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';

import { PartEditorService } from './part-editor.service';

/**
 * Base class for part feature editors.
 * A part feature editor is a wrapper component around a model editor component,
 * used to separate the editor's logic from its host infrastructure.
 */
@Component({
  template: '',
  standalone: false,
})
export abstract class EditPartFeatureBase
  implements OnInit, OnDestroy, ComponentCanDeactivate
{
  private _loadingSub?: Subscription;
  private _savingSub?: Subscription;

  /**
   * The part being edited.
   */
  public readonly data = signal<EditedObject<Part> | undefined>(undefined);

  /**
   * The identity of the part being edited. This gets built from the current
   * route.
   */
  public readonly identity = signal<PartIdentity>({
    itemId: '',
    typeId: '',
    partId: null,
    roleId: null,
  });

  /**
   * True when the wrapped editor component data is dirty.
   */
  public readonly dirty = signal<boolean>(false);

  /**
   * True when loading data.
   */
  public readonly loading = signal<boolean | undefined>(undefined);

  /**
   * True when saving data.
   */
  public readonly saving = signal<boolean | undefined>(undefined);

  /**
   * Set to true when you want the role ID (defined by identity) to affect
   * the ID of the thesauri to load. You should set this in your editor
   * constructor, or in your getReqThesauriIds override. When true, the role ID
   * will be suffixed (preceded by an underscore) to the thesaurus ID,
   * before its language identifier, i.e. for instance "categories@en"
   * with role "sample" becomes "categories_sample@en". When this option is
   * enabled, and some of your thesauri do not need to be suffixed, just
   * provide an alias for the suffixed thesaurus in the backend.
   */
  protected roleIdInThesauri?: boolean;

  constructor(
    protected router: Router,
    route: ActivatedRoute,
    protected snackbar: MatSnackBar,
    protected itemService: ItemService,
    protected thesaurusService: ThesaurusService,
    protected editorService: PartEditorService
  ) {
    // part route:
    // /items/<iid>/@partGroup/@partTypeId/<pid>?rid
    // item ID
    const itemId = route.snapshot.params['iid'];
    // type ID (from "@partTypeId/:pid")
    const typeId = route.snapshot.routeConfig!.path!.substring(
      0,
      route.snapshot.routeConfig!.path!.indexOf('/')
    );
    // part ID or null (if "new")
    let partId = route.snapshot.params['pid'];
    if (partId === 'new') {
      partId = null;
    }
    // role ID or null (if "default")
    let roleId = route.snapshot.queryParams['rid'];
    if (roleId === 'default') {
      roleId = null;
    }
    this.identity.set({
      itemId: itemId,
      typeId: typeId,
      partId: partId,
      roleId: roleId,
    });

    // subscriptions
    this._loadingSub = this.editorService.loading$.subscribe((loading) =>
      this.loading.set(loading)
    );
    this._savingSub = this.editorService.saving$.subscribe((saving) =>
      this.saving.set(saving)
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

  private suffixThesaurusId(id: string, suffix: string): string {
    const i = id.lastIndexOf('@');
    return i > -1
      ? `${id.substring(0, i)}_${suffix}${id.substring(i)}`
      : id + '_' + suffix;
  }

  private suffixThesauriIds(ids: string[]): string[] {
    if (!this.roleIdInThesauri || !ids.length || !this.identity().roleId) {
      return ids;
    }
    return ids.map((id) => this.suffixThesaurusId(id, this.identity().roleId!));
  }

  public ngOnInit(): void {
    // load data
    this.loading.set(true);
    const thesIds = this.getReqThesauriIds();
    const sfxThesIds = this.suffixThesauriIds(thesIds);

    this.editorService
      .load(this.identity(), sfxThesIds)
      .then((data) => {
        if (data) {
          // if we loaded suffixed thesauri, add an unsuffixed alias to each
          if (this.roleIdInThesauri && this.identity().roleId) {
            for (let i = 0; i < sfxThesIds.length; i++) {
              data.thesauri[thesIds[i]] = data.thesauri[sfxThesIds[i]];
            }
          }
          this.data.set(data);
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
    return !this.dirty();
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
    this.dirty.set(value);
  }

  /**
   * Save the part.
   *
   * @param part The part to be saved.
   */
  public save(part: Part): void {
    console.log('Saving part ID: ' + part.id);

    this.editorService.save(part).then(
      (saved: Part) => {
        // update the route-defined part ID if it was null (new part)
        console.log('Saved part ID: ' + saved.id);
        if (!this.identity().partId) {
          this.identity.set({ ...this.identity(), partId: saved.id });
          console.log('Updated identity: ', this.identity());
        }
        console.log('Part saved: ' + saved.id);
        this.snackbar.open('Part saved', 'OK', {
          duration: 3000,
        });
      },
      (reason) => {
        // restore dirty: save failed, the editor data was not persisted
        this.dirty.set(true);
        this.snackbar.open(reason.message, 'OK');
      }
    );
  }

  /**
   * Close the editor by navigating back to the part's item.
   */
  public close(): void {
    this.router.navigate(['items', this.identity().itemId]);
  }
}
