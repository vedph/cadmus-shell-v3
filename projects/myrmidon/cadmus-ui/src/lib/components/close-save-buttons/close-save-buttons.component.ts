import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, UntypedFormGroup } from '@angular/forms';

import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'cadmus-close-save-buttons',
  templateUrl: './close-save-buttons.component.html',
  styleUrls: ['./close-save-buttons.component.css'],
  imports: [MatButton, MatIcon],
})
export class CloseSaveButtonsComponent {
  @Input()
  public form?: FormGroup | UntypedFormGroup;
  @Input()
  public noSave?: boolean;

  @Output()
  public closeRequest: EventEmitter<any>;

  constructor() {
    this.closeRequest = new EventEmitter();
  }

  public close(): void {
    this.closeRequest.emit();
  }
}
