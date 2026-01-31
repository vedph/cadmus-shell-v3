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

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';

import {
  ThesauriSet,
  ThesaurusEntry,
  EditedObject,
} from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import {
  DocReferencesPart,
  DOC_REFERENCES_PART_TYPEID,
} from '../doc-references-part';
import { LookupDocReferencesComponent } from '@myrmidon/cadmus-refs-lookup';

interface DocReferencesPartSettings {
  noLookup?: boolean;
  noCitation?: boolean;
  defaultPicker?: 'citation' | 'lookup';
}

/**
 * Document references part editor.
 * Thesauri: doc-reference-tags, doc-reference-types (all optional).
 * Settings: see DocReferencesPartSettings.
 */
@Component({
  selector: 'cadmus-doc-references-part',
  templateUrl: './doc-references-part.component.html',
  styleUrls: ['./doc-references-part.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    LookupDocReferencesComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class DocReferencesPartComponent
  extends ModelEditorComponentBase<DocReferencesPart>
  implements OnInit
{
  // form
  public references: FormControl<DocReference[]>;

  // thesauri
  // doc-reference-types
  public readonly typeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // doc-reference-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  public readonly settings = signal<DocReferencesPartSettings | undefined>(
    undefined
  );

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.references = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
    this.loadSettings();
  }

  private async loadSettings() {
    const settings = (await this._appRepository?.getSettingFor(
      DOC_REFERENCES_PART_TYPEID,
      this.identity()?.roleId || undefined
    )) as DocReferencesPartSettings | undefined;

    if (settings) {
      console.log('DocReferencesPart settings', settings);
      this.settings.set(settings);
    }
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
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }

    key = 'doc-reference-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries.set(thesauri[key].entries);
    } else {
      this.typeEntries.set(undefined);
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
