import { Component, computed, input, model } from '@angular/core';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatExpansionPanel } from '@angular/material/expansion';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatRipple } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';

import { renderLabelFromLastColon } from '../thesaurus-tree/static-thes-paged-tree-store.service';
import { ThesaurusTreeComponent } from '../thesaurus-tree/thesaurus-tree.component';

/**
 * The prefix added to custom entries' IDs.
 */
export const CUSTOM_ENTRY_PREFIX = '$';

/**
 * A picker component for thesaurus entries.
 * This component allows picking one or more entries from a given thesaurus.
 * In its collapsed state, it shows the picked entries as chips; when
 * expanded, it shows the thesaurus tree to pick from. Custom entries
 * (not in the thesaurus) can be optionally allowed.
 */
@Component({
  selector: 'cadmus-thes-entries-picker',
  imports: [
    ReactiveFormsModule,
    MatExpansionPanel,
    MatFormField,
    MatIconButton,
    MatIcon,
    MatInput,
    MatRipple,
    MatTooltip,
    ThesaurusTreeComponent,
  ],
  templateUrl: './thes-entries-picker.component.html',
  styleUrl: './thes-entries-picker.component.css',
})
export class ThesEntriesPickerComponent {
  /**
   * The thesaurus entries to pick from (required).
   */
  public readonly availableEntries = input.required<ThesaurusEntry[]>();

  /**
   * The picked entries.
   */
  public readonly entries = model<ThesaurusEntry[]>([]);

  /**
   * True to show the entries with labels shortened according to
   * their hierarchy.
   */
  public readonly hierarchicLabels = input<boolean>(false);

  /**
   * True to allow custom values (not in the entries list).
   */
  public readonly allowCustom = input<boolean>(false);

  /**
   * The minimum number of entries to pick.
   */
  public readonly minEntries = input<number>(0);

  /**
   * The maximum number of entries to pick (0=unlimited).
   */
  public readonly maxEntries = input<number>(0);

  /**
   * True when the picker is expanded (showing the entries list).
   */
  public readonly expanded = model<boolean>(false);

  /**
   * The message to show when there are no picked entries.
   */
  public readonly emptyMessage = input<string>('no entries');

  /**
   * The number of remaining entries that can be picked (0=unlimited).
   * This is displayed only if limit > 1.
   */
  public readonly remaining = computed(() => {
    if (this.maxEntries() > 0) {
      return this.maxEntries() - this.entries().length;
    }
    return 0;
  });

  public id: FormControl<string>;
  public value: FormControl<string>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.id = formBuilder.control<string>('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.value = formBuilder.control<string>('', {
      validators: [Validators.required, Validators.maxLength(500)],
      nonNullable: true,
    });
    this.form = formBuilder.group({
      id: this.id,
      value: this.value,
    });
  }

  // need arrow function to use 'this'
  public renderLabel = (label: string): string => {
    return this.hierarchicLabels() ? renderLabelFromLastColon(label) : label;
  };

  private sortEntries(entries: ThesaurusEntry[]) {
    entries.sort((a: ThesaurusEntry, b: ThesaurusEntry) => {
      const aIsCustom = a.id?.startsWith(CUSTOM_ENTRY_PREFIX) ?? false;
      const bIsCustom = b.id?.startsWith(CUSTOM_ENTRY_PREFIX) ?? false;
      if (aIsCustom !== bIsCustom) {
        // place custom entries after non-custom ones
        return aIsCustom ? 1 : -1;
      }
      // same kind: sort by label/value
      return a.value.localeCompare(b.value);
    });
  }

  public onEntryChange(entry: ThesaurusEntry): void {
    // check if already present
    if (this.entries().some((e: ThesaurusEntry) => e.id === entry.id)) {
      return;
    }
    // check if limit is reached
    if (this.maxEntries() && this.entries().length >= this.maxEntries()) {
      return;
    }

    const entries = [...this.entries()];
    entries.push(entry);
    this.sortEntries(entries);
    this.entries.set(entries);
  }

  public addCustomEntry(): void {
    if (this.form.invalid) {
      return;
    }

    // create the custom entry
    const customEntry: ThesaurusEntry = {
      id: CUSTOM_ENTRY_PREFIX + this.id.value,
      value: this.value.value,
    };

    // check if already present
    if (this.entries().some((e: ThesaurusEntry) => e.id === customEntry.id)) {
      return;
    }
    // check if limit is reached
    if (this.maxEntries() && this.entries().length >= this.maxEntries()) {
      return;
    }
    const entries = [...this.entries()];
    entries.push(customEntry);
    this.sortEntries(entries);
    this.entries.set(entries);
    this.form.reset();
  }

  public removeEntry(entry: ThesaurusEntry): void {
    const entries = [...this.entries().filter((e) => e.id !== entry.id)];
    this.entries.set(entries);
  }

  public clear(): void {
    this.entries.set([]);
  }
}
