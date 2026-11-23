import { Injectable } from '@angular/core';
import type { Delta, Options } from 'jsondiffpatch';
import { create as createWithTextDiffs } from 'jsondiffpatch/with-text-diffs';
import { format as formatHtml } from 'jsondiffpatch/formatters/html';
import { format as formatAnnotated } from 'jsondiffpatch/formatters/annotated';
import { format as formatJsonPatch } from 'jsondiffpatch/formatters/jsonpatch';

import {
  DEFAULT_JSON_DIFF_OPTIONS,
  JsonDiffOptions,
  JsonDiffResult,
  JsonDiffSummary,
  JsonParseResult,
  JsonPatchOperation,
} from '../models';

/**
 * Service wrapping jsondiffpatch to compare two JSON documents and render
 * their differences in several formats. The service is stateless.
 */
@Injectable({ providedIn: 'root' })
export class JsonDiffService {
  /**
   * Parse the specified JSON source.
   * @param json The JSON source. Null, undefined or whitespace-only
   * sources are treated as an empty (missing) document.
   * @returns The parse result.
   */
  public parse(json: string | null | undefined): JsonParseResult {
    if (json === null || json === undefined || !json.trim()) {
      return { empty: true };
    }
    try {
      return { value: JSON.parse(json), empty: false };
    } catch (error) {
      return {
        empty: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private buildOptions(
    options: Required<JsonDiffOptions>,
    textDiffs: boolean,
  ): Options {
    const keys = options.objectHashKeys;
    const result: Options = {
      arrays: { detectMove: options.detectMove, includeValueOnMove: false },
    };
    if (keys.length) {
      result.objectHash = (item: object, index?: number) => {
        const record = item as Record<string, unknown>;
        for (const key of keys) {
          const value = record[key];
          if (value !== undefined && value !== null) {
            return `${key}:${String(value)}`;
          }
        }
        return `$$index:${index}`;
      };
    }
    // jsondiffpatch caches the text diff engine globally once loaded, so
    // text diffs are disabled with an unreachable minimum length
    result.textDiff = {
      minLength:
        textDiffs && options.textDiffMinLength > 0
          ? options.textDiffMinLength
          : Number.MAX_SAFE_INTEGER,
    } as Options['textDiff'];
    return result;
  }

  private resolveOptions(options?: JsonDiffOptions): Required<JsonDiffOptions> {
    return {
      ...DEFAULT_JSON_DIFF_OPTIONS,
      ...Object.fromEntries(
        Object.entries(options ?? {}).filter(([, v]) => v !== undefined),
      ),
    };
  }

  /**
   * Compute the delta between two values.
   * @param left The left (original) value.
   * @param right The right (changed) value.
   * @param options The diffing options.
   * @param textDiffs True to allow text diffs for long strings (when
   * enabled by options). Set to false when the delta is going to be
   * converted into JSON Patch, which does not support them.
   * @returns The delta, or undefined if the values are equal.
   */
  public diff(
    left: unknown,
    right: unknown,
    options?: JsonDiffOptions,
    textDiffs = true,
  ): Delta {
    const resolved = this.resolveOptions(options);
    return createWithTextDiffs(this.buildOptions(resolved, textDiffs)).diff(
      left,
      right,
    );
  }

  /**
   * Compare two JSON documents.
   * @param left The left (original) JSON source.
   * @param right The right (changed) JSON source.
   * @param options The diffing options.
   * @returns The comparison result.
   */
  public compare(
    left: string | null | undefined,
    right: string | null | undefined,
    options?: JsonDiffOptions,
  ): JsonDiffResult {
    const l = this.parse(left);
    const r = this.parse(right);
    if (l.error || r.error) {
      return { left: l, right: r, delta: undefined, hasChanges: false };
    }
    const delta = this.diff(l.value, r.value, options);
    return { left: l, right: r, delta, hasChanges: delta !== undefined };
  }

  /**
   * Render the specified delta as HTML for a visual diff.
   * @param delta The delta.
   * @param left The left (original) value. When specified, unchanged
   * values are included in the output too, so that they can be shown or
   * hidden.
   * @returns HTML code.
   */
  public toVisualHtml(delta: Delta, left?: unknown): string {
    return formatHtml(delta, left) ?? '';
  }

  /**
   * Render the specified delta as annotated JSON HTML.
   * @param delta The delta.
   * @param left The left (original) value.
   * @returns HTML code, or an empty string if there is no delta.
   */
  public toAnnotatedHtml(delta: Delta, left?: unknown): string {
    if (delta === undefined) {
      return '';
    }
    return formatAnnotated(delta, left) ?? '';
  }

  /**
   * Get the JSON Patch (RFC 6902) operations transforming the left value
   * into the right one.
   * @param left The left (original) value.
   * @param right The right (changed) value.
   * @param options The diffing options. Text diffs are ignored.
   * @returns The operations.
   */
  public toJsonPatch(
    left: unknown,
    right: unknown,
    options?: JsonDiffOptions,
  ): JsonPatchOperation[] {
    const delta = this.diff(left, right, options, false);
    return delta === undefined ? [] : formatJsonPatch(delta);
  }

  /**
   * Summarize the specified JSON Patch operations.
   * @param ops The operations.
   * @returns Summary.
   */
  public summarize(ops: JsonPatchOperation[]): JsonDiffSummary {
    const summary: JsonDiffSummary = {
      added: 0,
      removed: 0,
      replaced: 0,
      moved: 0,
      total: ops.length,
    };
    for (const op of ops) {
      switch (op.op) {
        case 'add':
          summary.added++;
          break;
        case 'remove':
          summary.removed++;
          break;
        case 'replace':
          summary.replaced++;
          break;
        case 'move':
          summary.moved++;
          break;
      }
    }
    return summary;
  }
}
