import {
  Component,
  effect,
  inject,
  model,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesEntryNodeFilter } from '../thesaurus-tree/static-thes-paged-tree-store.service';

/**
 * A filter to be used for thesaurus paged tree browsers.
 */
@Component({
  selector: 'cadmus-thes-paged-tree-filter',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './thes-paged-tree-filter.component.html',
  styleUrl: './thes-paged-tree-filter.component.css',
})
export class ThesPagedTreeFilterComponent implements OnInit {
  public readonly dialogRef = inject<
    MatDialogRef<ThesPagedTreeFilterComponent>
  >(MatDialogRef, {
    optional: true,
  });
  public readonly data = inject(MAT_DIALOG_DATA, { optional: true });

  /**
   * The filter.
   */
  public readonly filter = model<ThesEntryNodeFilter | null | undefined>();

  public readonly wrapped = signal<boolean>(false);

  public label: FormControl<string | null>;
  public form: FormGroup;

  constructor() {
    const formBuilder = inject(FormBuilder);
    const data = this.data;

    // form
    this.label = formBuilder.control<string | null>(null);
    this.form = formBuilder.group({
      label: this.label,
    });
    // bind dialog data if any
    if (this.dialogRef) {
      this.wrapped.set(true);
      if (data) {
        this.filter.set(data.filter);
      }
    } else {
      this.wrapped.set(false);
    }

    // update form when filter changes
    effect(() => {
      this.updateForm(this.filter());
    });
  }

  public ngOnInit(): void {
    this.updateForm(this.filter());
  }

  private updateForm(filter?: ThesEntryNodeFilter | null): void {
    if (!filter) {
      this.form.reset();
      return;
    }
    this.label.setValue(filter.label ?? null);
    this.form.markAsPristine();
  }

  private getFilter(): ThesEntryNodeFilter {
    return {
      label: this.label.value ?? undefined,
    };
  }

  public reset(): void {
    this.form.reset();
    this.filter.set(null);
    this.dialogRef?.close(null);
  }

  public apply(): void {
    this.filter.set(this.getFilter());
    this.dialogRef?.close(this.filter());
  }
}
