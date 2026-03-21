import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { FacetDefinition } from '@myrmidon/cadmus-core';
import { FacetModelSettings, ThesaurusService } from '@myrmidon/cadmus-api';

/** A single validation issue produced by {@link FacetDefinitionValidatorService}. */
export interface FacetValidationIssue {
  severity: 'error' | 'warning' | 'info';
  /** Human-readable description of the issue. */
  message: string;
}

/** The result returned by {@link FacetDefinitionValidatorService.validate}. */
export interface FacetValidationResult {
  issues: FacetValidationIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
  hasInfos: boolean;
}

/**
 * Validates a list of {@link FacetDefinition} objects before they are persisted.
 *
 * Rules:
 * - duplicate facet ID             → error
 * - facet ID still set to "new"    → error (unfilled placeholder)
 * - duplicate facet label          → error
 * - duplicate facet color          → warning
 * - duplicate facet description    → warning
 * - facet with no part definitions → error
 * - within a facet: two parts with same typeId AND same roleId
 *   (including both empty/null)    → error
 *   (one with a roleId and one without is valid: they serve different roles)
 * - within a facet: duplicate part color  → warning
 * - within a facet: duplicate part description → warning
 * - (when facetModelSettings is provided) for each part/fragment entry in the
 *   settings, each thesaurus ID listed in thesauriIds is checked against the
 *   existing thesauri: missing required thesauri (prefixed with "*") → error;
 *   missing optional thesauri → info.
 */
@Injectable({ providedIn: 'root' })
export class FacetDefinitionValidatorService {
  constructor(private _thesaurusService: ThesaurusService) {}

  private buildResult(issues: FacetValidationIssue[]): FacetValidationResult {
    return {
      issues,
      hasErrors: issues.some((i) => i.severity === 'error'),
      hasWarnings: issues.some((i) => i.severity === 'warning'),
      hasInfos: issues.some((i) => i.severity === 'info'),
    };
  }

  private checkThesauri(
    issues: FacetValidationIssue[],
    existingIds: Set<string>,
    entries: { [key: string]: { thesauriIds?: string[] } },
    kind: 'Part' | 'Fragment',
  ): void {
    for (const [typeId, entry] of Object.entries(entries)) {
      for (const rawId of entry.thesauriIds ?? []) {
        const required = rawId.startsWith('*');
        const bareId = required ? rawId.substring(1) : rawId;
        if (!existingIds.has(bareId)) {
          if (required) {
            issues.push({
              severity: 'error',
              message: `${kind} "${typeId}" requires thesaurus "${bareId}" which does not exist.`,
            });
          } else {
            issues.push({
              severity: 'info',
              message: `${kind} "${typeId}" uses optional thesaurus "${bareId}" which does not exist.`,
            });
          }
        }
      }
    }
  }

  /**
   * Validate the given list of facet definitions and return a result
   * containing all issues found.
   * @param facets The list of facet definitions to validate.
   * @param facetModelSettings Optional settings; when provided the thesauri
   * referenced by each part/fragment are checked against the server.
   */
  public validate(
    facets: FacetDefinition[],
    facetModelSettings?: FacetModelSettings,
  ): Observable<FacetValidationResult> {
    const issues: FacetValidationIssue[] = [];

    const seenIds = new Set<string>();
    const seenLabels = new Set<string>();
    const seenColors = new Set<string>();
    const seenDescriptions = new Set<string>();

    for (const facet of facets) {
      const label = `facet "${facet.id}"`;

      // duplicate / placeholder ID
      if (!facet.id) {
        issues.push({ severity: 'error', message: 'A facet has an empty ID.' });
      } else if (facet.id === 'new') {
        issues.push({
          severity: 'error',
          message: `Facet has placeholder ID "new" — please assign a real ID.`,
        });
      } else if (seenIds.has(facet.id)) {
        issues.push({
          severity: 'error',
          message: `Duplicate facet ID: "${facet.id}".`,
        });
      } else {
        seenIds.add(facet.id);
      }

      // duplicate label
      if (facet.label) {
        if (seenLabels.has(facet.label)) {
          issues.push({
            severity: 'error',
            message: `Duplicate facet label "${facet.label}" in ${label}.`,
          });
        } else {
          seenLabels.add(facet.label);
        }
      }

      // duplicate color (warning)
      if (facet.colorKey) {
        if (seenColors.has(facet.colorKey)) {
          issues.push({
            severity: 'warning',
            message: `Duplicate facet color "${facet.colorKey}" in ${label}.`,
          });
        } else {
          seenColors.add(facet.colorKey);
        }
      }

      // duplicate description (warning)
      if (facet.description) {
        if (seenDescriptions.has(facet.description)) {
          issues.push({
            severity: 'warning',
            message: `Duplicate facet description in ${label}.`,
          });
        } else {
          seenDescriptions.add(facet.description);
        }
      }

      // no part definitions
      if (!facet.partDefinitions.length) {
        issues.push({
          severity: 'error',
          message: `${label} has no part definitions.`,
        });
      }

      // within-facet checks
      const seenPartKeys = new Set<string>();
      const seenPartColors = new Set<string>();
      const seenPartDescriptions = new Set<string>();

      for (const part of facet.partDefinitions) {
        // duplicate typeId + roleId combination
        // key uses empty string for absent roleId so that
        // (typeId, undefined) vs (typeId, "r1") are treated as different
        const key = `${part.typeId}|${part.roleId ?? ''}`;
        if (seenPartKeys.has(key)) {
          issues.push({
            severity: 'error',
            message:
              `Duplicate part (typeId "${part.typeId}", ` +
              `roleId "${part.roleId ?? '(none)'}") in ${label}.`,
          });
        } else {
          seenPartKeys.add(key);
        }

        // duplicate part color (warning)
        if (part.colorKey) {
          if (seenPartColors.has(part.colorKey)) {
            issues.push({
              severity: 'warning',
              message: `Duplicate part color "${part.colorKey}" in ${label}.`,
            });
          } else {
            seenPartColors.add(part.colorKey);
          }
        }

        // duplicate part description (warning)
        if (part.description) {
          if (seenPartDescriptions.has(part.description)) {
            issues.push({
              severity: 'warning',
              message: `Duplicate part description for type "${part.typeId}" in ${label}.`,
            });
          } else {
            seenPartDescriptions.add(part.description);
          }
        }
      }
    }

    // thesaurus coverage check (only when model settings are available)
    if (!facetModelSettings) {
      return of(this.buildResult(issues));
    }

    return this._thesaurusService.getThesaurusIds().pipe(
      map((ids) => {
        const existingIds = new Set(ids);
        this.checkThesauri(
          issues,
          existingIds,
          facetModelSettings.parts,
          'Part',
        );
        if (facetModelSettings.fragments) {
          this.checkThesauri(
            issues,
            existingIds,
            facetModelSettings.fragments,
            'Fragment',
          );
        }
        return this.buildResult(issues);
      }),
    );
  }
}
