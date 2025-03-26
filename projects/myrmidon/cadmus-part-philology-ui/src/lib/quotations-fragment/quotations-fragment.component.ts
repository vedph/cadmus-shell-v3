import { Component, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import { CloseSaveButtonsComponent, EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import {
  TextLayerService,
  ThesauriSet,
  ThesaurusEntry,
  TokenLocation,
} from '@myrmidon/cadmus-core';

import { QuotationEntryComponent } from '../quotation-entry/quotation-entry.component';
import { QuotationsFragment, QuotationEntry } from '../quotations-fragment';
import { QuotationWorksService } from './quotation-works.service';

/**
 * Quotations fragment editor.
 * Thesauri: quotation-works (optional), quotation-tags (optional).
 */
@Component({
  selector: 'cadmus-quotations-fragment',
  templateUrl: './quotations-fragment.component.html',
  styleUrls: ['./quotations-fragment.component.css'],
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
    MatExpansionModule,
    MatIconButton,
    MatTooltip,
    MatButton,
    MatCardActions,
    TitleCasePipe,
    QuotationEntryComponent,
    CloseSaveButtonsComponent
  ],
})
export class QuotationsFragmentComponent
  extends ModelEditorComponentBase<QuotationsFragment>
  implements OnInit
{
  public editedEntryIndex: number;
  public editedEntry?: QuotationEntry;
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
    this.editedEntryIndex = -1;
    // form
    this.entries = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
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
    this.editedEntryIndex = index;
  }

  public saveEntry(entry: QuotationEntry): void {
    if (!this.editedEntry) {
      return;
    }
    const entries = [...this.entries.value];
    if (this.editedEntryIndex === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedEntryIndex, 1, entry);
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
    this.editedEntryIndex = -1;
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
