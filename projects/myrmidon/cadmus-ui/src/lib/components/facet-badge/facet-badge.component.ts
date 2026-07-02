import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacetBadgeComponent {
  /**
   * The facet data.
   */
  public readonly data = input<FacetBadgeData>({
    definitions: [],
  });

  private readonly _facet = computed<FacetDefinition | undefined>(() => {
    const facetId = this.data().facetId;
    return facetId
      ? this.data().definitions?.find((f) => f.id === facetId)
      : undefined;
  });

  public readonly label = computed(
    () => this._facet()?.label || this.data().facetId || '',
  );

  public readonly color = computed(() => {
    const colorKey = this._facet()?.colorKey;
    return colorKey ? '#' + colorKey : 'transparent';
  });

  public readonly contrastColor = computed(() =>
    this._colorService.getContrastColor(this.color()),
  );

  public readonly tip = computed<string | undefined>(() => {
    if (!this.data().definitions?.length) {
      return undefined;
    }
    const facet = this._facet();
    if (!facet) {
      return this.data().facetId;
    }
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
    return sb.join('');
  });

  constructor(private _colorService: ColorService) {}
}
