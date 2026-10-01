import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormField, form } from '@angular/forms/signals';
import { forkJoin, Observable } from 'rxjs';
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
  ExportedSegment,
  AnnotatedTextRange,
} from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';

import { PartPreviewSource } from '../part-preview/part-preview.component';
import { TextSegmentsViewComponent } from '../text-segments-view/text-segments-view.component';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatProgressBar,
    MatFormField,
    MatLabel,
    MatSelect,
    FormField,
    MatOption,
    MatTabGroup,
    MatTab,
    FlatLookupPipe,
    SafeHtmlPipe,
    TextSegmentsViewComponent,
  ],
})
export class TextPreviewComponent {
  private readonly _isLoading = signal<boolean>(false);

  /**
   * The source of the part to be previewed.
   */
  public readonly source = input<PartPreviewSource>();

  /**
   * The model types thesaurus entries.
   */
  public readonly typeEntries = input<ThesaurusEntry[]>();

  public readonly layers = signal<DecoratedLayerPartInfo[]>([]);
  public readonly segments = signal<ExportedSegment[]>([]);
  public readonly frHtml = signal<string[]>([]);
  public readonly frLabels = signal<string[]>([]);
  public readonly busy = signal<boolean>(false);
  public readonly item = signal<Item | undefined>(undefined);

  /**
   * The layer picker. Segments are (re)loaded when a layer gets selected,
   * either by loadItem or by the user (see onLayerChange).
   */
  public readonly form = form(
    signal<{ selectedLayer: DecoratedLayerPartInfo | null }>({
      selectedLayer: null,
    }),
  );

  constructor(
    private _previewService: PreviewService,
    private _itemService: ItemService,
    private _appRepository: AppRepository,
    private _snackbar: MatSnackBar,
  ) {
    // react to source changes
    effect(() => {
      const source = this.source();
      // Use untracked to prevent signal writes in loadItem from retriggering
      // Only track the source input signal
      untracked(() => {
        if (!this._isLoading()) {
          this.loadItem(source);
        }
      });
    });
  }

  private adjustSpanWS(spans: ExportedSegment[]): void {
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
        layers[i].roleId,
      );
      if (color) {
        layers[i].color = '#' + color;
      }
    }
  }

  private loadLayer(): void {
    const layer = this.form.selectedLayer().value();
    const layers = !layer || layer.id === 'all' ? this.layers() : [layer];

    if (this._isLoading()) {
      return;
    }

    this._isLoading.set(true);
    this.busy.set(true);

    this._previewService
      .getTextSegments(
        this.source()!.partId,
        layers.map((l) => l.id),
      )
      .pipe(take(1))
      .subscribe({
        next: (spans) => {
          this.busy.set(false);
          this._isLoading.set(false);
          // convert initial/final WS into mid dot
          this.adjustSpanWS(spans);
          this.segments.set(spans);
        },
        error: (error) => {
          this.busy.set(false);
          this._isLoading.set(false);
          console.error(
            `Error previewing text part ${this.source()!.partId}`,
            error,
          );
          this._snackbar.open(
            'Error previewing text part ' + this.source()!.partId,
          );
        },
      });
  }

  /**
   * Compare layers by ID, so that the "all" option (a fresh object) and the
   * loaded layers match the selected value.
   */
  public compareLayers(
    a: DecoratedLayerPartInfo | null,
    b: DecoratedLayerPartInfo | null,
  ): boolean {
    return a?.id === b?.id;
  }

  /**
   * Handle the user picking a layer: mat-select emits selectionChange only
   * for user interaction, after its value has been written to the field.
   */
  public onLayerChange(): void {
    this.loadLayer();
  }

  private loadItem(source?: PartPreviewSource): void {
    if (this._isLoading()) {
      return;
    }

    if (!source?.partId) {
      this.item.set(undefined);
      this.layers.set([]);
      this.segments.set([]);
      return;
    }

    this._isLoading.set(true);
    this.busy.set(true);

    forkJoin({
      item: this._itemService.getItem(source!.itemId, false),
      layers: this._itemService.getItemLayerInfo(source.itemId, false),
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this._isLoading.set(false);
          this.item.set(result.item || undefined);
          this.assignLayerColors(result.layers);
          this.layers.set(result.layers);
          // select layer if requested
          if (source!.layerId) {
            this.form
              .selectedLayer()
              .value.set(
                this.layers().find((l) => l.roleId === source!.layerId) ||
                  null,
              );
          } else {
            // set default "all" value
            this.form
              .selectedLayer()
              .value.set({ id: 'all' } as DecoratedLayerPartInfo);
          }
          // load the segments of the selected layer
          this.loadLayer();
        },
        error: (error) => {
          this.busy.set(false);
          this._isLoading.set(false);
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
    if (this._isLoading() || !fragmentIds.length) {
      return;
    }

    this._isLoading.set(true);
    this.busy.set(true);

    // load all the fragments linked to this block
    const loaders$: Observable<RenditionResult>[] = [];
    const labels: string[] = [];
    for (let i = 0; i < fragmentIds.length; i++) {
      const m = this.parseFragmentId(fragmentIds[i]);
      labels.push(m[2]);
      const layer = this.layers().find(
        (l) => l.typeId === m[1] && (!l.roleId || l.roleId === m[2]),
      )!;
      loaders$.push(
        this._previewService
          .renderFragment(this.source()!.itemId, layer.id, +m[3])
          .pipe(take(1)),
      );
    }

    forkJoin(loaders$)
      .pipe(take(1))
      .subscribe({
        next: (renditions) => {
          this.busy.set(false);
          this._isLoading.set(false);
          this.frHtml.set(renditions.map((r) => r.result));
          this.frLabels.set(labels);
        },
        error: (error) => {
          this.busy.set(false);
          this._isLoading.set(false);
          console.error(
            `Error previewing text part ${this.source()!.partId}`,
            error,
          );
          this._snackbar.open(
            'Error previewing text part ' + this.source()!.partId,
          );
        },
      });
  }

  public onSegmentClick(segment: ExportedSegment): void {
    // for item preview, segment payloads contain a single range
    const range: AnnotatedTextRange | undefined = segment.payloads
      ? segment.payloads[0]
      : undefined;
    if (!range?.fragmentIds?.length) {
      return;
    }
    this.showFragments(range.fragmentIds);
  }
}
