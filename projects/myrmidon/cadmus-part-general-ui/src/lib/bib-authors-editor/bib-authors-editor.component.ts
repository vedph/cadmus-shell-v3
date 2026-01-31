import { Component, input, model, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { FlatLookupPipe } from '@myrmidon/ngx-tools';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { BibAuthorEditorComponent } from '../bib-author-editor/bib-author-editor.component';
import { BibAuthor } from '../bibliography-part';

/**
 * Dumb editor component for a set of bibliography authors.
 * Thesauri: bibliography-author-roles.
 */
@Component({
  selector: 'cadmus-bib-authors-editor',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatButton,
    MatTooltip,
    MatIcon,
    MatIconButton,
    FlatLookupPipe,
    BibAuthorEditorComponent,
  ],
  templateUrl: './bib-authors-editor.component.html',
  styleUrl: './bib-authors-editor.component.css',
})
export class BibAuthorsEditorComponent {
  /**
   * The authors being edited. The corresponding authorsChange event
   * is fired when the user changes the authors.
   */
  public readonly authors = model<BibAuthor[]>([]);

  // bibliography-author-roles
  public readonly roleEntries = input<ThesaurusEntry[]>();

  public readonly editedAuthor = signal<BibAuthor | undefined>(undefined);
  public readonly editedAuthorIndex = signal<number>(-1);

  constructor(private _dialogService: DialogService) {}

  public addAuthor(): void {
    const author: BibAuthor = {
      lastName: '',
    };
    this.editAuthor(author, -1);
  }

  public editAuthor(author: BibAuthor, index: number): void {
    this.editedAuthorIndex.set(index);
    this.editedAuthor.set(structuredClone(author));
  }

  public closeAuthor(): void {
    this.editedAuthorIndex.set(-1);
    this.editedAuthor.set(undefined);
  }

  public saveAuthor(author: BibAuthor): void {
    const authors = [...this.authors()];
    if (this.editedAuthorIndex()) {
      authors.push(author);
    } else {
      authors.splice(this.editedAuthorIndex(), 1, author);
    }
    this.authors.set(authors);
    this.closeAuthor();
  }

  public deleteAuthor(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete author?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedAuthorIndex() === index) {
            this.closeAuthor();
          }
          const authors = [...this.authors()];
          authors.splice(index, 1);
          this.authors.set(authors);
        }
      });
  }

  public moveAuthorUp(index: number): void {
    if (index < 1) {
      return;
    }
    const author = this.authors()[index];
    const authors = [...this.authors()];
    authors.splice(index, 1);
    authors.splice(index - 1, 0, author);
    this.authors.set(authors);
  }

  public moveAuthorDown(index: number): void {
    if (index + 1 >= this.authors().length) {
      return;
    }
    const author = this.authors()[index];
    const authors = [...this.authors()];
    authors.splice(index, 1);
    authors.splice(index + 1, 0, author);
    this.authors.set(authors);
  }
}
