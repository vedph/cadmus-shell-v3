import { CommonModule } from '@angular/common';
import { Component, effect, input, model, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { AssertedDate } from '@myrmidon/cadmus-refs-asserted-chronotope';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';
import {
  HistoricalDateComponent,
  HistoricalDateModel,
} from '@myrmidon/cadmus-refs-historical-date';

@Component({
  selector: 'cadmus-asserted-historical-date',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    HistoricalDateComponent,
    AssertionComponent,
  ],
  templateUrl: './asserted-historical-date.component.html',
  styleUrl: './asserted-historical-date.component.css',
})
export class AssertedHistoricalDateComponent {
  public readonly date = model<AssertedDate>();
  public readonly dateCancel = output();

  public tag: FormControl<string | null>;
  public hd: FormControl<HistoricalDateModel | null>;
  public assertion: FormControl<Assertion | null>;
  public form: FormGroup;

  // asserted-historical-dates-tags
  public tagEntries = input<ThesaurusEntry[]>();
  // assertion-tags
  public assertionTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public docReferenceTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public docReferenceTagEntries = input<ThesaurusEntry[]>();

  constructor(formBuilder: FormBuilder) {
    // form
    this.tag = formBuilder.control(null);
    this.hd = formBuilder.control(null, Validators.required);
    this.assertion = formBuilder.control(null);

    this.form = formBuilder.group({
      tag: this.tag,
      hd: this.hd,
      assertion: this.assertion,
    });

    // when model changes, update form
    effect(() => {
      this.updateForm(this.date());
    });
  }

  private updateForm(date: AssertedDate | undefined | null): void {
    if (!date) {
      this.form.reset();
      return;
    }

    this.tag.setValue(date.tag || null);
    this.hd.setValue(date ? { a: date.a, b: date.b } : null);
    this.assertion.setValue(date.assertion || null);

    this.form.markAsPristine();
  }

  private getDate(): AssertedDate {
    return {
      tag: this.tag.value || undefined,
      a: this.hd.value!.a || undefined,
      b: this.hd.value?.b || undefined,
      assertion: this.assertion.value || undefined,
    };
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.assertion.setValue(assertion || null);
    this.assertion.updateValueAndValidity();
    this.assertion.markAsDirty();
  }

  public onDateChange(date?: HistoricalDateModel): void {
    this.hd.setValue(date || null);
    this.hd.updateValueAndValidity();
    this.hd.markAsDirty();
  }

  public cancel(): void {
    this.dateCancel.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.date.set(this.getDate());
  }
}
