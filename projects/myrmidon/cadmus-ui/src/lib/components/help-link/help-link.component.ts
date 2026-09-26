import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

/**
 * Help link button. This shows a help icon button linking to the specified
 * URL, opened in a new tab; when no URL is set, it shows nothing.
 * It is typically placed at the end of the mat-card-header of a part or
 * fragment editor, bound to the editor's helpUrl signal:
 * `<cadmus-help-link [url]="helpUrl()" />`. The component pushes itself
 * to the right edge of its flex container.
 */
@Component({
  selector: 'cadmus-help-link',
  templateUrl: './help-link.component.html',
  styleUrls: ['./help-link.component.css'],
  imports: [MatIconButton, MatIcon, MatTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpLinkComponent {
  /**
   * The help page URL. When null or undefined, nothing is shown.
   */
  public readonly url = input<string | null | undefined>();

  /**
   * The tooltip for the button.
   */
  public readonly tip = input<string>('Help');
}
