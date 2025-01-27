import { Component, input, output } from '@angular/core';
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
  public readonly form = input<FormGroup | UntypedFormGroup>();

  public readonly noSave = input<boolean>();

  public readonly closeRequest = output();

  public close(): void {
    this.closeRequest.emit();
  }
}
