import { ChangeDetectionStrategy, Component, output, input, effect } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';

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
    FormsModule,
    ReactiveFormsModule,
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

  public form: FormGroup;
  public checks: FormArray<FormControl<boolean>>;

  constructor(
    private _formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    this.checks = _formBuilder.array<FormControl<boolean>>([]);
    this.form = _formBuilder.group({
      checks: this.checks,
    });

    effect(() => {
      this.updateChecks(this.hints());
    });
  }

  private updateChecks(hints: LayerHint[]) {
    this.checks.clear();
    for (let i = 0; i < hints.length; i++) {
      this.checks.push(this._formBuilder.control(false, { nonNullable: true }));
    }
  }

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
    if (this.form.invalid) {
      return;
    }
    this._dialogService
      .confirm('Confirm Patch', `Patch the selected fragments?`)
      .subscribe((ok: boolean) => {
        if (ok) {
          const patches: string[] = [];
          for (let i = 0; i < this.checks.length; i++) {
            if (this.checks.at(i).value) {
              patches.push(this.hints()[i].patchOperation!);
            }
          }
          this.requestPatch.emit(patches);
        }
      });
  }
}
