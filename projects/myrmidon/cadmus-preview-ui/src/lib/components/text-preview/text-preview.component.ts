import { Component, effect, input, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { MatProgressBar } from '@angular/material/progress-bar';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatTabGroup, MatTab } from '@angular/material/tabs';

import { FlatLookupPipe, SafeHtmlPipe } from '@myrmidon/ngx-tools';
import {
  TextBlock,
  TextBlockEventArgs,
  TextBlockViewComponent,
} from '@myrmidon/cadmus-text-block-view';

import { Item, LayerPartInfo, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  PreviewService,
  ItemService,
  TextBlockRow,
  RenditionResult,
} from '@myrmidon/cadmus-api';

import { PartPreviewSource } from '../part-preview/part-preview.component';

/**
 * Layered text preview component.
 */
@Component({
  selector: 'cadmus-text-preview',
  templateUrl: './text-preview.component.html',
  styleUrls: ['./text-preview.component.css'],
  imports: [
    MatProgressBar,
    MatFormField,
    MatLabel,
    MatSelect,
    FormsModule,
    ReactiveFormsModule,
    MatOption,
    TextBlockViewComponent,
    MatTabGroup,
    MatTab,
    FlatLookupPipe,
    SafeHtmlPipe,
  ],
})
export class TextPreviewComponent implements OnInit {
  /**
   * The source of the part to be previewed.
   */
  public readonly source = input<PartPreviewSource>();

  /**
   * The model types thesaurus entries.
   */
  public readonly typeEntries = input<ThesaurusEntry[]>();

  public busy?: boolean;
  public item?: Item;
  public layers: LayerPartInfo[];
  public rows: TextBlockRow[];
  public selectedLayer: FormControl<LayerPartInfo | null>;
  public frHtml: string[];
  public frLabels: string[];

  constructor(
    private _previewService: PreviewService,
    private _itemService: ItemService,
    private _snackbar: MatSnackBar,
    formBuilder: FormBuilder
  ) {
    this.layers = [];
    this.rows = [];
    this.frHtml = [];
    this.frLabels = [];
    // form
    this.selectedLayer = formBuilder.control(null);

    effect(() => {
      this.loadItem(this.source());
    });
  }

  ngOnInit(): void {
    this.selectedLayer.valueChanges.subscribe((_) => {
      if (!this.busy) {
        this.loadLayer();
      }
    });
    this.loadItem();
  }

  private getLayerTypeId(layer: LayerPartInfo): string | null {
    if (!layer) {
      return null;
    }
    let id = layer.typeId;
    if (layer.roleId) {
      id += '|' + layer.roleId;
    }
    return id;
  }

  private adjustBlockWS(blocks: TextBlock[]): void {
    // we want to use mid dot instead of space because the visualized
    // blocks might include some spacing between them
    for (let i = 0; i < blocks.length; i++) {
      blocks[i].text = blocks[i].text.replace(' ', '\xB7');
    }
  }

  private loadLayer(): void {
    const layer = this.selectedLayer.value;
    const layers = !layer || layer.id === 'all' ? this.layers : [layer];
    this.busy = true;

    this._previewService
      .getTextBlocks(
        this.source()!.partId,
        layers.map((l) => l.id),
        layers.map((l) => this.getLayerTypeId(l))
      )
      .pipe(take(1))
      .subscribe({
        next: (rows) => {
          this.busy = false;
          // convert initial/final WS into nbsp
          for (let i = 0; i < rows.length; i++) {
            this.adjustBlockWS(rows[i].blocks);
          }
          this.rows = rows;
        },
        error: (error) => {
          this.busy = false;
          console.error(
            `Error previewing text part ${this.source()!.partId}`,
            error
          );
          this._snackbar.open(
            'Error previewing text part ' + this.source()!.partId
          );
        },
      });
  }

  private loadItem(source?: PartPreviewSource): void {
    if (this.busy) {
      return;
    }
    if (!source?.partId) {
      this.item = undefined;
      this.layers = [];
      this.rows = [];
      return;
    }
    forkJoin({
      item: this._itemService.getItem(source!.itemId, false),
      layers: this._itemService.getItemLayerInfo(source.itemId, false),
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.busy = false;
          this.item = result.item || undefined;
          this.layers = result.layers;
          // select layer if requested
          if (source!.layerId) {
            this.selectedLayer.setValue(
              this.layers.find((l) => l.roleId === source!.layerId) || null
            );
            if (this.selectedLayer.value) {
              this.loadLayer();
            }
          }
        },
        error: (error) => {
          this.busy = false;
          console.error(`Error previewing text part ${source!.partId}`, error);
          this._snackbar.open('Error previewing text part ' + source!.partId);
        },
      });
  }

  private parseLayerId(id: string): string[] {
    return /^([^|]+)\|(.+)([0-9]+)$/.exec(id)!;
  }

  private showFragments(layerIds: string[]): void {
    if (this.busy || !layerIds.length) {
      return;
    }
    this.busy = true;
    // load all the fragments linked to this block
    const loaders$: Observable<RenditionResult>[] = [];
    const labels: string[] = [];
    for (let i = 0; i < layerIds.length; i++) {
      const m = this.parseLayerId(layerIds[i]);
      labels.push(m[2]);
      const layer = this.layers.find(
        (l) => l.typeId === m[1] && (!l.roleId || l.roleId === m[2])
      )!;
      loaders$.push(
        this._previewService
          .renderFragment(this.source()!.itemId, layer.id, +m[3])
          .pipe(take(1))
      );
    }

    forkJoin(loaders$)
      .pipe(take(1))
      .subscribe({
        next: (renditions) => {
          this.busy = false;
          this.frHtml = renditions.map((r) => r.result);
          this.frLabels = labels;
        },
        error: (error) => {
          this.busy = false;
          console.error(
            `Error previewing text part ${this.source()!.partId}`,
            error
          );
          this._snackbar.open(
            'Error previewing text part ' + this.source()!.partId
          );
        },
      });
  }

  public onBlockClick(args: TextBlockEventArgs): void {
    if (!args.block.layerIds?.length) {
      return;
    }
    this.showFragments(args.block.layerIds);
  }
}
