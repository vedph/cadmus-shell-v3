import { Component, computed, input, output, Type } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ThesPagedTreeFilterComponent } from '../thes-paged-tree-filter/thes-paged-tree-filter.component';
import {
  renderLabelFromLastColon,
  StaticThesPagedTreeStoreService,
  ThesaurusEntry,
  ThesEntryPagedTreeNode,
} from './static-thes-paged-tree-store.service';
import { ThesPagedTreeBrowserComponent } from '../thes-paged-tree-browser/thes-paged-tree-browser.component';

/**
 * Thesaurus tree component.
 * This component displays a set of hierarchical thesaurus entries
 * in a tree, provided that each entry marks its hierarchy with
 * dots. For instance, say you have the hierarchy "furniture" -
 * "type" - "color". You might have an entry whose ID is
 * "furniture.table.red", with a sibling "furniture.table.green",
 * and a parent "furniture.table". This parent is there only to
 * provide a label to the parent node, but only leaf nodes can be
 * picked by the user. Whenever one is picked, the entryChange
 * event is emitted. Note that even if you specify a label renderer
 * function, the event always emits the original label.
 */
@Component({
  selector: 'cadmus-thesaurus-tree',
  templateUrl: './thesaurus-tree.component.html',
  styleUrls: ['./thesaurus-tree.component.css'],
  imports: [FormsModule, ReactiveFormsModule, ThesPagedTreeBrowserComponent],
})
export class ThesaurusTreeComponent {
  /**
   * The thesaurus entries.
   */
  public readonly entries = input<ThesaurusEntry[]>();

  /**
   * The optional node label rendering function.
   */
  public readonly renderLabel = input<(label: string) => string>(
    renderLabelFromLastColon
  );

  /**
   * Fired when a thesaurus entry is selected.
   */
  public readonly entryChange = output<ThesaurusEntry>();

  /**
   * The tree store service, dependent on the current entries and renderLabel.
   */
  public readonly service = computed<StaticThesPagedTreeStoreService>(() => {
    const entries = this.entries();
    return new StaticThesPagedTreeStoreService(
      entries || [],
      this.renderLabel()
    );
  });

  /**
   * The filter component class to use.
   */
  public readonly filterComponent: Type<ThesPagedTreeFilterComponent> =
    ThesPagedTreeFilterComponent;

  public onNodePick(node: ThesEntryPagedTreeNode): void {
    // only allow selection of leaf nodes (nodes without children)
    if (!node.hasChildren) {
      // find the original entry
      const entry = this.entries()?.find((e) => e.id === node.key);
      if (entry) {
        this.entryChange.emit(entry);
      }
    }
  }
}
