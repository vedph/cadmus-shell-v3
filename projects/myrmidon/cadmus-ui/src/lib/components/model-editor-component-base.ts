import {
  Component,
  OnDestroy,
  OnInit,
  output,
  input,
  effect,
  model,
  computed,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  PristineChangeEvent,
  UntypedFormGroup,
} from '@angular/forms';
import { BehaviorSubject, Subscription } from 'rxjs';

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

/**
 * Base class for part/fragment editors dumb components.
 * The model type is the templated argument T.
 *
 * When deriving from this editor, be sure to call super.ngOnInit()
 * from the derived editor's ngOnInit handler.
 */
@Component({
  template: '',
  standalone: false,
})
export abstract class ModelEditorComponentBase<T extends Part | Fragment>
  implements OnInit, OnDestroy
{
  private readonly _mebSubs: Subscription[] = [];
  protected readonly _appRepository?: AppRepository;

  /**
   * The root form of the editor.
   */
  public form: FormGroup | UntypedFormGroup;

  /**
   * The current user.
   */
  public user?: User;

  /**
   * The user authorization level (0-4).
   */
  public userLevel: number;

  /**
   * An observable with the current dirty state of the editor.
   */
  public isDirty$: BehaviorSubject<boolean>;

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
   * This event just reflects changes in isDirty$, and is a facility
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
   * Create a new instance of the editor.
   *
   * @param authService The authentication service.
   * @param formBuilder Form builder.
   */
  constructor(
    protected authService: AuthJwtService,
    protected formBuilder: FormBuilder
  ) {
    this.form = formBuilder.group({});
    this.userLevel = 0;
    this.isDirty$ = new BehaviorSubject<boolean>(false);
    this._appRepository = inject(AppRepository);

    effect(() => {
      this.disableForm(this.disabled());
    });
    effect(() => {
      this.onDataSet(this.data());
    });
    effect(() => {
      this.onIdentitySet(this.identity());
    });
  }

  private disableForm(disabled?: boolean) {
    if (disabled) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }

  private onIdentitySet(identity?: PartIdentity | FragmentIdentity) {
    if (identity?.partId) {
      const part = this.data()?.value as Part;
      if (part && !part.id) {
        console.log('part identity set', identity.partId);
        part.id = identity.partId;
      }
    }
  }

  public ngOnInit(): void {
    // form
    this.form = this.buildForm(this.formBuilder);

    // dirty check on form
    this._mebSubs.push(
      this.form.events.subscribe((e) => {
        if (e instanceof PristineChangeEvent) {
          console.log('dirty change: ', !e.pristine);
          this.isDirty$.next(!e.pristine);
          this.dirtyChange.emit(this.isDirty$.value);
        }
      })
    );

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
   * Implement in the derived class to build the root form of this editor.
   * The form built will then be attached to the dirty check mechanism
   * provided by this base class.
   *
   * @param formBuilder The form builder.
   */
  protected abstract buildForm(
    formBuilder: FormBuilder
  ): FormGroup | UntypedFormGroup;

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
   * Invoked whenever the model property is set (=data comes from input model
   * property), unless setting it via updateModel. Implement to update the form
   * controls to reflect the new model data.
   *
   * @param data The data set, or undefined.
   */
  protected abstract onDataSet(data?: EditedObject<T>): void;

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
   * Implement in derived classes to get the data from form's controls.
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
   * Save the edited data if valid.
   */
  public save(): void {
    if (this.form.invalid) {
      console.warn('Save invoked with invalid form');
      return;
    }
    const value = this.getValue();
    this.updateValue(value);
    // the form is no more dirty
    this.form.markAsPristine();
  }
}
