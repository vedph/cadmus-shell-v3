import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { NgxToolsValidators } from '@myrmidon/ngx-tools';

import {
  BibliographyPart,
  BibEntry,
  BIBLIOGRAPHY_PART_TYPEID,
  BibAuthor,
} from '../bibliography-part';

/**
 * Bibliography part editor.
 * Thesauri: bibliography-languages, bibliography-types (optional),
 * bibliography-tags (optional), bibliography-author-roles (optional).
 */
@Component({
  selector: 'cadmus-bibliography-part',
  templateUrl: './bibliography-part.component.html',
  styleUrls: ['./bibliography-part.component.css'],
  standalone: false,
})
export class BibliographyPartComponent
  extends ModelEditorComponentBase<BibliographyPart>
  implements OnInit
{
  private _editedEntryIndex: number;

  public editedEntry?: BibEntry;
  public currentTabIndex: number;

  // thesauri
  // bibliography-languages
  public langEntries: ThesaurusEntry[] | undefined;
  // bibliography-author-roles
  public roleEntries: ThesaurusEntry[] | undefined;
  // bibliography-tags
  public tagEntries: ThesaurusEntry[] | undefined;
  // bibliography-types
  public typeEntries: ThesaurusEntry[] | undefined;

  // form
  public entries: FormControl<BibEntry[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    super(authService, formBuilder);
    this._editedEntryIndex = -1;
    this.currentTabIndex = 0;
    // form
    this.entries = formBuilder.control<BibEntry[]>([], {
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
    let key = 'bibliography-languages';
    if (this.hasThesaurus(key)) {
      this.langEntries = thesauri[key].entries;
    } else {
      this.langEntries = undefined;
    }

    key = 'bibliography-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries = thesauri[key].entries;
    } else {
      this.typeEntries = undefined;
    }

    key = 'bibliography-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }

    key = 'bibliography-author-roles';
    if (this.hasThesaurus(key)) {
      this.roleEntries = thesauri[key].entries;
    } else {
      this.roleEntries = undefined;
    }
  }

  private updateForm(part?: BibliographyPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.entries.setValue([...part.entries]);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<BibliographyPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  public entryTypeToString(id?: string): string {
    if (!id || !this.typeEntries?.entries) {
      return '';
    }
    const entry = this.typeEntries.find((e) => e.id === id);
    return entry ? entry.value : id;
  }

  protected getValue(): BibliographyPart {
    let part = this.getEditedPart(BIBLIOGRAPHY_PART_TYPEID) as BibliographyPart;
    part.entries = this.entries.value;
    return part;
  }

  public addEntry(): void {
    const entry: BibEntry = {
      typeId: this.typeEntries ? this.typeEntries[0].id : '',
      title: '',
      language: this.langEntries ? this.langEntries[0].id : '',
    };
    this.editEntry(entry, -1);
  }

  public editEntry(entry: BibEntry, index: number): void {
    this._editedEntryIndex = index;
    this.editedEntry = entry;
    this.currentTabIndex = 1;
  }

  public closeEntry(): void {
    this.currentTabIndex = 0;
    this._editedEntryIndex = -1;
    this.editedEntry = undefined;
  }

  public saveEntry(entry: BibEntry): void {
    if (!this.editedEntry) {
      return;
    }
    if (this._editedEntryIndex === -1) {
      this.entries.setValue([...this.entries.value, entry]);
    } else {
      const entries = [...this.entries.value];
      entries.splice(this._editedEntryIndex, 1, entry);
      this.entries.setValue(entries);
    }
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();

    this.closeEntry();
  }

  public removeEntry(index: number): void {
    this._dialogService
      .confirm('Confirm Deletion', 'Delete entry?')
      .subscribe((result) => {
        if (!result) {
          return;
        }
        const entries = [...this.entries.value];
        entries.splice(index, 1);
        this.entries.setValue(entries);
        this.entries.markAsDirty();
        this.entries.updateValueAndValidity();
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
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
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
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
  }

  public getAuthors(authors: BibAuthor[]): string {
    const sb: string[] = [];
    for (let i = 0; i < authors?.length || 0; i++) {
      if (i) {
        sb.push('; ');
      }
      sb.push(authors[i].lastName);
      if (authors[i].firstName) {
        sb.push(', ');
        sb.push(authors[i].firstName!);
      }
      if (authors[i].roleId) {
        sb.push(` (${authors[i].roleId})`);
      }
    }
    return sb.join('');
  }
}
