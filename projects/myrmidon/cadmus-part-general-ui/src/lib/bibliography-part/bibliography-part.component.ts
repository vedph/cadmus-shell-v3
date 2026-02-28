import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
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
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import {
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';
import { MatExpansionModule } from '@angular/material/expansion';

import {
  BibliographyPart,
  BibEntry,
  BIBLIOGRAPHY_PART_TYPEID,
  BibAuthor,
} from '../bibliography-part';
import { BibliographyEntryComponent } from '../bibliography-entry/bibliography-entry.component';

/**
 * Bibliography part editor.
 * Thesauri: bibliography-languages, bibliography-types (optional),
 * bibliography-tags (optional), bibliography-author-roles (optional).
 */
@Component({
  selector: 'cadmus-bibliography-part',
  templateUrl: './bibliography-part.component.html',
  styleUrls: ['./bibliography-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    MatCardActions,
    TitleCasePipe,
    BibliographyEntryComponent,
    CloseSaveButtonsComponent,
    FlatLookupPipe,
  ],
})
export class BibliographyPartComponent
  extends ModelEditorComponentBase<BibliographyPart>
  implements OnInit
{
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<BibEntry | undefined>(undefined);

  // thesauri
  // bibliography-languages
  public readonly langEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // bibliography-author-roles
  public readonly roleEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // bibliography-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // bibliography-types
  public readonly typeEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  // form
  public entries: FormControl<BibEntry[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
  ) {
    super(authService, formBuilder);
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
      this.langEntries.set(thesauri[key].entries);
    } else {
      this.langEntries.set(undefined);
    }

    key = 'bibliography-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries.set(thesauri[key].entries);
    } else {
      this.typeEntries.set(undefined);
    }

    key = 'bibliography-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }

    key = 'bibliography-author-roles';
    if (this.hasThesaurus(key)) {
      this.roleEntries.set(thesauri[key].entries);
    } else {
      this.roleEntries.set(undefined);
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

  protected getValue(): BibliographyPart {
    let part = this.getEditedPart(BIBLIOGRAPHY_PART_TYPEID) as BibliographyPart;
    part.entries = this.entries.value;
    return part;
  }

  public addEntry(): void {
    const entry: BibEntry = {
      typeId: this.typeEntries()?.length ? this.typeEntries()![0].id : '',
      title: '',
      language: this.langEntries()?.length ? this.langEntries()![0].id : '',
    };
    this.editEntry(entry, -1);
  }

  public editEntry(entry: BibEntry, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(entry));
  }

  public closeEntry(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveEntry(entry: BibEntry): void {
    if (!this.edited) {
      return;
    }
    if (this.editedIndex() === -1) {
      this.entries.setValue([...this.entries.value, entry]);
    } else {
      const entries = [...this.entries.value];
      entries.splice(this.editedIndex(), 1, entry);
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
