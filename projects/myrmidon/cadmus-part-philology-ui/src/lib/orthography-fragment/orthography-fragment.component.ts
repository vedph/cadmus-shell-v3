import {
  Component,
  computed,
  OnInit,
  signal,
  DestroyRef,
  inject,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleCasePipe } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormBuilder,
  Validators,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardSubtitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';
import {
  renderLabelFromLastColon,
  ThesaurusEntriesPickerComponent,
} from '@myrmidon/cadmus-thesaurus-store';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  TextLayerService,
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
  TokenLocation,
} from '@myrmidon/cadmus-core';

import { OrthographyFragment } from '../orthography-fragment';
import { EditOperation } from '../services/edit-operation';
import { EditOperationComponent } from '../edit-operation/edit-operation.component';
import { EditOperationSetComponent } from '../edit-operation-set/edit-operation-set.component';

/**
 * Orthography fragment.
 * Thesauri: orthography-languages, orthography-tags, orthography-op-tags.
 */
@Component({
  selector: 'cadmus-orthography-fragment',
  templateUrl: './orthography-fragment.component.html',
  styleUrls: ['./orthography-fragment.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatCheckbox,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    MatCardActions,
    TitleCasePipe,
    ThesaurusEntriesPickerComponent,
    CloseSaveButtonsComponent,
    EditOperationSetComponent,
    EditOperationComponent,
  ],
})
export class OrthographyFragmentComponent
  extends ModelEditorComponentBase<OrthographyFragment>
  implements OnInit
{
  private _destroyRef = inject(DestroyRef);
  private readonly _reference = signal<string>('');
  private readonly _textTarget = signal<boolean>(false);
  private readonly _operations = signal<EditOperation[]>([]);

  /**
   * The fragment text.
   */
  public readonly frText = signal<string | undefined>(undefined);

  /**
   * The source text: either the reference (if textTarget is true) or
   * the fragment text.
   */
  public readonly sourceText = computed<string | undefined>(() => {
    const text = this.frText();
    const reference = this._reference();
    return this._textTarget() ? reference : text;
  });

  /**
   * The target text: either the fragment text (if textTarget is true) or
   * the reference.
   */
  public readonly targetText = computed<string | undefined>(() => {
    const text = this.frText();
    const reference = this._reference();
    return this._textTarget() ? text : reference;
  });

  // orthography-languages
  public readonly langEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // orthography-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // orthography-op-tags
  public readonly opTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined,
  );

  public reference: FormControl<string>;
  public language: FormControl<string | null>;
  public tags: FormControl<ThesaurusEntry[]>;
  public note: FormControl<string | null>;
  public operations: FormControl<EditOperation[]>;
  public textTarget: FormControl<boolean>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _layerService: TextLayerService,
    private _clipboard: Clipboard,
    private _snackbar: MatSnackBar,
  ) {
    super(authService, formBuilder);
    // form
    this.reference = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.language = formBuilder.control(null, {
      validators: Validators.maxLength(50),
    });
    this.tags = formBuilder.control([], { nonNullable: true });
    this.note = formBuilder.control(null, {
      validators: Validators.maxLength(200),
    });
    this.operations = formBuilder.control([], {
      nonNullable: true,
    });
    this.textTarget = formBuilder.control(false, { nonNullable: true });

    // subscribe to form control changes to update signals
    this.reference.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((value) => {
        this._reference.set(value);
      });
    this.textTarget.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((value) => {
        this._textTarget.set(value);
      });
    this.operations.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((value) => {
        this._operations.set(value);
      });

    // disable reference if operations exist
    effect(() => {
      const disabled = this._operations()?.length > 0;
      if (disabled) {
        this.reference.disable();
      } else {
        this.reference.enable();
      }
      return disabled;
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      standard: this.reference,
      language: this.language,
      tag: this.tags,
      note: this.note,
      operations: this.operations,
      textTarget: this.textTarget,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'orthography-languages';
    if (this.hasThesaurus(key)) {
      this.langEntries.set(thesauri[key].entries);
    } else {
      this.langEntries.set(undefined);
    }
    key = 'orthography-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }
    key = 'orthography-op-tags';
    if (this.hasThesaurus(key)) {
      this.opTagEntries.set(thesauri[key].entries);
    } else {
      this.opTagEntries.set(undefined);
    }
  }

  private mapIdsToEntries(
    ids: string[],
    entries: ThesaurusEntry[] | undefined,
  ): ThesaurusEntry[] {
    if (!entries) return ids.map((id) => ({ id, value: id }));
    return ids.map(
      (id) => entries.find((e) => e.id === id) || { id, value: id },
    );
  }

  private updateForm(fragment?: OrthographyFragment | null): void {
    if (!fragment) {
      this.form.reset();
      this._reference.set('');
      this._textTarget.set(false);
    } else {
      this.reference.setValue(fragment.reference);
      this._reference.set(fragment.reference);
      this.language.setValue(fragment.language || null);
      this.tags.setValue(
        this.mapIdsToEntries(fragment.tags || [], this.tagEntries()) || [],
      );
      this.note.setValue(fragment.note || null);
      const textTargetValue = fragment.isTextTarget || false;
      this.textTarget.setValue(textTargetValue);
      this._textTarget.set(textTargetValue);
      try {
        this.operations.setValue(
          fragment.operations?.map((text) =>
            EditOperation.parseOperation(text),
          ) || [],
        );
        if (this.operations.value?.length) {
          this.reference.disable();
        } else {
          this.reference.enable();
        }
      } catch (error) {
        console.error('Error parsing operations', error, fragment.operations);
        this.operations.setValue([]);
      }
      this.form.markAsPristine();
    }
  }

  protected override onDataSet(data?: EditedObject<OrthographyFragment>): void {
    // fragment's text
    if (data?.baseText && data.value) {
      this.frText.set(
        this._layerService.getTextFragment(
          data.baseText,
          TokenLocation.parse(data.value.location)!,
        ),
      );
    }

    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }
    // form
    this.updateForm(data?.value);
  }

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    this.tags.setValue(entries);
    this.tags.markAsDirty();
    this.tags.updateValueAndValidity();
  }

  protected override getValue(): OrthographyFragment {
    const fragment = this.getEditedFragment() as OrthographyFragment;
    fragment.reference = this.reference.value;
    fragment.language = this.language.value?.trim() || undefined;
    fragment.tags = this.tags.value.length
      ? this.tags.value.map((entry) => entry.id)
      : undefined;
    fragment.note = this.note.value?.trim() || undefined;
    fragment.operations = this.operations.value.map((op) => op.toString());
    return fragment;
  }

  public onOperationsChange(operations: EditOperation[]): void {
    this.operations.setValue(operations);
    this.operations.markAsDirty();
    this.operations.updateValueAndValidity();
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }

  public onTagChange(tag: ThesaurusEntry): void {
    this._clipboard.copy(tag.id);
    this._snackbar.open('Tag copied: ' + tag.id, 'OK', {
      duration: 2000,
    });
  }
}
