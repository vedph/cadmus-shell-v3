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
  /** R=replace, S=synch. */
  mode: string;
  dryRun: boolean;
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
    FormField,
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

  public readonly form = form(
    signal<UploadControls>({
      file: null,
      mode: 'R',
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
      required(path.mode);
    },
  );

  public readonly uploadProgress = signal<number>(0);
  public readonly uploading = signal<boolean>(false);
  public readonly result = signal<UploadResult | undefined>(undefined);
  /** True when the last upload was a dry run (no actual changes were made). */
  public readonly wasDryRun = signal<boolean>(false);

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
    this.wasDryRun.set(this.form.dryRun().value());
    this.uploading.set(true);
    this.uploadStart.emit();

    // build URL with proper query string
    const params: string[] = [];
    if (this.form.mode().value() !== 'R') {
      params.push(`mode=${this.form.mode().value()}`);
    }
    if (this.form.dryRun().value()) {
      params.push('dryRun=true');
    }

    let url = `${this._env.get('apiUrl')}facets/import`;
    if (params.length) {
      url += '?' + params.join('&');
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

  public reloadApp() {
    window.location.href = '/';
  }
}
