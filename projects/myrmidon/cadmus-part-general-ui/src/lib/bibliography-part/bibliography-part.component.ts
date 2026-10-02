import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  linkedSignal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';

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
import { FlatLookupPipe, NgxToolsSignalValidators } from '@myrmidon/ngx-tools';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
  copyFormValue,
} from '@myrmidon/cadmus-ui';
import { MatExpansionModule } from '@angular/material/expansion';

import {
  BibliographyPart,
  BibEntry,
  BIBLIOGRAPHY_PART_TYPEID,
  BibAuthor,
} from '../bibliography-part';
import { BibliographyEntryComponent } from '../bibliography-entry/bibliography-entry.component';

interface BibliographyPartControls {
  entries: BibEntry[];
}

function toDraft(part?: BibliographyPart | null): BibliographyPartControls {
  return { entries: copyFormValue(part?.entries || []) };
}

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
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
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
export class BibliographyPartComponent extends ModelEditorComponentBase<BibliographyPart> {
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<BibEntry | undefined>(undefined);

  // thesauri
  // bibliography-languages
  public readonly langEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['bibliography-languages']?.entries,
  );
  // bibliography-author-roles
  public readonly roleEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['bibliography-author-roles']?.entries,
  );
  // bibliography-tags
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['bibliography-tags']?.entries,
  );
  // bibliography-types
  public readonly typeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['bibliography-types']?.entries,
  );

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.entries, 1);
  });

  constructor(private _dialogService: DialogService) {
    super();
  }

  protected getValue(): BibliographyPart {
    let part = this.getEditedPart(BIBLIOGRAPHY_PART_TYPEID) as BibliographyPart;
    part.entries = copyFormValue(this._draft().entries);
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
    // signal must be invoked, not just referenced, to read its value
    if (!this.edited()) {
      return;
    }
    if (this.editedIndex() === -1) {
      this.form.entries().value.set([...this.form.entries().value(), entry]);
    } else {
      const entries = [...this.form.entries().value()];
      entries.splice(this.editedIndex(), 1, entry);
      this.form.entries().value.set(entries);
    }
    this.form.entries().markAsDirty();

    this.closeEntry();
  }

  public removeEntry(index: number): void {
    this._dialogService
      .confirm('Confirm Deletion', 'Delete entry?')
      .subscribe((result) => {
        if (!result) {
          return;
        }
        const entries = [...this.form.entries().value()];
        entries.splice(index, 1);
        this.form.entries().value.set(entries);
        this.form.entries().markAsDirty();
      });
  }

  public moveEntryUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.form.entries().value()[index];
    const entries = [...this.form.entries().value()];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();
  }

  public moveEntryDown(index: number): void {
    if (index + 1 >= this.form.entries().value().length) {
      return;
    }
    const entry = this.form.entries().value()[index];
    const entries = [...this.form.entries().value()];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();
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
