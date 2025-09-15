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

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import {
  DecoratedCount,
  DecoratedCountsComponent,
} from '@myrmidon/cadmus-refs-decorated-counts';

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
  DECORATED_COUNTS_PART_TYPEID,
  DecoratedCountsPart,
} from '../decorated-counts-part';

/**
 * Decorated counts part editor component.
 * Thesauri: decorated-count-ids, decorated-count-tags (all optional).
 */
@Component({
  selector: 'cadmus-decorated-counts-part',
  templateUrl: './decorated-counts-part.component.html',
  styleUrl: './decorated-counts-part.component.scss',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardContent,
    DecoratedCountsComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class DecoratedCountsPartComponent
  extends ModelEditorComponentBase<DecoratedCountsPart>
  implements OnInit
{
  public counts: FormControl<DecoratedCount[]>;

  // decorated-count-ids
  public readonly idEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // decorated-count-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

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
      this.idEntries.set(thesauri[key].entries);
    } else {
      this.idEntries.set(undefined);
    }
    key = 'decorated-count-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
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
