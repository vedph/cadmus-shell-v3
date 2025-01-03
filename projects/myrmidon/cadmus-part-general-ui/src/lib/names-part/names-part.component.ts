import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { take } from 'rxjs/operators';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatExpansionModule,
  MatExpansionPanel,
  MatExpansionPanelHeader,
} from '@angular/material/expansion';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  AssertedProperName,
  ProperNameComponent,
  CadmusProperNamePipe,
} from '@myrmidon/cadmus-refs-proper-name';

import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  EditedObject,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import { NamesPart, NAMES_PART_TYPEID } from '../names-part';

/**
 * Names part editor component.
 * Thesauri: name-languages, name-tags, name-piece-types, assertion-tags,
 * doc-reference-types, doc-reference-tags (all optional).
 */
@Component({
  selector: 'cadmus-names-part',
  templateUrl: './names-part.component.html',
  styleUrls: ['./names-part.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    MatButton,
    MatIconButton,
    MatTooltip,
    MatExpansionModule,
    ProperNameComponent,
    MatCardActions,
    CadmusProperNamePipe,
    CloseSaveButtonsComponent,
  ],
})
export class NamesPartComponent
  extends ModelEditorComponentBase<NamesPart>
  implements OnInit
{
  private _updatingForm?: boolean;

  public editedIndex: number;
  public editedName: AssertedProperName | undefined;

  /**
   * The optional thesaurus proper name languages entries (name-languages).
   */
  public langEntries: ThesaurusEntry[] | undefined;
  /**
   * The optional thesaurus name's tag entries (name-tags).
   */
  public tagEntries: ThesaurusEntry[] | undefined;
  /**
   * The optional thesaurus name piece's type entries (name-piece-types).
   */
  public typeEntries: ThesaurusEntry[] | undefined;
  // thesauri for assertions:
  // assertion-tags
  public assTagEntries?: ThesaurusEntry[];
  // doc-reference-types
  public refTypeEntries: ThesaurusEntry[] | undefined;
  // doc-reference-tags
  public refTagEntries: ThesaurusEntry[] | undefined;

  public names: FormControl<AssertedProperName[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    super(authService, formBuilder);
    this.editedIndex = -1;
    // form
    this.names = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      names: this.names,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'name-languages';
    if (this.hasThesaurus(key)) {
      this.langEntries = thesauri[key].entries;
    } else {
      this.langEntries = undefined;
    }
    key = 'name-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }
    key = 'name-piece-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries = thesauri[key].entries;
    } else {
      this.typeEntries = undefined;
    }
    key = 'assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assTagEntries = thesauri[key].entries;
    } else {
      this.assTagEntries = undefined;
    }
    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries = thesauri[key].entries;
    } else {
      this.refTypeEntries = undefined;
    }
    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries = thesauri[key].entries;
    } else {
      this.refTagEntries = undefined;
    }
  }

  private updateForm(part?: NamesPart | null): void {
    this._updatingForm = true;
    if (!part) {
      this.form.reset();
    } else {
      this.names.setValue(part.names || []);
      this.form.markAsPristine();
    }
    this._updatingForm = false;
  }

  protected override onDataSet(data?: EditedObject<NamesPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): NamesPart {
    let part = this.getEditedPart(NAMES_PART_TYPEID) as NamesPart;
    part.names = this.names.value || [];
    return part;
  }

  public addName(): void {
    const name: AssertedProperName = {
      language: this.langEntries?.length ? this.langEntries[0].id : '',
      pieces: [],
    };
    this.names.setValue([...(this.names.value || []), name]);
    this.names.updateValueAndValidity();
    this.names.markAsDirty();
    this.editName(this.names.value.length - 1);
  }

  public editName(index: number): void {
    if (index < 0) {
      this.editedIndex = -1;
      this.editedName = undefined;
    } else {
      this.editedIndex = index;
      this.editedName = this.names.value[index];
    }
  }

  public onNameChange(name: AssertedProperName | undefined): void {
    if (this._updatingForm) {
      return;
    }
    if (name) {
      // else update replacing the old with the new name
      this.names.setValue(
        this.names.value.map((n: AssertedProperName, i: number) =>
          i === this.editedIndex ? name : n
        )
      );
      this.names.updateValueAndValidity();
      this.names.markAsDirty();
    }
  }

  public onNameClose(): void {
    this.editName(-1);
  }

  public deleteName(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete name?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          const names = [...this.names.value];
          names.splice(index, 1);
          this.names.setValue(names);
          this.names.updateValueAndValidity();
          this.names.markAsDirty();
        }
      });
  }

  public moveNameUp(index: number): void {
    if (index < 1) {
      return;
    }
    const name = this.names.value[index];
    const names = [...this.names.value];
    names.splice(index, 1);
    names.splice(index - 1, 0, name);
    this.names.setValue(names);
    this.names.updateValueAndValidity();
    this.names.markAsDirty();
  }

  public moveNameDown(index: number): void {
    if (index + 1 >= this.names.value.length) {
      return;
    }
    const name = this.names.value[index];
    const names = [...this.names.value];
    names.splice(index, 1);
    names.splice(index + 1, 0, name);
    this.names.setValue(names);
    this.names.updateValueAndValidity();
    this.names.markAsDirty();
  }
}
