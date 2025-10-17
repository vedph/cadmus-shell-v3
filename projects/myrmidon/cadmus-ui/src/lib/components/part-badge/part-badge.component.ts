import { Component, input, computed } from '@angular/core';

import {
  Thesaurus,
  FacetDefinition,
  PartTypeIds,
  ThesaurusEntry,
} from '@myrmidon/cadmus-core';
import { FacetService } from '@myrmidon/cadmus-api';
import { MatTooltip } from '@angular/material/tooltip';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

export enum PartBadgeType {
  partAndRole = 0,
  partOnly = 1,
  roleOnly = 2,
}

/**
 * Function used to get the part's human-friendly name from its ID and role ID.
 * This assumes that thesaurus entries with role ID specified have form
 * partId:roleId.
 * @param typeId The part type ID.
 * @param roleId The optional role ID.
 * @param typeThesaurus The types thesaurus.
 * @param noFallback If true, and no thesaurus is provided, return undefined
 * rather than the type and role IDs.
 * @returns The name.
 */
export function getPartIdName(
  typeId: string,
  roleId?: string | null,
  typeThesaurus?: Thesaurus,
  noFallback = false
): string | undefined {
  if (!typeThesaurus) {
    if (noFallback) {
      return undefined;
    }
    return roleId ? `${typeId} ${roleId}` : typeId;
  }
  let entry: ThesaurusEntry | undefined;

  // first find partId:roleId if any
  if (roleId) {
    const suffixedId = `${typeId}:${roleId}`;
    entry = typeThesaurus.entries?.find((e) => e.id === suffixedId);
    if (entry) {
      return entry.value;
    }
  }
  // else find partId alone
  entry = typeThesaurus.entries?.find((e) => e.id === typeId);

  return entry ? entry.value : typeId;
}

/**
 * Part badge component. This component displays a badge with the
 * part's type name and role name, if any, and a background color.
 */
@Component({
  selector: 'cadmus-part-badge',
  imports: [MatTooltip, ColorToContrastPipe],
  templateUrl: './part-badge.component.html',
  styleUrls: ['./part-badge.component.css'],
})
export class PartBadgeComponent {
  /**
   * The badge type: 0=part and role, 1=part only, 2=role only.
   */
  public readonly badgeType = input<PartBadgeType>(PartBadgeType.partAndRole);

  /**
   * The types thesaurus.
   */
  public readonly typeThesaurus = input<Thesaurus>();

  /**
   * The part's facet definition.
   */
  public readonly facetDefinition = input<FacetDefinition>();

  /**
   * The part type IDs.
   */
  public readonly partTypeIds = input<PartTypeIds>();

  /**
   * The part type name.
   */
  public readonly typeName = computed(() => {
    const partTypeIds = this.partTypeIds();
    const typeThesaurus = this.typeThesaurus();

    if (!partTypeIds) {
      return undefined;
    }

    return getPartIdName(partTypeIds.typeId, partTypeIds.roleId, typeThesaurus);
  });

  /**
   * The part role name.
   */
  public readonly roleName = computed(() => {
    const partTypeIds = this.partTypeIds();
    const typeThesaurus = this.typeThesaurus();

    if (!partTypeIds) {
      return undefined;
    }

    return this.getRoleIdName(partTypeIds.roleId, typeThesaurus);
  });

  /**
   * The part badge color.
   */
  public readonly color = computed(() => {
    const partTypeIds = this.partTypeIds();
    const facetDefinition = this.facetDefinition();

    if (!partTypeIds) {
      return 'transparent';
    }

    return this.getPartColor(
      partTypeIds.typeId,
      partTypeIds.roleId,
      facetDefinition
    );
  });

  /**
   * The part definition matching the part type ID and role ID.
   */
  public readonly partDefinition = computed(() => {
    const partTypeIds = this.partTypeIds();
    const facetDefinition = this.facetDefinition();

    if (!partTypeIds || !facetDefinition?.partDefinitions) {
      return undefined;
    }

    // First try to find exact match with typeId:roleId
    if (partTypeIds.roleId) {
      const exactMatch = facetDefinition.partDefinitions.find(
        (pd) => pd.typeId === `${partTypeIds.typeId}:${partTypeIds.roleId}`
      );
      if (exactMatch) {
        return exactMatch;
      }
    }

    // Fallback to match by typeId only
    return facetDefinition.partDefinitions.find(
      (pd) => pd.typeId === partTypeIds.typeId
    );
  });

  constructor(private _facetService: FacetService) {}

  private getPartColor(
    typeId: string,
    roleId?: string,
    facetDefinition?: FacetDefinition
  ): string {
    if (!facetDefinition) {
      return 'transparent';
    }
    return this._facetService.getPartColor(typeId, roleId, facetDefinition);
  }

  /**
   * Get the role's human-friendly name from its ID.
   * @param roleId The role ID.
   * @param typeThesaurus The types thesaurus.
   * @returns The name or undefined.
   */
  private getRoleIdName(
    roleId?: string,
    typeThesaurus?: Thesaurus
  ): string | undefined {
    if (!roleId || !typeThesaurus) {
      return roleId;
    }
    let entry: ThesaurusEntry | undefined;

    // first find full roleId with optional suffix
    entry = typeThesaurus.entries?.find((e) => e.id === roleId);
    if (entry) {
      return entry.value;
    }

    // else strip :suffix if any and find
    const i = roleId.lastIndexOf(':');
    if (i > -1) {
      roleId = roleId.substring(0, i);
    }
    entry = typeThesaurus.entries?.find((e) => e.id === roleId);
    return entry ? entry.value : roleId;
  }
}
