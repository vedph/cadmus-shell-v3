import {
  Component,
  Injector,
  OnDestroy,
  OnInit,
  output,
  input,
  effect,
  model,
  computed,
  inject,
  signal,
  untracked,
  ChangeDetectionStrategy,
  WritableSignal,
} from '@angular/core';
import {
  FieldTree,
  SchemaFn,
  SchemaPath,
  disabled as disabledRule,
  form,
} from '@angular/forms/signals';
import { Subscription } from 'rxjs';

import { deepCopy } from '@myrmidon/ngx-tools';
import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';

import {
  EditedObject,
  Fragment,
  FragmentIdentity,
  Part,
  PartIdentity,
} from '@myrmidon/cadmus-core';
import { getPartIdName } from './part-badge/part-badge.component';
import { EditorHelpService } from '../services/editor-help.service';

/**
 * Base class for part/fragment editors dumb components.
 * The model type is the templated argument T.
 *
 * The editor's form is a signal form. The derived class:
 * - keeps its editable draft in a signal derived from `data`, usually
 *   `linkedSignal(() => toDraft(this.data()?.value))`;
 * - builds its root form from that draft with `createForm()`, assigning it
 *   to the `form` property;
 * - implements `getValue()`, which builds the model from the draft.
 *
 * The base class provides the dirty state (`isDirty`, `dirtyChange`),
 * disables the whole form when `disabled` is true, clears the form's
 * interaction state whenever new data is bound, and saves via `save()`.
 *
 * When deriving from this editor, be sure to call super.ngOnInit()
 * from the derived editor's ngOnInit handler, if you override it.
 */
