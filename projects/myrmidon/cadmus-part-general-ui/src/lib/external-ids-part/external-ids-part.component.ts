import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import { ThesaurusEntry, ThesauriSet } from '@myrmidon/cadmus-core';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import {
  ExternalIdsPart,
  EXTERNAL_IDS_PART_TYPEID,
} from '../external-ids-part';
import { AssertedId } from '@myrmidon/cadmus-refs-asserted-ids';
import { NgToolsValidators } from '@myrmidon/ng-tools';

/**
 * External IDs part editor component. This is just a collection of asserted
 * IDs.
 * Thesauri: external-id-types, external-id-tags, assertion-tags,
 * doc-reference-types, doc-reference-tags (all optional).
 */
@Component({
  selector: 'cadmus-refs-external-ids-part',
  templateUrl: './external-ids-part.component.html',
  styleUrls: ['./external-ids-part.component.css'],
  standalone: false,
})
export class ExternalIdsPartComponent
  extends ModelEditorComponentBase<ExternalIdsPart>
  implements OnInit
{
  public ids: FormControl<AssertedId[]>;

  // external-id-scopes
  public idScopeEntries: ThesaurusEntry[] | undefined;
  // external-id-tags
  public idTagEntries: ThesaurusEntry[] | undefined;

  // thesauri for assertions:
  // assertion-tags
  public assTagEntries: ThesaurusEntry[] | undefined;
  // doc-reference-types
  public refTypeEntries: ThesaurusEntry[] | undefined;
  // doc-reference-tags
  public refTagEntries: ThesaurusEntry[] | undefined;

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.ids = formBuilder.control([], {
      validators: NgToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      ids: this.ids,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'assertion-tags';
    if (this.hasThesaurus(key)) {
      this.assTagEntries = thesauri[key].entries;
    } else {
      this.assTagEntries = undefined;
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries = thesauri[key].entries;
    } else {
      this.refTypeEntries = undefined;
    }

    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries = thesauri[key].entries;
    } else {
      this.refTagEntries = undefined;
    }

    key = 'external-id-scopes';
    if (this.hasThesaurus(key)) {
      this.idScopeEntries = thesauri[key].entries;
    } else {
      this.idScopeEntries = undefined;
    }

    key = 'external-id-tags';
    if (this.hasThesaurus(key)) {
      this.idTagEntries = thesauri[key].entries;
    } else {
      this.idTagEntries = undefined;
    }
  }

  private updateForm(part?: ExternalIdsPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.ids.setValue(part.ids || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<ExternalIdsPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): ExternalIdsPart {
    let part = this.getEditedPart(EXTERNAL_IDS_PART_TYPEID) as ExternalIdsPart;
    part.ids = this.ids.value;
    return part;
  }

  public onIdsChange(ids: AssertedId[]): void {
    this.ids.setValue(ids);
    this.ids.markAsDirty();
    this.ids.updateValueAndValidity();
  }
}
