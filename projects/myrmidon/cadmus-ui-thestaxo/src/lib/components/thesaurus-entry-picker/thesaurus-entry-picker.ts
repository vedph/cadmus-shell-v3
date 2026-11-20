import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  renderLabelFromLastColon,
  ThesaurusTreeComponent,
} from '@myrmidon/cadmus-thesaurus-store';

import { resolveThesaurusView, ThesaurusViewMode } from '../../models';

/**
 * Picker for a single entry of a thesaurus. The thesaurus is displayed as
 * a dropdown list when flat, or as a browsable tree when hierarchical
 * (i.e. when any entry ID includes a dot). In a tree, only leaf entries
 * can be picked. This is a presentational component: it gets the entries
 * and the current entry ID, and emits the entry picked by the user; it
 * never emits when its inputs change.
 */
@Component({
  selector: 'cadmus-thesaurus-entry-picker',
  templateUrl: './thesaurus-entry-picker.html',
  styleUrl: './thesaurus-entry-picker.css',
  imports: [MatFormFieldModule, MatSelectModule, ThesaurusTreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThesaurusEntryPicker {
  /**
   * The thesaurus entries to pick from.
   */
  public readonly entries = input<readonly ThesaurusEntry[] | null>();

  /**
   * The ID of the currently picked entry, if any.
   */
  public readonly value = input<string | null>();

  /**
   * How to display the thesaurus: `auto` (default) displays it as a tree
   * when hierarchical, else as a list.
   */
  public readonly view = input<ThesaurusViewMode>('auto');

  /**
   * The label for the dropdown list.
   */
  public readonly label = input<string>('value');

  /**
   * The function used to render the labels of tree nodes. By default, this
   * renders the portion of the label after its last colon, if any.
   */
  public readonly renderLabel = input<
    ((label: string) => string) | null | undefined
  >();

  /**
   * True to disable picking.
   */
  public readonly disabled = input<boolean>(false);

  /**
   * Emitted when the user picks an entry.
   */
  public readonly entryChange = output<ThesaurusEntry>();

  /**
   * Emitted when the user leaves the dropdown list.
   */
  public readonly touch = output<void>();

  public readonly effectiveView = computed(() =>
    resolveThesaurusView(this.entries(), this.view()),
  );

  /**
   * The tree component expects a mutable array.
   */
  public readonly treeEntries = computed<ThesaurusEntry[]>(() => [
    ...(this.entries() ?? []),
  ]);

  public readonly effectiveRenderLabel = computed(
    () => this.renderLabel() ?? renderLabelFromLastColon,
  );

  /**
   * The current value when it is not found among the entries. This is
   * shown as an additional option in the list, so that a value outside the
   * thesaurus (e.g. from legacy data) is never hidden nor lost.
   */
  public readonly orphanValue = computed<string | null>(() => {
    const value = this.value();
    if (!value) {
      return null;
    }
    return this.entries()?.some((e) => e.id === value) ? null : value;
  });

  public onSelectionChange(id: string): void {
    const entry = this.entries()?.find((e) => e.id === id);
    if (entry) {
      this.entryChange.emit(entry);
    }
  }

  public onTreeEntryChange(entry: ThesaurusEntry): void {
    if (!this.disabled()) {
      this.entryChange.emit(entry);
    }
  }
}