@Component({
  template: '',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export abstract class ModelEditorComponentBase<T extends Part | Fragment>
  implements OnInit, OnDestroy
{
  private readonly _mebSubs: Subscription[] = [];
  private readonly _injector = inject(Injector);
  private _lastDirty = false;
  private readonly _helpService = inject(EditorHelpService);
  private readonly _helpUrl = signal<string | undefined>(undefined);
  private _helpRequest = 0;
  protected readonly _appRepository?: AppRepository;
  protected readonly authService = inject(AuthJwtService);

  /**
   * The root form of the editor. Implement it in the derived class with
   * `createForm()`, e.g.
   * `public readonly form = this.createForm(this._draft, (p) => {...})`.
   */
  public abstract readonly form: FieldTree<unknown>;

  /**
   * The current user.
   */
  public user?: User;

  /**
   * The user authorization level (0-4).
   */
  public userLevel: number;

  /**
   * A signal with the current dirty state of the editor, i.e. true when
   * the user changed the form since the data was bound or last saved.
   */
  public readonly isDirty = computed<boolean>(() => this.form().dirty());

  /**
   * The identity of the edited model.
   */
  public readonly identity = input<PartIdentity | FragmentIdentity>();

  /**
   * The data being edited.
   */
  public readonly data = model<EditedObject<T>>();

  /**
   * True to disable the editor.
   */
  public readonly disabled = input<boolean>();

  /**
   * Event emitted when the dirty state has changed.
   * This event just reflects changes in isDirty, and is a facility
   * for propagating it to the parent's component.
   */
  public readonly dirtyChange = output<boolean>();

  /**
   * Emitted when the user requests to close the editor.
   */
  public readonly editorClose = output();

  /**
   * The human-friendly model name. This is computed from the model's
   * type ID and role ID, if any, using the types thesaurus set provided
   * by the app repository.
   */
  public readonly modelName = computed<string | undefined>(() => {
    const identity = this.identity();
    // layers have no identity but have a layerPart
    if (!identity) {
      const layerPart = this.data()?.layerPart;
      if (layerPart) {
        return getPartIdName(
          layerPart.typeId,
          layerPart.roleId,
          this._appRepository?.getTypeThesaurus(),
          true // no fallback so that the part template can use its default name
        );
      }
      return undefined;
    }
    if (!identity) {
      return undefined;
    }
    return getPartIdName(
      identity.typeId,
      identity.roleId,
      this._appRepository?.getTypeThesaurus(),
      true // no fallback so that the part template can use its default name
    );
  });

  /**
   * The URL of the help page for this editor, or undefined if not available.
   * This is resolved asynchronously from identity, using the URL template
   * configured in the environment (see EditorHelpService), and falling back
   * from the most specific URL to the least specific one until an available
   * page is found. Bind it to the url input of the help link component.
   */
  public readonly helpUrl = this._helpUrl.asReadonly();

  /**
   * True if a help page is available for this editor.
   */
  public readonly hasHelp = computed<boolean>(() => !!this._helpUrl());

  /**
   * Create a new instance of the editor.
   */
  constructor() {
    this.userLevel = 0;
    this._appRepository = inject(AppRepository);

    // new data bound (or saved): the form mirrors it, so there are no
    // unsaved edits; then let the derived class react to the data
    effect(() => {
      const data = this.data();
      untracked(() => {
        this.form().reset();
        this.onDataSet(data);
      });
    });
    // propagate dirty state changes
    effect(() => {
      const dirty = this.isDirty();
      untracked(() => {
        if (dirty !== this._lastDirty) {
          this._lastDirty = dirty;
          this.dirtyChange.emit(dirty);
        }
      });
    });
    effect(() => {
      this.onIdentitySet(this.identity());
    });
    effect(() => {
      this.updateHelpUrl(this.identity());
    });
  }

  private updateHelpUrl(identity?: PartIdentity | FragmentIdentity): void {
    // discard results of stale requests when identity changes meanwhile
    const request = ++this._helpRequest;
    this._helpUrl.set(undefined);
    if (!identity) {
      return;
    }
    this._helpService
      .resolveUrl(identity)
      .then((url) => {
        if (request === this._helpRequest) {
          this._helpUrl.set(url);
        }
      })
      .catch(() => {});
  }

  /**
   * Create the root form of this editor from its editable draft. The
   * whole form is disabled when the `disabled` input is true. Call this
   * from a field initializer of the derived class, after its draft.
   *
   * @param model The draft signal the form edits.
   * @param schema The optional schema function with the form's rules.
   * @returns The form.
   */
  protected createForm<C>(
    model: WritableSignal<C>,
    schema?: SchemaFn<C>
  ): FieldTree<C> {
    return form(model, (path) => {
      // the root path: its disabled state is inherited by all the fields
      disabledRule(path as SchemaPath<C>, () => !!this.disabled());
      schema?.(path);
    });
  }

  private onIdentitySet(identity?: PartIdentity | FragmentIdentity) {
    // fragments have no id field (see the Fragment interface); a
    // FragmentIdentity's partId refers to the *containing part*, not the
    // fragment itself, so stamping it here would silently add a spurious
    // id to the fragment value (and to whatever gets saved from it).
    if (identity?.partId && !('loc' in identity)) {
      const part = this.data()?.value as Part;
      if (part && !part.id) {
        part.id = identity.partId;
      }
    }
  }

  /**
   * Initialize automatic settings loading for this editor. Call this from
   * the derived class constructor to opt into settings loading. When
   * identity becomes available, settings are fetched using the specified
   * type ID and the role ID from identity.
   *
   * @param typeId The part/fragment type ID for settings lookup.
   * @param callback Called when settings are loaded (or with undefined
   * if not found or on error).
   */
  protected initSettings<S>(
    typeId: string,
    callback: (settings: S | undefined) => void
  ): void {
    effect(
      () => {
        const identity = this.identity();
        if (!identity || !this._appRepository) return;
        this._appRepository
          .getSettingFor<S>(typeId, identity.roleId || undefined)
          .then((settings) => callback(settings))
          .catch((err) => {
            console.warn(`Failed to load settings for ${typeId}:`, err);
            callback(undefined);
          });
      },
      { injector: this._injector }
    );
  }

  public ngOnInit(): void {
    // auth service
    this.userLevel = this.getCurrentUserLevel();
    this._mebSubs.push(
      this.authService.currentUser$.subscribe((user: User | null) => {
        this.updateUserProperties(user);
      })
    );
  }

  public ngOnDestroy(): void {
    this._mebSubs.forEach((s) => s.unsubscribe());
  }

  /**
   * Get the authorization level of the current user if any.
   * @returns 4-1 for admin, editor, operator, visitor; else 0.
   */
  private getCurrentUserLevel(): number {
    const user = this.authService.currentUserValue;
    if (!user || !user.roles) {
      return 0;
    }
    if (user.roles.indexOf('admin') > -1) {
      return 4;
    }
    if (user.roles.indexOf('editor') > -1) {
      return 3;
    }
    if (user.roles.indexOf('operator') > -1) {
      return 2;
    }
    if (user.roles.indexOf('visitor') > -1) {
      return 1;
    }
    return 0;
  }

  private updateUserProperties(user: User | null): void {
    if (!user) {
      this.user = undefined;
      this.userLevel = 0;
    } else {
      this.user = user;
      this.userLevel = this.getCurrentUserLevel();
    }
  }

  /**
   * Update the data value property and emit the corresponding
   * modelChange event.
   *
   * @param value The value.
   */
  protected updateValue(value: T): void {
    this.data.set({ ...(this.data() || { thesauri: {} }), value: value });
  }

  /**
   * Invoked whenever the data model is set, either from its input binding
   * or by saving. Override to react to new data beyond the form's draft,
   * which should rather be derived from `data` (e.g. with `linkedSignal`).
   * The default implementation does nothing.
   *
   * @param data The data set, or undefined.
   */
  protected onDataSet(data?: EditedObject<T>): void {}

  /**
   * Get a new object from the edited part if any, else as a new part.
   *
   * @param typeId The part's type ID. This is a constant received
   * from the implementor.
   * @returns Part object.
   */
  protected getEditedPart(typeId: string): Part {
    const part = deepCopy(this.data()?.value) as Part | null;
    return (
      part || {
        itemId: this.identity()!.itemId || '',
        id: '',
        typeId: typeId,
        roleId: this.identity()!.roleId || undefined,
        timeCreated: new Date(),
        creatorId: '',
        timeModified: new Date(),
        userId: '',
      }
    );
  }

  /**
   * Get a new object from the edited fragment if any, else a new fragment.
   *
   * @returns Fragment object.
   */
  protected getEditedFragment(): Fragment {
    const fr = deepCopy(this.data()?.value) as Fragment | null;
    return (
      fr || {
        location: (this.identity() as FragmentIdentity).loc,
      }
    );
  }

  /**
   * Implement in derived classes to get the model from the form's draft.
   * This is used when saving.
   */
  protected abstract getValue(): T;

  /**
   * True if this editor has the thesaurus having the specified key in the
   * loaded thesauri set.
   */
  protected hasThesaurus(key: string): boolean {
    return this.data()?.thesauri && this.data()!.thesauri[key] ? true : false;
  }

  /**
   * Emit a request to close the editor.
   */
  public close(): void {
    this.editorClose.emit();
  }

  /**
   * Save the edited data if valid; else mark the form as touched, so that
   * its errors are displayed.
   */
  public save(): void {
    if (this.form().invalid()) {
      console.warn('Save invoked with invalid form');
      this.form().markAsTouched();
      return;
    }
    const value = this.getValue();
    this.updateValue(value);
    // the form is no more dirty
    this.form().reset();
  }
}
