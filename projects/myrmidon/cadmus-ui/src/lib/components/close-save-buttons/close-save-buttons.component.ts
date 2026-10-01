import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

/**
 * Close and save buttons for a part/fragment editor. Both are plain
 * buttons: they emit `closeRequest` and `saveRequest` respectively, so
 * that they work with no enclosing `<form>`.
 */
@Component({
  selector: 'cadmus-close-save-buttons',
  templateUrl: './close-save-buttons.component.html',
  styleUrls: ['./close-save-buttons.component.css'],
  imports: [MatButton, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloseSaveButtonsComponent {
  /**
   * The signal form whose validity enables the save button.
   */
  public readonly form = input<FieldTree<unknown>>();
  /**
   * True to hide the save button.
   */
  public readonly noSave = input<boolean>();
  /**
   * Emitted when the user clicks the close button.
   */
  public readonly closeRequest = output();
  /**
   * Emitted when the user clicks the save button.
   */
  public readonly saveRequest = output();

  /**
   * True when the current form is invalid.
   */
  public readonly invalid = computed<boolean>(
    () => this.form()?.().invalid() ?? false,
  );

  public close(): void {
    this.closeRequest.emit();
  }

  public save(): void {
    this.saveRequest.emit();
  }
}
