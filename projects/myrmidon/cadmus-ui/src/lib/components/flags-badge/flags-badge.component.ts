import { Component, Input } from '@angular/core';

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
  private _data?: FlagsBadgeData | null;

  public badgeFlags: FlagDefinition[];

  @Input()
  public get data(): FlagsBadgeData | undefined | null {
    return this._data;
  }
  public set data(value: FlagsBadgeData | undefined | null) {
    this._data = value;
    this.updateBadge();
  }

  constructor() {
    this.badgeFlags = [];
  }

  private updateBadge() {
    if (!this._data) {
      return;
    }
    this.badgeFlags = this._data.definitions.filter((def) => {
      // tslint:disable-next-line: no-bitwise
      return def.id & this._data!.flags;
    });
  }
}
