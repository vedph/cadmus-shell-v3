import { ThesaurusEntry } from '@myrmidon/cadmus-core';

/**
 * The mode of a thesaurus-or-taxonomy picker, i.e. where the picked value
 * comes from:
 * - `thesaurus`: an entry of a Cadmus thesaurus (the value is the entry ID).
 * - `taxonomy`: a node of a TaxoStore tree (the value is the node key).
 * - `unbound`: free text typed by the user.
 */
export type ThesOrTaxoMode = 'thesaurus' | 'taxonomy' | 'unbound';

/**
 * How a thesaurus is presented:
 * - `auto`: as a tree when any of its entry IDs includes a dot, else as a
 * flat list.
 * - `flat`: always as a flat list.
 * - `tree`: always as a tree.
 */
export type ThesaurusViewMode = 'auto' | 'flat' | 'tree';

/**
 * A value picked by the user in a thesaurus-or-taxonomy picker.
 */
export interface ThesOrTaxoPick {
  /**
   * The picked value: a thesaurus entry ID, a taxonomy node key, or the
   * typed text. An empty string means that the value was cleared.
   */
  value: string;
  /**
   * The human-friendly label for the value, when available: the thesaurus
   * entry value, or the taxonomy node label. For unbound values, this is
   * equal to value.
   */
  label?: string;
  /**
   * The mode the value was picked in. This may differ from the picker's
   * mode when it fell back to unbound because its source was not available.
   */
  mode: ThesOrTaxoMode;
  /**
   * The source of the value: the thesaurus ID, or the taxonomy tree ID.
   * Undefined for unbound values, or for thesaurus entries got via the
   * entries input rather than by ID.
   */
  source?: string;
}

/**
 * The separator used in the IDs of hierarchical thesaurus entries.
 */
export const THESAURUS_HIERARCHY_SEPARATOR = '.';

/**
 * Check whether the specified thesaurus entries are hierarchical, i.e.
 * whether any of their IDs includes a dot.
 * @param entries The entries to check.
 * @returns True if hierarchical.
 */
export function isHierarchicalThesaurus(
  entries: readonly ThesaurusEntry[] | null | undefined,
): boolean {
  return !!entries?.some((e) => e.id.includes(THESAURUS_HIERARCHY_SEPARATOR));
}

/**
 * Resolve the view mode for the specified thesaurus entries.
 * @param entries The entries.
 * @param view The requested view mode.
 * @returns The effective view mode, either flat or tree.
 */
export function resolveThesaurusView(
  entries: readonly ThesaurusEntry[] | null | undefined,
  view: ThesaurusViewMode = 'auto',
): 'flat' | 'tree' {
  if (view !== 'auto') {
    return view;
  }
  return isHierarchicalThesaurus(entries) ? 'tree' : 'flat';
}

/**
 * Find the label (entry value) for the specified entry ID.
 * @param entries The entries to look into.
 * @param id The entry ID.
 * @returns The entry value, or undefined if not found.
 */
export function getThesaurusEntryLabel(
  entries: readonly ThesaurusEntry[] | null | undefined,
  id: string | null | undefined,
): string | undefined {
  if (!id || !entries) {
    return undefined;
  }
  return entries.find((e) => e.id === id)?.value;
}
