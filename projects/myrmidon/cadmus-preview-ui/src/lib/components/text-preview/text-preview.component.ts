import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
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
    FormsModule,
    ReactiveFormsModule,
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

  public readonly selectedLayer: FormControl<DecoratedLayerPartInfo | null>;
  public readonly selectedLayerValue: ReturnType<
    typeof toSignal<DecoratedLayerPartInfo | null | undefined>
  >;

  constructor(
    private _previewService: PreviewService,
    private _itemService: ItemService,
    private _appRepository: AppRepository,
    private _snackbar: MatSnackBar,
    formBuilder: FormBuilder,
  ) {
    // form
    this.selectedLayer = formBuilder.control(null);
    this.selectedLayerValue = toSignal(this.selectedLayer.valueChanges);

    // react to source changes
    effect(() => {
      const source = this.source();
      console.log('[EFFECT-SOURCE] Triggered. source:', source);
      // Use untracked to prevent signal writes in loadItem from retriggering
      // Only track the source input signal
      untracked(() => {
        console.log('[EFFECT-SOURCE] isLoading:', this._isLoading());
        if (!this._isLoading()) {
          console.log('[EFFECT-SOURCE] Calling loadItem');
          this.loadItem(source);
        } else {
          console.log('[EFFECT-SOURCE] Skipped loadItem (loading)');
        }
      });
    });

    // react to selected layer changes
    effect(() => {
      const layer = this.selectedLayerValue();
      console.log('[EFFECT-LAYER] Triggered. layer:', layer);
      // Use untracked to read _isLoading without tracking it as a dependency
      untracked(() => {
        console.log('[EFFECT-LAYER] isLoading (untracked):', this._isLoading());
        // Only load if we have a valid selection and not currently loading
        if (!this._isLoading() && layer !== undefined) {
          console.log('[EFFECT-LAYER] Calling loadLayer');
          this.loadLayer();
        } else {
          console.log(
            '[EFFECT-LAYER] Skipped loadLayer. isLoading:',
            this._isLoading(),
            'layer:',
            layer,
          );
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
    console.log('[loadLayer] Called');
    const layer = this.selectedLayer.value;
    const layers = !layer || layer.id === 'all' ? this.layers() : [layer];

    if (this._isLoading()) {
      console.log('[loadLayer] Aborted (already loading)');
      return;
    }

    console.log('[loadLayer] Setting isLoading=true, starting request');
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
          console.log('[loadLayer] Success, setting isLoading=false');
          this.busy.set(false);
          this._isLoading.set(false);
          // convert initial/final WS into mid dot
          this.adjustSpanWS(spans);
          this.segments.set(spans);
          console.log('[loadLayer] Done');
        },
        error: (error) => {
          console.log('[loadLayer] Error, setting isLoading=false');
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

  private loadItem(source?: PartPreviewSource): void {
    console.log('[loadItem] Called with source:', source);
    if (this._isLoading()) {
      console.log('[loadItem] Aborted (already loading)');
      return;
    }

    if (!source?.partId) {
      console.log('[loadItem] No partId, clearing data');
      this.item.set(undefined);
      this.layers.set([]);
      this.segments.set([]);
      return;
    }

    console.log('[loadItem] Setting isLoading=true, starting forkJoin');
    this._isLoading.set(true);
    this.busy.set(true);

    forkJoin({
      item: this._itemService.getItem(source!.itemId, false),
      layers: this._itemService.getItemLayerInfo(source.itemId, false),
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          console.log('[loadItem] forkJoin success, setting isLoading=false');
          this.busy.set(false);
          this._isLoading.set(false);
          this.item.set(result.item || undefined);
          this.assignLayerColors(result.layers);
          this.layers.set(result.layers);
          // select layer if requested
          if (source!.layerId) {
            console.log(
              '[loadItem] Setting selectedLayer to specific layer:',
              source!.layerId,
            );
            this.selectedLayer.setValue(
              this.layers().find((l) => l.roleId === source!.layerId) || null,
            );
            // loadLayer will be called by the effect when selectedLayer changes
          } else {
            // set default "all" value to trigger initial load
            console.log('[loadItem] Setting selectedLayer to "all"');
            this.selectedLayer.setValue({
              id: 'all',
            } as DecoratedLayerPartInfo);
          }
          console.log('[loadItem] Done');
        },
        error: (error) => {
          console.log('[loadItem] forkJoin error, setting isLoading=false');
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
