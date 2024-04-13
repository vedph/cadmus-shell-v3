import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Item } from '@myrmidon/cadmus-core';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';

@Component({
  selector: 'cadmus-current-item-bar',
  templateUrl: './current-item-bar.component.html',
  styleUrls: ['./current-item-bar.component.css'],
})
export class CurrentItemBarComponent implements OnInit {
  public item$: Observable<Item | undefined>;

  constructor(private _repository: EditedItemRepository) {
    this.item$ = this._repository.item$;
  }

  ngOnInit(): void {}
}
