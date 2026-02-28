import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormGroup, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'cadmus-close-save-buttons',
  templateUrl: './close-save-buttons.component.html',
  styleUrls: ['./close-save-buttons.component.css'],
  imports: [MatButton, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloseSaveButtonsComponent {
  private _statusSub?: Subscription;
  private readonly _destroyRef = inject(DestroyRef);

  public readonly form = input<FormGroup | UntypedFormGroup>();
  public readonly noSave = input<boolean>();
  public readonly closeRequest = output();

  /**
   * Reactive invalid state: true when the current form is invalid.
   * Derived from the form's statusChanges so that OnPush components
   * re-render whenever validity changes without a reference change.
   */
  public readonly invalid = signal<boolean>(false);

  constructor() {
    // Clean up the statusChanges subscription when the component is destroyed
    this._destroyRef.onDestroy(() => this._statusSub?.unsubscribe());

    // Re-subscribe whenever the form input changes
    effect(() => {
      this._statusSub?.unsubscribe();
      const f = this.form();
      if (f) {
        this.invalid.set(f.invalid);
        this._statusSub = f.statusChanges.subscribe(() =>
          this.invalid.set(f.invalid),
        );
      } else {
        this.invalid.set(false);
      }
    });
  }

  public close(): void {
    this.closeRequest.emit();
  }
}
