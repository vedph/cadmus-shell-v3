import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
} from '@angular/core';

import { SafeHtmlPipe } from '@myrmidon/ngx-tools';

import { TokenLocation, TextLayerService } from '@myrmidon/cadmus-core';

/**
 * Decorated token-based text visualizer. This is used when editing
 * token-based text layers.
 */
@Component({
  selector: 'cadmus-decorated-token-text',
  templateUrl: './decorated-token-text.component.html',
  styleUrls: ['./decorated-token-text.component.css'],
  imports: [SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecoratedTokenTextComponent {
  /**
   * The base text.
   */
  public readonly baseText = input<string>('');

  /**
   * The token-based locations of all the fragments in the layer.
   */
  public readonly locations = input<TokenLocation[]>([]);

  /**
   * A selected token-based location.
   */
  public readonly selectedLocation = input<TokenLocation>();

  public readonly text = signal<string | undefined>(undefined); // rendered HTML text

  constructor(private _textLayerService: TextLayerService) {
    effect(() => {
      this.decorate(this.baseText(), this.locations(), this.selectedLocation());
    });
  }

  private decorate(
    text: string,
    locations: TokenLocation[],
    selectedLocation?: TokenLocation
  ): void {
    this.text.set(
      this._textLayerService.render(text, locations, selectedLocation)
    );
  }
}
