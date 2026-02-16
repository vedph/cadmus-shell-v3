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
import { MatCheckbox } from '@angular/material/checkbox';
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
 * Settings import component. Allows users to pick a JSON file
 * and upload it to the API to import settings. Each setting is
 * simply added or replaced; there is no mode selection.
 */
@Component({
  selector: 'cadmus-settings-import',
  templateUrl: './settings-import.component.html',
  styleUrls: ['./settings-import.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButton,
    MatCheckbox,
    MatProgressBar,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
  ],
})
export class SettingsImportComponent {
  private readonly _destroyRef = inject(DestroyRef);
  private _sub?: Subscription;

  public readonly uploadStart = output();
  public readonly uploadEnd = output<boolean>();

  public file: FormControl<File | null>;
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
    this.dryRun = formBuilder.control(false, {
      nonNullable: true,
    });
    this.form = formBuilder.group({
      file: this.file,
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

    let url = `${this._env.get('apiUrl')}settings/import`;
    if (this.dryRun.value) {
      url += '?dryRun=true';
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
}
