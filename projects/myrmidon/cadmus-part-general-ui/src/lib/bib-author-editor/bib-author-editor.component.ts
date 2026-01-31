import { Component, effect, input, model, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

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

/**
 * Dumb editor component for a bibliography record's author.
 * Thesauri: bibliography-author-roles.
 */
@Component({
  selector: 'cadmus-bib-author-editor',
  imports: [
    ReactiveFormsModule,
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
  public lastName: FormControl<string>;
  public firstName: FormControl<string | null>;
  public role: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    // form
    this.lastName = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.firstName = formBuilder.control<string | null>(null, {
      validators: [Validators.maxLength(100)],
    });
    this.role = formBuilder.control<string | null>(null, {
      validators: [Validators.maxLength(50)],
    });
    this.form = formBuilder.group({
      lastName: this.lastName,
      firstName: this.firstName,
      role: this.role,
    });

    // when model changes, update form
    effect(() => {
      const data = this.author();
      this.updateForm(data);
    });
  }

  private updateForm(author: BibAuthor | undefined | null): void {
    if (!author) {
      this.form.reset();
    } else {
      this.lastName.setValue(author.lastName || '');
      this.firstName.setValue(author.firstName || null);
      this.role.setValue(author.roleId || null);
      this.form.markAsPristine();
    }
  }

  private getAuthor(): BibAuthor {
    return {
      lastName: this.lastName.value.trim(),
      firstName: this.firstName.value?.trim() || undefined,
      roleId: this.role.value?.trim() || undefined,
    };
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Saves the current form data by updating the `data` model signal.
   * This method can be called manually (e.g., by a Save button) or
   * automatically (via auto-save).
   * @param pristine If true (default), the form is marked as pristine
   * after saving.
   * Set to false for auto-save if you want the form to remain dirty.
   */
  public save(pristine = true): void {
    if (this.form.invalid) {
      // show validation errors
      this.form.markAllAsTouched();
      return;
    }

    const author = this.getAuthor();
    this.author.set(author);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
