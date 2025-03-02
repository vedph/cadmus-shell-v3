import { Component, effect, input, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { MatProgressBar } from '@angular/material/progress-bar';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatTabGroup, MatTab } from '@angular/material/tabs';

import { FlatLookupPipe, SafeHtmlPipe } from '@myrmidon/ngx-tools';

import { Item, LayerPartInfo, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  PreviewService,
  ItemService,
  RenditionResult,
  TextSpan,
} from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';

import { PartPreviewSource } from '../part-preview/part-preview.component';
import { TextSpansViewComponent } from '../text-spans-view/text-spans-view.component';

/**
 * Decorated layer part info. This just adds the color to each layer.
 */
export interface DecoratedLayerPartInfo extends LayerPartInfo {
  color?: string;
}

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
    MatTabGroup,
    MatTab,
    FlatLookupPipe,
    SafeHtmlPipe,
    TextSpansViewComponent,
  ],
})
export class TextPreviewComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  /**
   * The source of the part to be previewed.
   */
  public readonly source = input<PartPreviewSource>();

  /**
   * The model types thesaurus entries.
   */
  public readonly typeEntries = input<ThesaurusEntry[]>();

  public layers: DecoratedLayerPartInfo[] = [];
  public spans: TextSpan[] = [];
  public frHtml: string[] = [];
  public frLabels: string[] = [];
  public busy?: boolean;
  public item?: Item;

  public selectedLayer: FormControl<DecoratedLayerPartInfo | null>;

  constructor(
    private _previewService: PreviewService,
    private _itemService: ItemService,
    private _appRepository: AppRepository,
    private _snackbar: MatSnackBar,
    formBuilder: FormBuilder
  ) {
    // form
    this.selectedLayer = formBuilder.control(null);

    effect(() => {
      this.loadItem(this.source());
    });
  }

  public ngOnInit(): void {
    this._sub = this.selectedLayer.valueChanges.subscribe((_) => {
      if (!this.busy) {
        this.loadLayer();
      }
    });
    this.loadItem();
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private adjustSpanWS(spans: TextSpan[]): void {
    // we want to use mid dot instead of space because the visualized
    // blocks might include some spacing between them
    for (let i = 0; i < spans.length; i++) {
      spans[i].text = spans[i].text?.replace(/ /g, '\xB7');
    }
  }

  private assignLayerColors(layers: DecoratedLayerPartInfo[]): void {
    for (let i = 0; i < layers.length; i++) {
      let color = this._appRepository.getPartColor(
        layers[i].typeId,
        layers[i].roleId
      );
      if (color) {
        layers[i].color = '#' + color;
      }
    }
  }

  private loadLayer(): void {
    const layer = this.selectedLayer.value;
    const layers = !layer || layer.id === 'all' ? this.layers : [layer];
    this.busy = true;

    this._previewService
      .getTextSpans(
        this.source()!.partId,
        layers.map((l) => l.id)
      )
      .pipe(take(1))
      .subscribe({
        next: (spans) => {
          this.busy = false;
          // convert initial/final WS into mid dot
          this.adjustSpanWS(spans);
          this.spans = spans;
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
      this.spans = [];
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
          this.assignLayerColors(result.layers);
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

  private parseFragmentId(id: string): string[] {
    // fragment ID has form typeId:roleId@frIndex
    return /^([^:]+):([^@)]+)@([0-9]+)/.exec(id)!;
  }

  private showFragments(fragmentIds: string[]): void {
    if (this.busy || !fragmentIds.length) {
      return;
    }
    this.busy = true;
    // load all the fragments linked to this block
    const loaders$: Observable<RenditionResult>[] = [];
    const labels: string[] = [];
    for (let i = 0; i < fragmentIds.length; i++) {
      const m = this.parseFragmentId(fragmentIds[i]);
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

  public onSpanClick(span: TextSpan): void {
    if (!span.range?.fragmentIds?.length) {
      return;
    }
    this.showFragments(span.range.fragmentIds);
  }
}
