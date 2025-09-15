import { Component, effect, input, signal } from '@angular/core';
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
export class PartPreviewComponent {
  /**
   * The source of the part to be previewed.
   */
  public readonly source = input<PartPreviewSource>();

  public readonly busy = signal<boolean>(false);
  public readonly item = signal<Item | undefined>(undefined);
  public readonly html = signal<string | undefined>(undefined);

  constructor(
    private _previewService: PreviewService,
    private _itemService: ItemService,
    private _snackbar: MatSnackBar
  ) {
    effect(() => this.refresh(this.source()));
  }

  public refresh(source?: PartPreviewSource): void {
    if (this.busy()) {
      return;
    }
    if (!source?.partId) {
      this.item.set(undefined);
      this.html.set(undefined);
      return;
    }

    this.busy.set(true);
    forkJoin({
      item: this._itemService.getItem(source.itemId, false),
      preview: this._previewService.renderPart(source.itemId, source.partId),
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.item.set(result.item || undefined);
          this.html.set(result.preview.result);
        },
        error: (error) => {
          this.busy.set(false);
          console.error(`Error previewing part ${source!.partId}`, error);
          this._snackbar.open('Error previewing part ' + source!.partId);
        },
      });
  }
}
