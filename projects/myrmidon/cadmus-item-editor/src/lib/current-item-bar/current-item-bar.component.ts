import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';

import { MatTooltip } from '@angular/material/tooltip';

import { Item } from '@myrmidon/cadmus-core';
import { EditedItemRepository } from '../state/edited-item.repository';

@Component({
  selector: 'cadmus-current-item-bar',
  templateUrl: './current-item-bar.component.html',
  styleUrls: ['./current-item-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, DatePipe, MatTooltip],
})
export class CurrentItemBarComponent {
  public item$: Observable<Item | undefined>;

  constructor(private _repository: EditedItemRepository) {
    this.item$ = this._repository.item$;
  }
}
