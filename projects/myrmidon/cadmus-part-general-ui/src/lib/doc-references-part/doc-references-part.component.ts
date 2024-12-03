import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import { NgxToolsValidators } from '@myrmidon/ngx-tools';

import {
  DocReferencesPart,
  DOC_REFERENCES_PART_TYPEID,
} from '../doc-references-part';

/**
 * Document references part editor.
 * Thesauri: doc-reference-tags, doc-reference-types (all optional).
 */
@Component({
  selector: 'cadmus-doc-references-part',
  templateUrl: './doc-references-part.component.html',
  styleUrls: ['./doc-references-part.component.css'],
  standalone: false,
})
export class DocReferencesPartComponent
  extends ModelEditorComponentBase<DocReferencesPart>
  implements OnInit
{
  public references: FormControl<DocReference[]>;

  public typeEntries: ThesaurusEntry[] | undefined;
  public tagEntries: ThesaurusEntry[] | undefined;

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.references = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      references: this.references,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries = thesauri[key].entries;
    } else {
      this.typeEntries = undefined;
    }
  }

  private updateForm(part?: DocReferencesPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.references.setValue(part.references || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<DocReferencesPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): DocReferencesPart {
    let part = this.getEditedPart(
      DOC_REFERENCES_PART_TYPEID
    ) as DocReferencesPart;
    part.references = this.references.value;
    return part;
  }

  public onReferencesChange(references: DocReference[]): void {
    this.references.setValue(references);
    this.references.updateValueAndValidity();
    this.references.markAsDirty();
  }
}
