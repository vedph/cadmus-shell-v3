import { Component, OnInit, Input } from '@angular/core';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';

import { BibAuthor } from '../bibliography-part';

@Component({
  selector: 'cadmus-bib-authors-editor',
  templateUrl: './bib-authors-editor.component.html',
  styleUrls: ['./bib-authors-editor.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButton,
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
  ],
})
export class BibAuthorsEditorComponent implements OnInit {
  @Input()
  public parentForm?: FormGroup;
  @Input()
  public controlName: string;
  // bibliography-author-roles
  @Input()
  public roleEntries: ThesaurusEntry[] | undefined;

  public authors?: FormArray;

  constructor(private _formBuilder: FormBuilder) {
    // defaults
    this.controlName = 'authors';
  }

  ngOnInit(): void {
    this.authors = this.parentForm?.controls[this.controlName] as FormArray;
  }

  private getAuthorGroup(author?: BibAuthor): FormGroup {
    return this._formBuilder.group({
      lastName: this._formBuilder.control(author?.lastName, [
        Validators.required,
        Validators.maxLength(50),
      ]),
      firstName: this._formBuilder.control(
        author?.firstName,
        Validators.maxLength(50)
      ),
      roleId: this._formBuilder.control(
        author?.roleId,
        Validators.maxLength(50)
      ),
    });
  }

  public addAuthor(item?: BibAuthor): void {
    this.authors!.push(this.getAuthorGroup(item));
  }

  public addAuthorBelow(index: number): void {
    this.authors!.insert(index + 1, this.getAuthorGroup());
  }

  public removeAuthor(index: number): void {
    this.authors!.removeAt(index);
  }

  public moveAuthorUp(index: number): void {
    if (index < 1) {
      return;
    }
    const item = this.authors!.controls[index];
    this.authors!.removeAt(index);
    this.authors!.insert(index - 1, item);
  }

  public moveAuthorDown(index: number): void {
    if (index + 1 >= this.authors!.length) {
      return;
    }
    const item = this.authors!.controls[index];
    this.authors!.removeAt(index);
    this.authors!.insert(index + 1, item);
  }

  public clearAuthors(): void {
    for (let i = this.authors!.length - 1; i > -1; i--) {
      this.authors!.removeAt(i);
    }
  }
}
