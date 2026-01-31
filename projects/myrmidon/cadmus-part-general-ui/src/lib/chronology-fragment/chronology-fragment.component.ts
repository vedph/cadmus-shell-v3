import { Component, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormControl,
  FormBuilder,
  Validators,
  UntypedFormGroup,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { EditedObject } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardSubtitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  HistoricalDateModel,
  HistoricalDateComponent,
} from '@myrmidon/cadmus-refs-historical-date';

import { ChronologyFragment } from '../chronology-fragment';

/**
 * Chronology fragment editor component.
 * Thesauri: "chronology-tags" when you want to use a closed set of tags.
 */
@Component({
  selector: 'cadmus-chronology-fragment',
  templateUrl: './chronology-fragment.component.html',
  styleUrls: ['./chronology-fragment.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    HistoricalDateComponent,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
  ],
})
export class ChronologyFragmentComponent
  extends ModelEditorComponentBase<ChronologyFragment>
  implements OnInit
{
  // chronology-tags thesaurus entries
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  // form
  public date: FormControl<HistoricalDateModel | null>;
  public tag: FormControl<string | null>;
  public label: FormControl<string | null>;
  public eventId: FormControl<string | null>;

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.date = formBuilder.control(null, Validators.required);
    this.tag = formBuilder.control(null, Validators.maxLength(100));
    this.label = formBuilder.control(null, Validators.maxLength(150));
    this.eventId = formBuilder.control(null, Validators.maxLength(300));
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      date: this.date,
      tag: this.tag,
      label: this.label,
      eventId: this.eventId,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    const key = 'chronology-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }
  }

  private updateForm(fragment?: ChronologyFragment | null): void {
    if (!fragment || !fragment.date) {
      this.form.reset();
    } else {
      // date
      this.date.setValue(fragment.date);
      // label and tag
      this.label.setValue(fragment.label || null);
      this.tag.setValue(fragment.tag || null);
      this.eventId.setValue(fragment.eventId || null);
      this.form.markAsPristine();
    }
  }

  protected override onDataSet(data?: EditedObject<ChronologyFragment>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value as ChronologyFragment);
  }

  public onDateChange(date: HistoricalDateModel): void {
    this.date.setValue(date);
    this.date.updateValueAndValidity();
    this.date.markAsDirty();
  }

  protected getValue(): ChronologyFragment {
    let fr = this.getEditedFragment() as ChronologyFragment;
    fr.date = this.date.value!;
    // label and tag
    fr.label = this.label.value?.trim();
    fr.eventId = this.eventId.value?.trim();
    fr.tag = this.tag.value || undefined;
    return fr;
  }
}
