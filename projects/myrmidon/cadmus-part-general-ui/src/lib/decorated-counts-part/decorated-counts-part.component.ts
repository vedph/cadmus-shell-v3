import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
} from '@angular/forms';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { EditedObject, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';

import {
  DECORATED_COUNTS_PART_TYPEID,
  DecoratedCountsPart,
} from '../decorated-counts-part';
import { DecoratedCount } from '@myrmidon/cadmus-refs-decorated-counts';
import { NgxToolsValidators } from '@myrmidon/ngx-tools';

/**
 * Decorated counts part editor component.
 * Thesauri: decorated-count-ids, decorated-count-tags (all optional).
 */
@Component({
  selector: 'cadmus-decorated-counts-part',
  templateUrl: './decorated-counts-part.component.html',
  styleUrl: './decorated-counts-part.component.scss',
  standalone: false,
})
export class DecoratedCountsPartComponent
  extends ModelEditorComponentBase<DecoratedCountsPart>
  implements OnInit
{
  public counts: FormControl<DecoratedCount[]>;

  // decorated-count-ids
  public idEntries: ThesaurusEntry[] | undefined;

  // decorated-count-tags
  public tagEntries: ThesaurusEntry[] | undefined;

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.counts = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      counts: this.counts,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'decorated-count-ids';
    if (this.hasThesaurus(key)) {
      this.idEntries = thesauri[key].entries;
    } else {
      this.idEntries = undefined;
    }
    key = 'decorated-count-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries = thesauri[key].entries;
    } else {
      this.tagEntries = undefined;
    }
  }

  private updateForm(part?: DecoratedCountsPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.counts.setValue(part.counts || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<DecoratedCountsPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): DecoratedCountsPart {
    let part = this.getEditedPart(
      DECORATED_COUNTS_PART_TYPEID
    ) as DecoratedCountsPart;
    part.counts = this.counts.value || [];
    return part;
  }

  public onCountsChange(counts: DecoratedCount[]): void {
    this.counts.setValue(counts);
    this.counts.markAsDirty();
    this.counts.updateValueAndValidity();
  }
}
