import { Component, ChangeDetectionStrategy, Signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatTooltip } from '@angular/material/tooltip';

import { Item } from '@myrmidon/cadmus-core';
import { EditedItemRepository } from '../state/edited-item.repository';

@Component({
  selector: 'cadmus-current-item-bar',
  templateUrl: './current-item-bar.component.html',
  styleUrls: ['./current-item-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTooltip],
})
export class CurrentItemBarComponent {
  public readonly item: Signal<Item | undefined>;

  constructor(repository: EditedItemRepository) {
    this.item = toSignal(repository.item$);
  }
}
