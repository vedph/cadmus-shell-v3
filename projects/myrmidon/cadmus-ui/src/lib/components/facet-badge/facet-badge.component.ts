import { Component, effect, input, Input, signal } from '@angular/core';
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

  public readonly color = signal<string>('transparent');
  public readonly contrastColor = signal<string>('black');
  public readonly tip = signal<string | undefined>(undefined);

  /**
   * The facet data.
   */
  public readonly data = input<FacetBadgeData>({
    definitions: [],
  });

  constructor(private _colorService: ColorService) {
    this._facetColors = {};
    this._facetTips = {};

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
    this.color.set(this.getFacetColor(data?.facetId || ''));
    this.contrastColor.set(this._colorService.getContrastColor(this.color()));
    this.tip.set(this.getFacetTip(data?.facetId || '') ?? undefined);
  }
}
