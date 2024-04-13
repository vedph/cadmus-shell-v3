import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { TextLayerService, ThesauriSet, ThesaurusEntry, TokenLocation } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ng-mat-tools';

import { QuotationWorksService } from './quotation-works.service';
import { QuotationsFragment, QuotationEntry } from '../quotations-fragment';
import { NgToolsValidators } from '@myrmidon/ng-tools';

/**
 * Quotations fragment editor.
 * Thesauri: quotation-works (optional), quotation-tags (optional).
 */
@Component({
  selector: 'cadmus-quotations-fragment',
  templateUrl: './quotations-fragment.component.html',
  styleUrls: ['./quotations-fragment.component.css'],
})
export class QuotationsFragmentComponent
  extends ModelEditorComponentBase<QuotationsFragment>
  implements OnInit
{
  private _editedEntryIndex: number;

  public editedEntry?: QuotationEntry;
  public currentTabIndex: number;
  public frText?: string;

  public workEntries: ThesaurusEntry[] | undefined;
  public tagEntries: ThesaurusEntry[] | undefined;
  public workDictionary?: Record<string, ThesaurusEntry[]>;

  public entries: FormControl<QuotationEntry[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _layerService: TextLayerService,
    private _dialogService: DialogService,
    private _worksService: QuotationWorksService
  ) {
    super(authService, formBuilder);
    this.currentTabIndex = 0;
    this._editedEntryIndex = -1;
    // form
    this.entries = formBuilder.control([], {
      validators: NgToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      entries: this.entries,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'quotation-works';
    if (this.hasThesaurus(key)) {
      this.workEntries = thesauri[key].entries;
      this.workDictionary = this._worksService.buildDictionary(
        this.workEntries || []
      );
    } else {
      this.workEntries = undefined;
      this.workDictionary = undefined;
    }

    key = 'quotation-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }
  }

  private updateForm(fragment?: QuotationsFragment | null): void {
    if (!fragment) {
      this.form!.reset();
      return;
    }
    this.entries.setValue(fragment.entries);
    this.form!.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<QuotationsFragment>): void {
    // fragment's text
    if (data?.baseText && data.value) {
      this.frText = this._layerService.getTextFragment(
        data.baseText,
        TokenLocation.parse(data.value.location)!
      );
    }

    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): QuotationsFragment {
    const fr = this.getEditedFragment() as QuotationsFragment;
    fr.entries = this.entries.value;
    return fr;
  }

  public getNameFromId(id: string): string {
    return this.workEntries?.find((e) => e.id === id)?.value || id;
  }

  public addEntry(): void {
    this.editEntry(
      {
        author: '',
        work: '',
        citation: '',
      },
      -1
    );
  }

  public editEntry(entry: QuotationEntry, index: number): void {
    this.editedEntry = entry;
    this._editedEntryIndex = index;
    this.currentTabIndex = 1;
  }

  public saveEntry(entry: QuotationEntry): void {
    if (!this.editedEntry) {
      return;
    }
    const entries = [...this.entries.value];
    if (this._editedEntryIndex === -1) {
      entries.push(entry);
    } else {
      entries.splice(this._editedEntryIndex, 1, entry);
    }
    this.entries.setValue(entries);
    this.entries.updateValueAndValidity();
    this.entries.markAsDirty();

    this.closeEntry();
  }

  public closeEntry(): void {
    if (!this.editedEntry) {
      return;
    }
    this._editedEntryIndex = -1;
    this.currentTabIndex = 0;
    this.editedEntry = undefined;
  }

  public removeEntry(index: number): void {
    this._dialogService
      .confirm('Confirm Deletion', 'Delete entry?')
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.entries.setValue([...this.entries.value].splice(index, 1));
        this.entries.updateValueAndValidity();
        this.entries.markAsDirty();
      });
  }

  public moveEntryUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.updateValueAndValidity();
    this.entries.markAsDirty();
  }

  public moveEntryDown(index: number): void {
    if (index + 1 >= this.entries.value.length) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.updateValueAndValidity();
    this.entries.markAsDirty();
  }
}
