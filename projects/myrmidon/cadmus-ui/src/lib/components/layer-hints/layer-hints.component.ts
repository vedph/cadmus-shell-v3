import {
  ChangeDetectionStrategy,
  Component,
  output,
  input,
  linkedSignal,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { LayerHint } from '@myrmidon/cadmus-core';

@Component({
  selector: 'cadmus-layer-hints',
  templateUrl: './layer-hints.component.html',
  styleUrls: ['./layer-hints.component.css'],
  imports: [
    FormField,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatCheckbox,
    MatButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayerHintsComponent {
  public readonly hints = input<LayerHint[]>([]);

  public readonly targetLocation = input<string>();
  public readonly disabled = input<boolean>();
  public readonly readonly = input<boolean>();

  public readonly requestEdit = output<LayerHint>();
  public readonly requestDelete = output<LayerHint>();
  public readonly requestMove = output<LayerHint>();
  public readonly requestPatch = output<string[]>();

  /**
   * One patch check per hint: rebuilt (all unchecked) whenever hints
   * change, and locally toggled by the user in between.
   */
  private readonly _draft = linkedSignal<LayerHint[], { checks: boolean[] }>({
    source: () => this.hints(),
    computation: (hints) => ({ checks: hints.map(() => false) }),
  });

  public readonly form = form(this._draft);

  constructor(private _dialogService: DialogService) {}

  public emitRequestEdit(hint: LayerHint) {
    this.requestEdit.emit(hint);
  }

  public emitRequestDelete(hint: LayerHint) {
    this._dialogService
      .confirm('Confirm Deletion', `Delete fragment at "${hint.location}"?`)
      .subscribe((ok: boolean) => {
        if (ok) {
          this.requestDelete.emit(hint);
        }
      });
  }

  public emitRequestMove(hint: LayerHint) {
    if (!this.targetLocation()) {
      return;
    }
    this._dialogService
      .confirm(
        'Confirm Move',
        `Move fragment at ${hint.location} to ${this.targetLocation()}?`
      )
      .subscribe((ok: boolean) => {
        if (ok) {
          this.requestMove.emit(hint);
        }
      });
  }

  public emitRequestPatch() {
    this._dialogService
      .confirm('Confirm Patch', `Patch the selected fragments?`)
      .subscribe((ok: boolean) => {
        if (ok) {
          const checks = this._draft().checks;
          const patches = this.hints()
            .filter((_, i) => checks[i])
            .map((h) => h.patchOperation!);
          this.requestPatch.emit(patches);
        }
      });
  }
}
