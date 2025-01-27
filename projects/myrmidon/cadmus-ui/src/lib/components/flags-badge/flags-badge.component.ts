import { Component, effect, input, Input } from '@angular/core';

import { MatTooltip } from '@angular/material/tooltip';

import { FlagDefinition } from '@myrmidon/cadmus-core';

/**
 * Data for FlagsBadgeComponent, including flags and their definitions.
 */
export interface FlagsBadgeData {
  definitions: FlagDefinition[];
  flags: number;
}

/**
 * Badge with item's flags. Each flag is represented by a circle filled
 * with the flag's color key.
 */
@Component({
  selector: 'cadmus-flags-badge',
  templateUrl: './flags-badge.component.html',
  styleUrls: ['./flags-badge.component.css'],
  imports: [MatTooltip],
})
export class FlagsBadgeComponent {
  public badgeFlags: FlagDefinition[] = [];

  public readonly data = input<FlagsBadgeData>();

  constructor() {
    effect(() => {
      this.updateBadge(this.data());
    });
  }

  private updateBadge(data?: FlagsBadgeData) {
    if (!data) {
      return;
    }
    this.badgeFlags = data.definitions.filter((def) => {
      // tslint:disable-next-line: no-bitwise
      return def.id & data!.flags;
    });
  }
}
