import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  ViewEncapsulation,
} from '@angular/core';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTab, MatTabContent, MatTabGroup } from '@angular/material/tabs';

import {
  JsonDiffOptions,
  JsonDiffResult,
  JsonDiffSummary,
  JsonPatchOperation,
} from '../../models';
import { JsonDiffService } from '../../services/json-diff.service';
import { JsonDiffVisualComponent } from '../json-diff-visual/json-diff-visual.component';
import { JsonDiffAnnotatedComponent } from '../json-diff-annotated/json-diff-annotated.component';
import { JsonPatchViewComponent } from '../json-patch-view/json-patch-view.component';

/**
 * The tabs of the JSON diff view.
 */
export enum JsonDiffViewTab {
  Visual = 0,
  Annotated = 1,
  Patch = 2,
}

/**
 * JSON diff view. Given two JSON documents, this shows their differences
 * in three tabs: a visual diff (optionally including unchanged values),
 * the annotated JSON delta, and the equivalent JSON Patch (RFC 6902).
 * The component fills all the space available to it.
 */
@Component({
  selector: 'cadmus-json-diff-view',
  imports: [
    MatSlideToggle,
    MatTabGroup,
    MatTab,
    MatTabContent,
    JsonDiffVisualComponent,
    JsonDiffAnnotatedComponent,
    JsonPatchViewComponent,
  ],
  templateUrl: './json-diff-view.component.html',
  styleUrl: './json-diff-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // styles must reach into Material tabs internals to make them fill
  // the available space; they are scoped under the host class
  encapsulation: ViewEncapsulation.None,
  host: { class: 'cadmus-json-diff-view' },
})
export class JsonDiffViewComponent {
  private readonly _diff = inject(JsonDiffService);

  /**
   * The left (original) JSON document. A null, undefined or empty value
   * represents a missing document.
   */
  public readonly left = input<string | null | undefined>();

  /**
   * The right (changed) JSON document. A null, undefined or empty value
   * represents a missing document.
   */
  public readonly right = input<string | null | undefined>();

  /**
   * The diffing options.
   */
  public readonly options = input<JsonDiffOptions | undefined>();

  /**
   * True to show unchanged values in the visual diff.
   */
  public readonly showUnchanged = model<boolean>(false);

  /**
   * The index of the selected tab (see JsonDiffViewTab).
   */
  public readonly selectedTab = model<number>(JsonDiffViewTab.Visual);

  /**
   * True to hide the summary bar above the tabs. The parse errors are
   * shown anyway.
   */
  public readonly hideSummary = input<boolean>(false);

  /**
   * The comparison result.
   */
  public readonly result = computed<JsonDiffResult>(() =>
    this._diff.compare(this.left(), this.right(), this.options()),
  );

  /**
   * The parse errors, if any.
   */
  public readonly errors = computed<string[]>(() => {
    const r = this.result();
    const errors: string[] = [];
    if (r.left.error) {
      errors.push(`Left JSON is invalid: ${r.left.error}`);
    }
    if (r.right.error) {
      errors.push(`Right JSON is invalid: ${r.right.error}`);
    }
    return errors;
  });

  /**
   * The visual diff HTML.
   */
  public readonly visualHtml = computed<string>(() => {
    const r = this.result();
    if (this.errors().length) {
      return '';
    }
    return this._diff.toVisualHtml(r.delta, r.left.value);
  });

  /**
   * The annotated JSON HTML.
   */
  public readonly annotatedHtml = computed<string>(() => {
    const r = this.result();
    return this._diff.toAnnotatedHtml(r.delta, r.left.value);
  });

  /**
   * The JSON Patch operations.
   */
  public readonly patch = computed<JsonPatchOperation[]>(() => {
    const r = this.result();
    if (!r.hasChanges) {
      return [];
    }
    return this._diff.toJsonPatch(r.left.value, r.right.value, this.options());
  });

  /**
   * The changes summary.
   */
  public readonly summary = computed<JsonDiffSummary>(() =>
    this._diff.summarize(this.patch()),
  );

  /**
   * The textual description of the changes summary.
   */
  public readonly summaryText = computed<string>(() => {
    const r = this.result();
    if (this.errors().length) {
      return 'Cannot compare invalid JSON.';
    }
    if (r.left.empty && r.right.empty) {
      return 'No documents to compare.';
    }
    if (!r.hasChanges) {
      return 'No differences.';
    }
    const s = this.summary();
    const parts: string[] = [];
    if (s.added) parts.push(`${s.added} added`);
    if (s.removed) parts.push(`${s.removed} removed`);
    if (s.replaced) parts.push(`${s.replaced} replaced`);
    if (s.moved) parts.push(`${s.moved} moved`);
    return `${s.total} ${s.total === 1 ? 'change' : 'changes'}: ${parts.join(', ')}.`;
  });

  public onShowUnchangedChange(value: boolean): void {
    this.showUnchanged.set(value);
  }

  public onSelectedTabChange(index: number): void {
    this.selectedTab.set(index);
  }
}
