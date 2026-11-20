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
 * Settings for a thesaurus-or-taxonomy picker. These are typically part of
 * the settings of an editor, so that the source of a value can be configured
 * per app and per editor role, without changing the editor. All properties
 * are optional: an undefined property leaves the corresponding picker input
 * untouched.
 */
export interface ThesOrTaxoSettings {
  /**
   * The mode: `thesaurus`, `taxonomy`, or `unbound`.
   */
  mode?: ThesOrTaxoMode;
  /**
   * The source: the thesaurus ID for thesaurus mode, or the tree ID for
   * taxonomy mode. In thesaurus mode, when this is set the thesaurus is
   * loaded by ID, rather than using the entries provided by the editor.
   */
  source?: string;
  /**
   * How to display a thesaurus: `auto`, `flat`, or `tree`.
   */
  thesaurusView?: ThesaurusViewMode;
  /**
   * True to show the top-level nodes filter in the taxonomy picker.
   */
  hasTopNodeFilter?: boolean;
  /**
   * Whether users can edit taxonomy nodes.
   */
  canEditNode?: boolean;
  /**
   * Whether users can add taxonomy nodes.
   */
  canAddNode?: boolean;
  /**
   * Whether users can delete taxonomy nodes.
   */
  canDeleteNode?: boolean;
}

/**
 * Merge the specified picker settings, so that each defined property of
 * a later settings object overrides the same property of the earlier ones.
 * Unlike spreading, undefined and null properties override nothing. This is
 * typically used to apply settings loaded from the app over the defaults of
 * an editor.
 * @param settings The settings to merge, in order of increasing priority.
 * @returns The merged settings.
 */
export function mergeThesOrTaxoSettings(
  ...settings: (ThesOrTaxoSettings | null | undefined)[]
): ThesOrTaxoSettings {
  const result: Record<string, unknown> = {};
  for (const s of settings) {
    if (!s) {
      continue;
    }
    for (const [key, value] of Object.entries(s)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
  }
  return result as ThesOrTaxoSettings;
}

/**
 * Get the thesaurus entries to pass to a picker configured with the
 * specified settings. When the settings specify a thesaurus mode with an
 * explicit thesaurus ID, the picker must load that thesaurus, so this returns
 * undefined; otherwise, it returns the entries provided by the editor.
 * @param settings The picker settings.
 * @param entries The entries provided by the editor.
 * @returns The entries for the picker.
 */
export function resolveThesOrTaxoEntries(
  settings: ThesOrTaxoSettings | null | undefined,
  entries: readonly ThesaurusEntry[] | null | undefined,
): readonly ThesaurusEntry[] | null | undefined {
  return settings?.mode === 'thesaurus' && settings.source
    ? undefined
    : entries;
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
