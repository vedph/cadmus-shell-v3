import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatButton } from '@angular/material/button';
import {
  MatFormField,
  MatLabel,
  MatHint,
  MatError,
} from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from '@angular/material/card';

import { EnvService } from '@myrmidon/ngx-tools';

import { UploadService } from '@myrmidon/cadmus-api';

class FileExtensionValidator {
  constructor(private allowedExtensions: string[]) {}

  validate(control: AbstractControl): ValidationErrors | null {
    const file = control.value as File | null;
    if (file) {
      const extension = file.name.split('.').pop();
      if (!this.allowedExtensions.includes(extension!)) {
        return { invalidExtension: true };
      }
    }
    return null;
  }
}

interface UploadResult {
  importedIds: string[];
  error?: string;
}

/**
 * Facet definitions import component. Allows users to pick a JSON file
 * and upload it to the API to import facet definitions.
 * After a successful import, a message invites users to reload the app
 * since facets are cached at startup.
 */
@Component({
  selector: 'cadmus-facet-import',
  templateUrl: './facet-import.component.html',
  styleUrls: ['./facet-import.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatHint,
    MatError,
    MatCheckbox,
    MatIcon,
    MatProgressBar,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
  ],
})
export class FacetImportComponent {
  private readonly _destroyRef = inject(DestroyRef);
  private _sub?: Subscription;

  public readonly uploadStart = output();
  public readonly uploadEnd = output<boolean>();

  public file: FormControl<File | null>;
  public mode: FormControl<string>;
  public dryRun: FormControl<boolean>;
  public form: FormGroup;

  public readonly uploadProgress = signal<number>(0);
  public readonly uploading = signal<boolean>(false);
  public readonly result = signal<UploadResult | undefined>(undefined);

  constructor(
    formBuilder: FormBuilder,
    private _env: EnvService,
    private _uploadService: UploadService
  ) {
    const fileExtensionValidator = new FileExtensionValidator(['json']);
    this.file = formBuilder.control(null, [
      Validators.required,
      (control) => fileExtensionValidator.validate(control),
    ]);
    this.mode = formBuilder.control('R', {
      validators: Validators.required,
      nonNullable: true,
    });
    this.dryRun = formBuilder.control(false, {
      nonNullable: true,
    });
    this.form = formBuilder.group({
      file: this.file,
      mode: this.mode,
      dryRun: this.dryRun,
    });
  }

  public onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.file.setValue(input.files[0]);
    }
  }

  public upload() {
    if (!this.form.valid) {
      return;
    }
    this.result.set(undefined);
    this.uploading.set(true);
    this.uploadStart.emit();

    // build URL with proper query string
    const params: string[] = [];
    if (this.mode.value !== 'R') {
      params.push(`mode=${this.mode.value}`);
    }
    if (this.dryRun.value) {
      params.push('dryRun=true');
    }

    let url = `${this._env.get('apiUrl')}facets/import`;
    if (params.length) {
      url += '?' + params.join('&');
    }

    this._sub = this._uploadService
      .uploadFile(this.file.value!, url, {
        reportProgress: true,
      })
      .subscribe((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress.set(
            Math.round((event.loaded / event.total!) * 100)
          );
        } else if (event.type === HttpEventType.Response) {
          this.uploading.set(false);
          this.result.set(event.body as UploadResult);
          this.uploadEnd.emit(true);
        }
      });

    this._destroyRef.onDestroy(() => this._sub?.unsubscribe());
  }

  public onCancel() {
    this._sub?.unsubscribe();
    this.uploading.set(false);
    this.uploadProgress.set(0);
    this.uploadEnd.emit(false);
  }

  public reloadApp() {
    window.location.href = '/';
  }
}
