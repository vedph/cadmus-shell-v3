import {
  ChangeDetectionStrategy,
  Component,
  computed,
  linkedSignal,
} from '@angular/core';
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

import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';

import { ThesaurusEntry, EditedObject } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  HelpLinkComponent,
} from '@myrmidon/cadmus-ui';
import {
  renderLabelFromLastColon,
  ThesaurusTreeComponent,
} from '@myrmidon/cadmus-thesaurus-store';

import { CategoriesPart, CATEGORIES_PART_TYPEID } from '../categories-part';

interface CategoriesPartControls {
  categories: ThesaurusEntry[];
}

function sortEntries(entries: ThesaurusEntry[]): ThesaurusEntry[] {
  return entries.sort((a: ThesaurusEntry, b: ThesaurusEntry) =>
    a.value.localeCompare(b.value),
  );
}

/**
 * Bound data -> editable draft: the category IDs are mapped to the
 * corresponding thesaurus entries, if any (else to entries whose value
 * is their ID), sorted by their display value.
 */
function toDraft(data?: EditedObject<CategoriesPart>): CategoriesPartControls {
  const thesEntries = data?.thesauri?.['categories']?.entries;
  return {
    categories: sortEntries(
      (data?.value?.categories || []).map((id) => {
        const entry = thesEntries?.find((e) => e.id === id);
        return entry ? { id: entry.id, value: entry.value } : { id, value: id };
      }),
    ),
  };
}

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
    MatCard,
    MatCardHeader,
    HelpLinkComponent,
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
export class CategoriesPartComponent extends ModelEditorComponentBase<CategoriesPart> {
  // categories thesaurus entries
  public readonly entries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['categories']?.entries,
  );

  private readonly _draft = linkedSignal(() => toDraft(this.data()));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.categories, 1);
  });

  protected getValue(): CategoriesPart {
    let part = this.getEditedPart(CATEGORIES_PART_TYPEID) as CategoriesPart;
    part.categories = this._draft().categories.map((entry) => entry.id);
    return part;
  }

  private setCategories(entries: ThesaurusEntry[]): void {
    this.form.categories().value.set(entries);
    this.form.categories().markAsDirty();
  }

  public onEntryChange(entry: ThesaurusEntry): void {
    const categories = this.form.categories().value();
    // add the new entry unless already present
    if (categories.some((e) => e.id === entry.id)) {
      return;
    }
    // sort the entries by their display value
    this.setCategories(
      sortEntries([...categories, { id: entry.id, value: entry.value }]),
    );
  }

  public removeCategory(index: number): void {
    const entries = [...this.form.categories().value()];
    entries.splice(index, 1);
    this.setCategories(entries);
  }

  public renderLabel(label: string): string {
    return renderLabelFromLastColon(label);
  }
}
