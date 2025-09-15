import { Component, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatIcon } from '@angular/material/icon';
import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  AssertedId,
  AssertedIdsComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';

import {
  ThesaurusEntry,
  ThesauriSet,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import {
  ExternalIdsPart,
  EXTERNAL_IDS_PART_TYPEID,
} from '../external-ids-part';

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
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    AssertedIdsComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class ExternalIdsPartComponent
  extends ModelEditorComponentBase<ExternalIdsPart>
  implements OnInit
{
  public ids: FormControl<AssertedId[]>;

  // external-id-scopes
  public readonly idScopeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // external-id-tags
  public readonly idTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  // thesauri for assertions:
  // assertion-tags
  public readonly assTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // doc-reference-types
  public readonly refTypeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // doc-reference-tags
  public readonly refTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.ids = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
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
      this.assTagEntries.set(thesauri[key].entries);
    } else {
      this.assTagEntries.set(undefined);
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.refTypeEntries.set(thesauri[key].entries);
    } else {
      this.refTypeEntries.set(undefined);
    }

    key = 'doc-reference-tags';
    if (this.hasThesaurus(key)) {
      this.refTagEntries.set(thesauri[key].entries);
    } else {
      this.refTagEntries.set(undefined);
    }

    key = 'external-id-scopes';
    if (this.hasThesaurus(key)) {
      this.idScopeEntries.set(thesauri[key].entries);
    } else {
      this.idScopeEntries.set(undefined);
    }

    key = 'external-id-tags';
    if (this.hasThesaurus(key)) {
      this.idTagEntries.set(thesauri[key].entries);
    } else {
      this.idTagEntries.set(undefined);
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
