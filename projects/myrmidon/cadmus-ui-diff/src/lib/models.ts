import type { Delta } from 'jsondiffpatch';
import type { Op } from 'jsondiffpatch/formatters/jsonpatch';

/**
 * A JSON Patch (RFC 6902) operation, as produced by jsondiffpatch.
 */
export type JsonPatchOperation = Op;

/**
 * Options for diffing two JSON documents.
 */
export interface JsonDiffOptions {
  /**
   * The names of the properties used to identify objects inside arrays,
   * in order of priority. When an object in an array has one of these
   * properties, its value is used to match the object across the two
   * documents, so that moved items are detected as moves rather than as
   * removals plus additions. Default is `['id', '_id', 'name']`. Use an
   * empty array to match array items by position only.
   */
  objectHashKeys?: string[];
  /**
   * True to detect items moved inside arrays. Default is true.
   */
  detectMove?: boolean;
  /**
   * The minimum length a string must have on both sides to be diffed
   * character by character (text diff) rather than as a whole value.
   * Default is 60. Set it to 0 to disable text diffs.
   * Text diffs are never used for JSON Patch, which does not support them.
   */
  textDiffMinLength?: number;
}

/**
 * Default diffing options.
 */
export const DEFAULT_JSON_DIFF_OPTIONS: Required<JsonDiffOptions> = {
  objectHashKeys: ['id', '_id', 'name'],
  detectMove: true,
  textDiffMinLength: 60,
};

/**
 * The result of parsing a JSON document.
 */
export interface JsonParseResult {
  /**
   * The parsed value. This is undefined when the source was empty
   * or invalid.
   */
  value?: unknown;
  /**
   * True if the source was null, undefined, or whitespace only.
   */
  empty: boolean;
  /**
   * The parse error message, if the source was not valid JSON.
   */
  error?: string;
}

/**
 * A summary of the changes between two JSON documents.
 */
export interface JsonDiffSummary {
  added: number;
  removed: number;
  replaced: number;
  moved: number;
  /**
   * The total number of changes.
   */
  total: number;
}

/**
 * The full result of comparing two JSON documents.
 */
export interface JsonDiffResult {
  /**
   * The parse result for the left (original) document.
   */
  left: JsonParseResult;
  /**
   * The parse result for the right (changed) document.
   */
  right: JsonParseResult;
  /**
   * The jsondiffpatch delta. This is undefined when the documents are
   * equal or when any of them could not be parsed.
   */
  delta: Delta;
  /**
   * True if both documents were parsed and they are different.
   */
  hasChanges: boolean;
}

export type { Delta };
