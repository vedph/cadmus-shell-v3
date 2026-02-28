import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { TitleCasePipe } from '@angular/common';

import {
  MatCard,
  MatCardHeader,
  MatCardAvatar,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatBadge } from '@angular/material/badge';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import { ThesaurusEntry, EditedObject } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
} from '@myrmidon/cadmus-ui';
import {
  renderLabelFromLastColon,
  ThesaurusTreeComponent,
} from '@myrmidon/cadmus-thesaurus-store';

import { CategoriesPart, CATEGORIES_PART_TYPEID } from '../categories-part';

/**
 * Categories component editor.
 * Thesaurus: categories (required).
 */
@Component({
  selector: 'cadmus-categories-part',
  templateUrl: './categories-part.component.html',
  styleUrls: ['./categories-part.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardAvatar,
    MatIcon,
    MatCardTitle,
    MatBadge,
    MatCardContent,
    MatIconButton,
    MatTooltip,
    MatCardActions,
    TitleCasePipe,
    CloseSaveButtonsComponent,
    ThesaurusTreeComponent,
  ],
})
export class CategoriesPartComponent
  extends ModelEditorComponentBase<CategoriesPart>
  implements OnInit
{
  // categories thesaurus entries
  public readonly entries = signal<ThesaurusEntry[] | undefined>(undefined);

  // form
  public categories: FormControl<ThesaurusEntry[]>;

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form controls
    this.categories = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      categories: this.categories,
    });
  }

  private updateForm(part?: CategoriesPart | null): void {
    if (!part?.categories) {
      this.categories.reset();
      return;
    }

    // map the category IDs to the corresponding thesaurus
    // entries, if any -- else just use the IDs
    const entries: ThesaurusEntry[] = part.categories.map((id) => {
      const entry = this.entries()?.find((e) => e.id === id);
      return entry
        ? entry
        : {
            id,
            value: id,
          };
    });

    // sort the entries by their display value
    entries.sort((a: ThesaurusEntry, b: ThesaurusEntry) => {
      return a.value.localeCompare(b.value);
    });

    // assign them to the control
    this.categories.setValue(entries);
    this.form.markAsPristine();
  }

  protected getValue(): CategoriesPart {
    let part = this.getEditedPart(CATEGORIES_PART_TYPEID) as CategoriesPart;
    part.categories = this.categories.value.map((entry: ThesaurusEntry) => {
      return entry.id;
    });
    return part;
  }

  protected override onDataSet(data?: EditedObject<CategoriesPart>): void {
    // thesauri
    const key = 'categories';
    if (this.hasThesaurus(key)) {
      this.entries.set(data?.thesauri[key].entries || []);
    }
    // tree
    this.updateForm(data?.value);
  }

  public onEntryChange(entry: ThesaurusEntry): void {
    // add the new entry unless already present
    if (this.categories.value?.some((e: ThesaurusEntry) => e.id === entry.id)) {
      return;
    }
    const entries = [...this.categories.value];
    entries.push(entry);
    // sort the entries by their display value
    entries.sort((a: ThesaurusEntry, b: ThesaurusEntry) => {
      return a.value.localeCompare(b.value);
    });
    this.categories.setValue(entries);
    this.categories.markAsDirty();
    this.categories.updateValueAndValidity();
  }

  public removeCategory(index: number): void {
    const entries = [...this.categories.value];
    entries.splice(index, 1);
    this.categories.setValue(entries);
    this.categories.markAsDirty();
    this.categories.updateValueAndValidity();
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }
}
