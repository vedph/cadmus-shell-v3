import { Component, Input, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';

import { ItemService, PreviewService } from '@myrmidon/cadmus-api';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Item } from '@myrmidon/cadmus-core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SafeHtmlPipe } from '@myrmidon/ngx-tools';

/**
 * Source IDs for a part preview.
 */
export interface PartPreviewSource {
  itemId: string;
  partId: string;
  // layer type i.e. layer part's role ID
  layerId?: string;
}

/**
 * Generic part preview.
 */
@Component({
  selector: 'cadmus-part-preview',
  templateUrl: './part-preview.component.html',
  styleUrls: ['./part-preview.component.css'],
  imports: [MatProgressBar, MatButton, MatIcon, SafeHtmlPipe],
})
export class PartPreviewComponent implements OnInit {
  private _source: PartPreviewSource | undefined | null;

  /**
   * The source of the part to be previewed.
   */
  @Input()
  public get source(): PartPreviewSource | undefined | null {
    return this._source;
  }
  public set source(value: PartPreviewSource | undefined | null) {
    this._source = value;
    this.refresh();
  }

  public busy?: boolean;
  public item?: Item;
  public html?: string;

  constructor(
    private _previewService: PreviewService,
    private _itemService: ItemService,
    private _snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {}

  public refresh(): void {
    if (this.busy) {
      return;
    }
    if (!this._source?.partId) {
      this.item = undefined;
      this.html = undefined;
      return;
    }

    this.busy = true;
    forkJoin({
      item: this._itemService.getItem(this._source.itemId, false),
      preview: this._previewService.renderPart(
        this._source.itemId,
        this._source.partId
      ),
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.busy = false;
          this.item = result.item || undefined;
          this.html = result.preview.result;
        },
        error: (error) => {
          this.busy = false;
          console.error(`Error previewing part ${this._source!.partId}`, error);
          this._snackbar.open('Error previewing part ' + this._source!.partId);
        },
      });
  }
}
