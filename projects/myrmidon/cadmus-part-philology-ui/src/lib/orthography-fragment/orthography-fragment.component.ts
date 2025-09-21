import { Component, computed, OnInit, signal } from '@angular/core';
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
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatOption, MatSelect } from '@angular/material/select';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  renderLabelFromLastColon,
  ThesaurusTreeComponent,
} from '@myrmidon/cadmus-ui';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  TextLayerService,
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
  TokenLocation,
} from '@myrmidon/cadmus-core';

import { OrthographyFragment } from '../orthography-fragment';
import { EditOperation, OperationType } from '../services/edit-operation';
import { EditOperationComponent } from '../edit-operation/edit-operation.component';

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
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    MatButton,
    MatTooltip,
    MatIconButton,
    MatCardActions,
    TitleCasePipe,
    ThesaurusTreeComponent,
    CloseSaveButtonsComponent,
    EditOperationComponent,
  ],
})
export class OrthographyFragmentComponent
  extends ModelEditorComponentBase<OrthographyFragment>
  implements OnInit
{
  public standard: FormControl<string>;
  public language: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public note: FormControl<string | null>;
  public operations: FormControl<EditOperation[]>;

  // orthography-languages
  public readonly langEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // orthography-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // orthography-op-tags
  public readonly opTagEntries = signal<ThesaurusEntry[] | undefined>(
    undefined
  );

  public readonly editedOperation = signal<EditOperation | undefined>(
    undefined
  );
  public readonly editedOperationIndex = signal<number>(-1);

  public readonly frText = signal<string | undefined>(undefined);

  public readonly operationText = computed<string>(() => {
    return this.frText() || '';
  });

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _layerService: TextLayerService,
    private _dialogService: DialogService,
    private _clipboard: Clipboard,
    private _snackbar: MatSnackBar
  ) {
    super(authService, formBuilder);
    // form
    this.standard = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.language = formBuilder.control(null, {
      validators: Validators.maxLength(50),
    });
    this.tag = formBuilder.control(null, {
      validators: Validators.maxLength(50),
    });
    this.note = formBuilder.control(null, {
      validators: Validators.maxLength(200),
    });
    this.operations = formBuilder.control([], {
      validators: [Validators.required],
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      standard: this.standard,
      language: this.language,
      tag: this.tag,
      note: this.note,
      operations: this.operations,
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

  private updateForm(fragment?: OrthographyFragment | null): void {
    if (!fragment) {
      this.form.reset();
    } else {
      this.standard.setValue(fragment.standard);
      this.language.setValue(fragment.language || null);
      this.tag.setValue(fragment.tag || null);
      this.note.setValue(fragment.note || null);
      try {
        this.operations.setValue(
          fragment.operations?.map((text) =>
            EditOperation.parseOperation(text)
          ) || []
        );
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
          TokenLocation.parse(data.value.location)!
        )
      );
    }

    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }
    // form
    this.updateForm(data?.value);
  }

  protected override getValue(): OrthographyFragment {
    const fragment = this.getEditedFragment() as OrthographyFragment;
    fragment.standard = this.standard.value;
    fragment.language = this.language.value?.trim() || undefined;
    fragment.tag = this.tag.value?.trim() || undefined;
    fragment.note = this.note.value?.trim() || undefined;
    fragment.operations = this.operations.value.map((op) => op.toString());
    return fragment;
  }

  //#region operations
  public addOperation(): void {
    const operation: EditOperation = EditOperation.createOperation(
      OperationType.Replace
    );
    this.editedOperationIndex.set(-1);
    this.editedOperation.set(operation);
  }

  public editOperation(operation: EditOperation, index: number): void {
    this.editedOperationIndex.set(index);
    this.editedOperation.set(structuredClone(operation));
  }

  public closeOperation(): void {
    this.editedOperationIndex.set(-1);
    this.editedOperation.set(undefined);
  }

  public saveOperation(operation: EditOperation): void {
    const operations = [...this.operations.value];
    if (this.editedOperationIndex() === -1) {
      operations.push(operation);
    } else {
      operations.splice(this.editedOperationIndex(), 1, operation);
    }
    this.operations.setValue(operations);
    this.operations.markAsDirty();
    this.operations.updateValueAndValidity();
    this.closeOperation();
  }

  public deleteOperation(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete Operation?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedOperationIndex() === index) {
            this.closeOperation();
          }
          const operations = [...this.operations.value];
          operations.splice(index, 1);
          this.operations.setValue(operations);
          this.operations.markAsDirty();
          this.operations.updateValueAndValidity();
        }
      });
  }

  public moveOperationUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.operations.value[index];
    const entries = [...this.operations.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.operations.setValue(entries);
    this.operations.markAsDirty();
    this.operations.updateValueAndValidity();
  }

  public moveOperationDown(index: number): void {
    if (index + 1 >= this.operations.value.length) {
      return;
    }
    const entry = this.operations.value[index];
    const entries = [...this.operations.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.operations.setValue(entries);
    this.operations.markAsDirty();
    this.operations.updateValueAndValidity();
  }
  //#endregion

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
