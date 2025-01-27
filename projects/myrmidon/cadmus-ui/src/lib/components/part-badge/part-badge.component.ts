import { Component, effect, input } from '@angular/core';

import { Thesaurus, FacetDefinition, PartTypeIds } from '@myrmidon/cadmus-core';
import { FacetService } from '@myrmidon/cadmus-api';

import { ColorService } from '../../services/color.service';

export enum PartBadgeType {
  partAndRole = 0,
  partOnly = 1,
  roleOnly = 2,
}

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

  private getTypeIdName(typeId: string, typeThesaurus?: Thesaurus): string {
    if (!typeThesaurus) {
      return typeId;
    }
    // strip :suffix if any
    const i = typeId.lastIndexOf(':');
    if (i > -1) {
      typeId = typeId.substring(0, i);
    }
    const entry = typeThesaurus.entries?.find((e) => e.id === typeId);
    return entry ? entry.value : typeId;
  }

  private getRoleIdName(
    roleId?: string,
    typeThesaurus?: Thesaurus
  ): string | undefined {
    if (!roleId || !roleId.startsWith('fr.')) {
      return roleId;
    }
    return this.getTypeIdName(roleId, typeThesaurus);
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
      this.typeName = this.getTypeIdName(partTypeIds.typeId, typeThesaurus);
      this.roleName = this.getRoleIdName(partTypeIds.roleId, typeThesaurus);
    } else {
      this.color = 'transparent';
      this.typeName = undefined;
      this.roleName = undefined;
    }
    this.contrastColor = this._colorService.getContrastColor(this.color);
  }
}
