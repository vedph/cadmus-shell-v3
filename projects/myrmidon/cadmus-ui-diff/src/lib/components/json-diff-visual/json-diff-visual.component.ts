import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { showUnchanged as jdpShowUnchanged } from 'jsondiffpatch/formatters/html';

/**
 * Visual diff view. This renders the HTML produced by the jsondiffpatch
 * HTML formatter, and lets you show or hide unchanged values.
 * The HTML is produced by jsondiffpatch, which escapes all the keys and
 * values coming from the compared documents.
 */
@Component({
  selector: 'cadmus-json-diff-visual',
  templateUrl: './json-diff-visual.component.html',
  styleUrl: './json-diff-visual.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the rendered HTML is not created by Angular, so styles must not be
  // encapsulated; they are scoped under the host class instead
  encapsulation: ViewEncapsulation.None,
  host: { class: 'cadmus-json-diff-visual' },
})
export class JsonDiffVisualComponent {
  private _lastHtml?: string;

  /**
   * The HTML code produced by the jsondiffpatch HTML formatter.
   */
  public readonly html = input<string>('');

  /**
   * True to show unchanged values.
   */
  public readonly showUnchanged = input<boolean>(false);

  /**
   * The duration in milliseconds of the show/hide unchanged animation.
   */
  public readonly animationDuration = input<number>(300);

  private readonly _container =
    viewChild.required<ElementRef<HTMLElement>>('container');

  constructor() {
    afterRenderEffect({
      write: () => {
        const html = this.html();
        const show = this.showUnchanged();
        const el = this._container().nativeElement;

        if (html !== this._lastHtml) {
          // new content: render it, then set the unchanged state with
          // a minimal delay, which also positions the arrows for moves
          this._lastHtml = html;
          el.innerHTML = html;
          jdpShowUnchanged(show, el, 20);
        } else {
          jdpShowUnchanged(show, el, this.animationDuration());
        }
      },
    });
  }
}
