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
  FormField,
  form,
  required,
  validate,
} from '@angular/forms/signals';
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

/**
 * True if the file has one of the allowed extensions.
 */
function hasAllowedExtension(file: File, allowedExtensions: string[]): boolean {
  const extension = file.name.split('.').pop();
  return allowedExtensions.includes(extension!);
}

/**
 * The editable shape behind the form.
 */
interface UploadControls {
  file: File | null;
  dryRun: boolean;
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
    FormField,
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

  public readonly form = form(
    signal<UploadControls>({
      file: null,
      dryRun: false,
    }),
    (path) => {
      required(path.file);
      validate(path.file, ({ value }) => {
        const file = value();
        return file && !hasAllowedExtension(file, ['json'])
          ? { kind: 'invalidExtension' }
          : null;
      });
    },
  );

  public readonly uploadProgress = signal<number>(0);
  public readonly uploading = signal<boolean>(false);
  public readonly result = signal<UploadResult | undefined>(undefined);

  constructor(
    private _env: EnvService,
    private _uploadService: UploadService,
  ) {}

  public onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.form.file().value.set(input.files[0]);
    }
  }

  public upload() {
    if (!this.form().valid()) {
      return;
    }
    this.result.set(undefined);
    this.uploading.set(true);
    this.uploadStart.emit();

    let url = `${this._env.get('apiUrl')}settings/import`;
    if (this.form.dryRun().value()) {
      url += '?dryRun=true';
    }

    this._sub = this._uploadService
      .uploadFile(this.form.file().value()!, url, {
        reportProgress: true,
      })
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgress.set(
              Math.round((event.loaded / event.total!) * 100)
            );
          } else if (event.type === HttpEventType.Response) {
            this.uploading.set(false);
            this.result.set(event.body as UploadResult);
            this.uploadEnd.emit(true);
          }
        },
        // without an error handler, a failed upload left uploading() stuck
        // true forever (the form/button stay disabled with no feedback);
        // mirror the sibling ThesaurusImportComponent's error handling.
        error: (error) => {
          console.error(error);
          this.uploading.set(false);
          this.uploadProgress.set(0);
          this.uploadEnd.emit(false);
        },
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
