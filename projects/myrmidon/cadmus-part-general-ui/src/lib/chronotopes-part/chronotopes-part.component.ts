import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';
import { take } from 'rxjs/operators';

import { NgToolsValidators } from '@myrmidon/ng-tools';
import { DialogService } from '@myrmidon/ng-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AssertedChronotope } from '@myrmidon/cadmus-refs-asserted-chronotope';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';

import { ChronotopesPart, CHRONOTOPES_PART_TYPEID } from '../chronotopes-part';

/**
 * Chronotopes part editor component.
 * Thesauri: chronotope-place-tags, chronotope-assertion-tags,
 * doc-reference-types, doc-reference-tags (all optional).
 */
@Component({
  selector: 'cadmus-chronotopes-part',
  templateUrl: './chronotopes-part.component.html',
  styleUrls: ['./chronotopes-part.component.css'],
  standalone: false,
})
export class ChronotopesPartComponent
  extends ModelEditorComponentBase<ChronotopesPart>
  implements OnInit
{
  private _editedChronotopeIndex: number;

  public tabIndex: number;
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
    this.tabIndex = 0;
    // form
    this.chronotopes = formBuilder.control([], {
      validators: NgToolsValidators.strictMinLengthValidator(1),
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
    setTimeout(() => {
      this.tabIndex = 1;
    }, 200);
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
    this.tabIndex = 0;
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
