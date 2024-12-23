import { Component, Input } from '@angular/core';

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
  standalone: false,
})
export class PartBadgeComponent {
  private _typeThesaurus?: Thesaurus;
  private _facetDefinition?: FacetDefinition;
  private _partTypeIds?: PartTypeIds;

  public typeName: string | undefined;
  public roleName: string | undefined;
  public color: string;
  public contrastColor: string;

  /**
   * The badge type: 0=part and role, 1=part only, 2=role only.
   */
  @Input()
  public badgeType: PartBadgeType;

  /**
   * The types thesaurus.
   */
  @Input()
  public get typeThesaurus(): Thesaurus | undefined {
    return this._typeThesaurus;
  }
  public set typeThesaurus(value: Thesaurus | undefined) {
    this._typeThesaurus = value;
    this.updateBadge();
  }

  /**
   * The part's facet definition.
   */
  @Input()
  public get facetDefinition(): FacetDefinition | undefined {
    return this._facetDefinition;
  }
  public set facetDefinition(value: FacetDefinition | undefined) {
    this._facetDefinition = value;
    this.updateBadge();
  }

  /**
   * The part type IDs.
   */
  @Input()
  public get partTypeIds(): PartTypeIds | undefined {
    return this._partTypeIds;
  }
  public set partTypeIds(value: PartTypeIds | undefined) {
    this._partTypeIds = value;
    this.updateBadge();
  }

  constructor(
    private _facetService: FacetService,
    private _colorService: ColorService
  ) {
    this.badgeType = PartBadgeType.partAndRole;
    this.color = 'transparent';
    this.contrastColor = 'black';
  }

  private getPartColor(typeId: string, roleId?: string): string {
    if (!this._facetDefinition) {
      return 'transparent';
    }
    return this._facetService.getPartColor(
      typeId,
      roleId,
      this._facetDefinition
    );
  }

  private getTypeIdName(typeId: string): string {
    if (!this._typeThesaurus) {
      return typeId;
    }
    // strip :suffix if any
    const i = typeId.lastIndexOf(':');
    if (i > -1) {
      typeId = typeId.substring(0, i);
    }
    const entry = this._typeThesaurus.entries?.find((e) => e.id === typeId);
    return entry ? entry.value : typeId;
  }

  private getRoleIdName(roleId?: string): string | undefined {
    if (!roleId || !roleId.startsWith('fr.')) {
      return roleId;
    }
    return this.getTypeIdName(roleId);
  }

  private updateBadge(): void {
    if (this._partTypeIds) {
      this.color = this.getPartColor(
        this._partTypeIds.typeId,
        this._partTypeIds.roleId
      );
      this.typeName = this.getTypeIdName(this._partTypeIds.typeId);
      this.roleName = this.getRoleIdName(this._partTypeIds.roleId);
    } else {
      this.color = 'transparent';
      this.typeName = undefined;
      this.roleName = undefined;
    }
    this.contrastColor = this._colorService.getContrastColor(this.color);
  }
}
