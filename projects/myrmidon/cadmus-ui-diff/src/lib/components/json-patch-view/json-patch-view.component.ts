import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { JsonPatchOperation } from '../../models';

/**
 * JSON Patch (RFC 6902) view. This shows the list of operations which
 * transform the left document into the right one, with a button to copy
 * them to the clipboard.
 */
@Component({
  selector: 'cadmus-json-patch-view',
  imports: [MatButton, MatIcon],
  templateUrl: './json-patch-view.component.html',
  styleUrl: './json-patch-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonPatchViewComponent {
  private readonly _clipboard = inject(Clipboard);

  /**
   * The JSON Patch operations to display.
   */
  public readonly operations = input<JsonPatchOperation[]>([]);

  /**
   * The message to display when there are no operations.
   */
  public readonly emptyMessage = input<string>('No differences.');

  /**
   * True after the operations have been copied to the clipboard,
   * until operations change.
   */
  public readonly copied = linkedSignal<JsonPatchOperation[], boolean>({
    source: this.operations,
    computation: () => false,
  });

  public readonly json = computed(() =>
    JSON.stringify(this.operations(), null, 2),
  );

  public copy(): void {
    this.copied.set(this._clipboard.copy(this.json()));
  }
}
