import { Component, effect, input, Input } from '@angular/core';
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

  public color: string;
  public contrastColor: string;
  public tip?: string;

  /**
   * The facet data.
   */
  public readonly data = input<FacetBadgeData>({
    definitions: [],
  });

  constructor(private _colorService: ColorService) {
    this._facetColors = {};
    this._facetTips = {};
    this.color = 'transparent';
    this.contrastColor = 'black';

    effect(() => {
      this.updateBadge(this.data());
    });
  }

  private getFacetColor(facetId: string): string {
    if (this._facetColors[facetId]) {
      return this._facetColors[facetId];
    }
    if (!this.data().definitions?.length) {
      return 'transparent';
    }

    const facet = this.data().definitions.find((f) => {
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

    if (!this.data().definitions?.length) {
      return null;
    }

    const facet = this.data().definitions.find((f) => {
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

  private updateBadge(data?: FacetBadgeData) {
    this._facetColors = {};
    this._facetTips = {};
    this.color = this.getFacetColor(data?.facetId || '');
    this.contrastColor = this._colorService.getContrastColor(this.color);
    this.tip = this.getFacetTip(data?.facetId || '') ?? undefined;
  }
}
