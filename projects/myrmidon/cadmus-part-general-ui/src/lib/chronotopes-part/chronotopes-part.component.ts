import { Component, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
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

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  AssertedChronotope,
  AssertedChronotopeComponent,
  AssertedChronotopesPipe,
} from '@myrmidon/cadmus-refs-asserted-chronotope';
import { HistoricalDatePipe } from '@myrmidon/cadmus-refs-historical-date';

import {
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import { ChronotopesPart, CHRONOTOPES_PART_TYPEID } from '../chronotopes-part';
import { MatExpansionModule } from '@angular/material/expansion';

/**
 * Chronotopes part editor component.
 * Thesauri: chronotope-place-tags, chronotope-assertion-tags,
 * doc-reference-types, doc-reference-tags (all optional).
 */
@Component({
  selector: 'cadmus-chronotopes-part',
  templateUrl: './chronotopes-part.component.html',
  styleUrls: ['./chronotopes-part.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    MatExpansionModule,
    MatButton,
    MatIconButton,
    MatTooltip,
    AssertedChronotopeComponent,
    MatCardActions,
    TitleCasePipe,
    HistoricalDatePipe,
    AssertedChronotopesPipe,
    CloseSaveButtonsComponent,
  ],
})
export class ChronotopesPartComponent
  extends ModelEditorComponentBase<ChronotopesPart>
  implements OnInit
{
  private _editedChronotopeIndex: number;

  public editedChronotope: AssertedChronotope | undefined;

  // chronotope-place-tags
  public tagEntries: ThesaurusEntry[] | undefined;
  // chronotope-assertion-tags
  public assTagEntries?: ThesaurusEntry[];
  // doc-reference-types
  public refTypeEntries: ThesaurusEntry[] | undefined;
  // doc-reference-tags
  public refTagEntries: ThesaurusEntry[] | undefined;

  public chronotopes: FormControl<AssertedChronotope[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    super(authService, formBuilder);
    this._editedChronotopeIndex = -1;
    // form
    this.chronotopes = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      entries: this.chronotopes,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'chronotope-place-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }

    key = 'chronotope-assertion-tags';
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

  private updateForm(model?: ChronotopesPart | null): void {
    if (!model) {
      this.form!.reset();
      return;
    }
    this.chronotopes.setValue(model.chronotopes || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<ChronotopesPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): ChronotopesPart {
    let part = this.getEditedPart(CHRONOTOPES_PART_TYPEID) as ChronotopesPart;
    part.chronotopes = this.chronotopes.value;
    return part;
  }

  public addChronotope(): void {
    this.editChronotope({}, -1);
  }

  public editChronotope(chronotope: AssertedChronotope, index: number): void {
    this._editedChronotopeIndex = index;
    this.editedChronotope = chronotope;
  }

  public onChronotopeChange(chronotope: AssertedChronotope): void {
    this.editedChronotope = chronotope;
  }

  public saveChronotope(): void {
    const chronotopes = [...this.chronotopes.value];
    if (this._editedChronotopeIndex === -1) {
      chronotopes.push(this.editedChronotope!);
    } else {
      chronotopes.splice(
        this._editedChronotopeIndex,
        1,
        this.editedChronotope!
      );
    }
    this.chronotopes.setValue(chronotopes);
    this.chronotopes.updateValueAndValidity();
    this.chronotopes.markAsDirty();
    this.closeChronotope();
  }

  public closeChronotope(): void {
    this.editedChronotope = undefined;
    this._editedChronotopeIndex = -1;
  }

  public deleteChronotope(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete chronotope?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          const entries = [...this.chronotopes.value];
          entries.splice(index, 1);
          this.chronotopes.setValue(entries);
          this.chronotopes.updateValueAndValidity();
          this.chronotopes.markAsDirty();
        }
      });
  }

  public moveChronotopeUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.chronotopes.value[index];
    const entries = [...this.chronotopes.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.chronotopes.setValue(entries);
    this.chronotopes.updateValueAndValidity();
    this.chronotopes.markAsDirty();
  }

  public moveChronotopeDown(index: number): void {
    if (index + 1 >= this.chronotopes.value.length) {
      return;
    }
    const entry = this.chronotopes.value[index];
    const entries = [...this.chronotopes.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.chronotopes.setValue(entries);
    this.chronotopes.updateValueAndValidity();
    this.chronotopes.markAsDirty();
  }
}
