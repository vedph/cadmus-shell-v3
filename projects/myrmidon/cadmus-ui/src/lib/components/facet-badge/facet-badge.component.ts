import { Component, Input } from '@angular/core';
import { FacetDefinition } from '@myrmidon/cadmus-core';

import { MatTooltip } from '@angular/material/tooltip';

import { ColorService } from '../../services/color.service';

export interface FacetBadgeData {
  definitions: FacetDefinition[];
  facetId?: string;
}

@Component({
  selector: 'cadmus-facet-badge',
  templateUrl: './facet-badge.component.html',
  styleUrls: ['./facet-badge.component.css'],
  imports: [MatTooltip],
})
export class FacetBadgeComponent {
  private _facetColors: { [key: string]: string };
  private _facetTips: { [key: string]: string };
  private _data?: FacetBadgeData | null;

  public color: string;
  public contrastColor: string;
  public tip?: string;

  /**
   * The facet data.
   */
  @Input()
  public get data(): FacetBadgeData | undefined | null {
    return this._data;
  }
  public set data(value: FacetBadgeData | undefined | null) {
    this._data = value;
    this._facetColors = {};
    this._facetTips = {};
    this.updateBadge();
  }

  constructor(private _colorService: ColorService) {
    this._data = {
      definitions: [],
    };
    this._facetColors = {};
    this._facetTips = {};
    this.color = 'transparent';
    this.contrastColor = 'black';
  }

  private getFacetColor(facetId: string): string {
    if (this._facetColors[facetId]) {
      return this._facetColors[facetId];
    }
    if (!this._data?.definitions?.length) {
      return 'transparent';
    }

    const facet = this._data.definitions.find((f) => {
      return f.id === facetId;
    });
    if (facet?.colorKey) {
      this._facetColors[facetId] = '#' + facet.colorKey;
    } else {
      this._facetColors[facetId] = 'transparent';
    }
    return this._facetColors[facetId];
  }

  private getFacetTip(facetId: string): string | null {
    if (this._facetTips[facetId]) {
      return this._facetTips[facetId];
    }

    if (!this._data?.definitions?.length) {
      return null;
    }

    const facet = this._data.definitions.find((f) => {
      return f.id === facetId;
    });
    if (!facet) {
      this._facetTips[facetId] = facetId;
    } else {
      const sb: string[] = [];
      for (let i = 0; i < facet.partDefinitions.length; i++) {
        if (i > 0) {
          sb.push(', ');
        }
        sb.push(facet.partDefinitions[i].name);
        if (facet.partDefinitions[i].isRequired) {
          sb.push('*');
        }
      }
      this._facetTips[facetId] = sb.join('');
    }
    return this._facetTips[facetId];
  }

  private updateBadge() {
    this.color = this.getFacetColor(this._data?.facetId || '');
    this.contrastColor = this._colorService.getContrastColor(this.color);
    this.tip = this.getFacetTip(this._data?.facetId || '') ?? undefined;
  }
}
