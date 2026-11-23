import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Annotated JSON delta view. This renders the HTML produced by the
 * jsondiffpatch annotated formatter, i.e. the raw delta JSON with
 * a human-readable note for each change.
 * The HTML is produced by jsondiffpatch, which escapes all the keys and
 * values coming from the compared documents.
 */
@Component({
  selector: 'cadmus-json-diff-annotated',
  templateUrl: './json-diff-annotated.component.html',
  styleUrl: './json-diff-annotated.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the rendered HTML is not created by Angular, so styles must not be
  // encapsulated; they are scoped under the host class instead
  encapsulation: ViewEncapsulation.None,
  host: { class: 'cadmus-json-diff-annotated' },
})
export class JsonDiffAnnotatedComponent {
  private readonly _sanitizer = inject(DomSanitizer);

  /**
   * The HTML code produced by the jsondiffpatch annotated formatter.
   */
  public readonly html = input<string>('');

  /**
   * The message to display when there is no delta.
   */
  public readonly emptyMessage = input<string>('No differences.');

  // the formatter output uses inline styles, which Angular's sanitizer
  // would strip; it is trusted because jsondiffpatch escapes the data
  public readonly safeHtml = computed<SafeHtml>(() =>
    this._sanitizer.bypassSecurityTrustHtml(this.html()),
  );
}
