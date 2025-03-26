import { Component, effect, input } from '@angular/core';

import {
  Thesaurus,
  FacetDefinition,
  PartTypeIds,
  ThesaurusEntry,
} from '@myrmidon/cadmus-core';
import { FacetService } from '@myrmidon/cadmus-api';

import { ColorService } from '../../services/color.service';

export enum PartBadgeType {
  partAndRole = 0,
  partOnly = 1,
  roleOnly = 2,
}

/**
 * Part badge component. This component displays a badge with the
 * part's type name and role name, if any, and a background color.
 */
@Component({
  selector: 'cadmus-part-badge',
  templateUrl: './part-badge.component.html',
  styleUrls: ['./part-badge.component.css'],
})
export class PartBadgeComponent {
  public typeName: string | undefined;
  public roleName: string | undefined;
  public color: string;
  public contrastColor: string;

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

  constructor(
    private _facetService: FacetService,
    private _colorService: ColorService
  ) {
    this.color = 'transparent';
    this.contrastColor = 'black';

    effect(() => {
      this.updateBadge(
        this.partTypeIds(),
        this.typeThesaurus(),
        this.facetDefinition()
      );
    });
  }

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
   * Get the part's human-friendly name from its ID and role ID.
   * This assumes that thesaurus entries with role ID specified
   * have form partId:roleId.
   * @param partId The part ID.
   * @param roleId The optional role ID.
   * @param typeThesaurus The types thesaurus.
   * @returns The name.
   */
  private getPartIdName(
    partId: string,
    roleId?: string,
    typeThesaurus?: Thesaurus
  ): string {
    if (!typeThesaurus) {
      return partId;
    }
    let entry: ThesaurusEntry | undefined;

    // first find partId:roleId if any
    if (roleId) {
      const suffixedId = `${partId}:${roleId}`;
      entry = typeThesaurus.entries?.find((e) => e.id === suffixedId);
      if (entry) {
        return entry.value;
      }
    }
    // else find partId alone
    entry = typeThesaurus.entries?.find((e) => e.id === partId);

    return entry ? entry.value : partId;
  }

  /**
   * Get the role's human-friendly name from its ID.
   * @param roleId The role ID.
   * @param typeThesaurus The types thesaurus.
   * @returns The name.?
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

  private updateBadge(
    partTypeIds?: PartTypeIds,
    typeThesaurus?: Thesaurus,
    facetDefinition?: FacetDefinition
  ): void {
    if (partTypeIds) {
      this.color = this.getPartColor(
        partTypeIds.typeId,
        partTypeIds.roleId,
        facetDefinition
      );
      this.typeName = this.getPartIdName(
        partTypeIds.typeId,
        partTypeIds.roleId,
        typeThesaurus
      );
      this.roleName = this.getRoleIdName(partTypeIds.roleId, typeThesaurus);
    } else {
      this.color = 'transparent';
      this.typeName = undefined;
      this.roleName = undefined;
    }
    this.contrastColor = this._colorService.getContrastColor(this.color);
  }
}
