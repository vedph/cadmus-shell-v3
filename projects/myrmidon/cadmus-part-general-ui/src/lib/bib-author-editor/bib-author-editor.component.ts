import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  output,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { BibAuthor } from '../bibliography-part';
import { isImplicitSubmission } from '@myrmidon/cadmus-ui';

interface BibAuthorControls {
  lastName: string;
  firstName: string;
  role: string;
}

function toDraft(author?: BibAuthor | null): BibAuthorControls {
  return {
    lastName: author?.lastName || '',
    firstName: author?.firstName || '',
    role: author?.roleId || '',
  };
}

/**
 * Dumb editor component for a bibliography record's author.
 * Thesauri: bibliography-author-roles.
 */
@Component({
  selector: 'cadmus-bib-author-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './bib-author-editor.component.html',
  styleUrl: './bib-author-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BibAuthorEditorComponent {
  /**
   * The author model to edit. The corresponding authorChange event
   * is fired when the user saves the editing.
   */
  public readonly author = model<BibAuthor | undefined>();

  /**
   * The cancel event fired when the user cancels editing.
   */
  public readonly cancelEdit = output();

  // bibliography-author-roles
  public readonly roleEntries = input<ThesaurusEntry[] | undefined>();

  // form
  private readonly _draft = linkedSignal(() => toDraft(this.author()));
  public readonly form = form(this._draft, (p) => {
    required(p.lastName);
    maxLength(p.lastName, 100);
    maxLength(p.firstName, 100);
    maxLength(p.role, 50);
  });

  constructor() {
    // a new author was bound: no unsaved edits (keyed on the bound model:
    // the draft also changes with each user edit)
    effect(() => {
      this.author();
      untracked(() => this.form().reset());
    });
  }

  private getAuthor(): BibAuthor {
    const draft = this._draft();
    return {
      lastName: draft.lastName.trim(),
      firstName: draft.firstName.trim() || undefined,
      roleId: draft.role.trim() || undefined,
    };
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Saves the current form data by updating the `author` model signal.
   * @param pristine If true (default), the form's interaction state is
   * reset after saving.
   */
  /**
   * Handle Enter in this editor: in a text input, save as the save button
   * would, when enabled. This replaces the implicit submission of the form
   * this editor used to render.
   * @param event The keydown event.
   */
  public onEnterKey(event: Event): void {
    if (
      !isImplicitSubmission(event) ||
      this.form().invalid() ||
      !this.form().dirty()
    ) {
      return;
    }
    event.preventDefault();
    this.save();
  }

  public save(pristine = true): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    const author = this.getAuthor();
    this.author.set(author);

    if (pristine) {
      this.form().reset();
    }
  }
}
