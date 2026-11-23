import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { CADMUS_EDITOR_READONLY } from '../../editor-readonly';

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

  private readonly _forcedReadonly = !!inject(CADMUS_EDITOR_READONLY, {
    optional: true,
  });

  /**
   * True when the save button is hidden, either because of `noSave` or
   * because the `CADMUS_EDITOR_READONLY` token is provided with true.
   */
  public readonly saveHidden = computed<boolean>(
    () => this._forcedReadonly || !!this.noSave(),
  );
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
    if (this.saveHidden()) {
      return;
    }
    this.saveRequest.emit();
  }
}
