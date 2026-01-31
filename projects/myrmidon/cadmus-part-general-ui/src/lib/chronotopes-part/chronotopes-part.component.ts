import { Component, OnInit, signal } from '@angular/core';
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
  // state
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<AssertedChronotope | undefined>(undefined);

  // thesauri:
  // chronotope-place-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // chronotope-assertion-tags
  public readonly assTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // doc-reference-types
  public readonly refTypeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // doc-reference-tags
  public readonly refTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  // form
  public chronotopes: FormControl<AssertedChronotope[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    super(authService, formBuilder);
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
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }

    key = 'chronotope-assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assTagEntries.set(thesauri[key].entries);
    } else {
      this.assTagEntries.set(undefined);
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries.set(thesauri[key].entries);
    } else {
      this.refTypeEntries.set(undefined);
    }

    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries.set(thesauri[key].entries);
    } else {
      this.refTagEntries.set(undefined);
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
    this.editedIndex.set(index);
    this.edited.set(structuredClone(chronotope));
  }

  public onChronotopeChange(chronotope: AssertedChronotope): void {
    this.edited.set(chronotope);
  }

  public saveChronotope(): void {
    const chronotopes = [...this.chronotopes.value];
    if (this.editedIndex() === -1) {
      chronotopes.push(this.edited()!);
    } else {
      chronotopes.splice(
        this.editedIndex(),
        1,
        this.edited()!
      );
    }
    this.chronotopes.setValue(chronotopes);
    this.chronotopes.updateValueAndValidity();
    this.chronotopes.markAsDirty();
    this.closeChronotope();
  }

  public closeChronotope(): void {
    this.edited.set(undefined);
    this.editedIndex.set(-1);
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
