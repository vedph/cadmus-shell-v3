import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
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
})
export class LayerHintsComponent implements OnInit {
  private _hints: LayerHint[];

  @Input()
  public get hints(): LayerHint[] {
    return this._hints;
  }
  public set hints(value: LayerHint[]) {
    this._hints = value || [];
    this.checks.controls = [];
    for (let i = 0; i < this._hints.length; i++) {
      this.checks.push(this._formBuilder.control(false));
    }
  }

  @Input()
  public targetLocation?: string;
  @Input()
  public disabled?: boolean;
  @Input()
  public readonly?: boolean;

  @Output()
  public requestEdit: EventEmitter<LayerHint>;
  @Output()
  public requestDelete: EventEmitter<LayerHint>;
  @Output()
  public requestMove: EventEmitter<LayerHint>;
  @Output()
  public requestPatch: EventEmitter<string[]>;

  public form: FormGroup;
  public checks: FormArray;

  constructor(
    private _formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    this.requestEdit = new EventEmitter<LayerHint>();
    this.requestDelete = new EventEmitter<LayerHint>();
    this.requestMove = new EventEmitter<LayerHint>();
    this.requestPatch = new EventEmitter<string[]>();
    this._hints = [];

    this.checks = _formBuilder.array([]);
    this.form = _formBuilder.group({
      checks: this.checks,
    });
  }

  ngOnInit(): void {}

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
    if (!this.targetLocation) {
      return;
    }
    this._dialogService
      .confirm(
        'Confirm Move',
        `Move fragment at ${hint.location} to ${this.targetLocation}?`
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
          for (let i = 0; i < this.checks.controls.length; i++) {
            const n = this.checks.controls[i].value;
            if (n) {
              patches.push(this._hints[n - 1].patchOperation!);
            }
          }
          this.requestPatch.emit(patches);
        }
      });
  }
}
