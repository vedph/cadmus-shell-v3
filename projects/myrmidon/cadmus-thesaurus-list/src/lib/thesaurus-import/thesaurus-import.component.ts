import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import {
  FormField,
  form,
  min,
  required,
  validate,
} from '@angular/forms/signals';
import { HttpEventType } from '@angular/common/http';
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
import { MatInput } from '@angular/material/input';
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
interface ThesaurusImportControls {
  file: File | null;
  /** R=replace, P=patch, S=synch. */
  mode: string;
  dryRun: boolean;
  excelSheet: number | null;
  excelRow: number | null;
  excelColumn: number | null;
}

interface UploadResult {
  importedIds: string[];
  error?: string;
}

/**
 * Thesaurus import component.
 */
@Component({
  selector: 'cadmus-thesaurus-import',
  templateUrl: './thesaurus-import.component.html',
  styleUrls: ['./thesaurus-import.component.css'],
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
    MatInput,
    MatProgressBar,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
  ],
})
export class ThesaurusImportComponent {
  private readonly _destroyRef = inject(DestroyRef);
  private _sub?: Subscription;

  public readonly uploadStart = output();
  public readonly uploadEnd = output<boolean>();

  public readonly form = form(
    signal<ThesaurusImportControls>({
      file: null,
      mode: 'R',
      dryRun: false,
      excelSheet: 1,
      excelRow: 1,
      excelColumn: 1,
    }),
    (path) => {
      required(path.file);
      validate(path.file, ({ value }) => {
        const file = value();
        return file &&
          !hasAllowedExtension(file, ['json', 'csv', 'xls', 'xlsx'])
          ? { kind: 'invalidExtension' }
          : null;
      });
      required(path.mode);
      // [formField] renders these as the inputs' min attributes
      min(path.excelSheet, 1);
      min(path.excelRow, 1);
      min(path.excelColumn, 1);
    },
  );

  public readonly uploadProgress = signal<number>(0);
  public readonly uploading = signal<boolean>(false);
  public readonly result = signal<UploadResult | undefined>(undefined);

  constructor(
    private _env: EnvService,
    private _uploadService: UploadService,
  ) {
    this._destroyRef.onDestroy(() => this._sub?.unsubscribe());
  }

  public onFileSelected(event: any) {
    // null, not undefined, when no file: an undefined leaf value unmaps
    // its field
    this.form.file().value.set(event.target.files[0] ?? null);
  }

  public upload() {
    if (!this.form().valid()) {
      return;
    }
    this.result.set(undefined);
    this.uploading.set(true);
    this.uploadStart.emit();

    // build URL with proper query string
    const params: string[] = [];
    if (this.form.mode().value() !== 'R') {
      params.push(`mode=${this.form.mode().value()}`);
    }
    if (this.form.excelSheet().value() !== 1) {
      params.push(`excelSheet=${this.form.excelSheet().value()}`);
    }
    if (this.form.excelRow().value() !== 1) {
      params.push(`excelRow=${this.form.excelRow().value()}`);
    }
    if (this.form.excelColumn().value() !== 1) {
      params.push(`excelColumn=${this.form.excelColumn().value()}`);
    }
    if (this.form.dryRun().value()) {
      params.push('dryRun=true');
    }

    let url = `${this._env.get('apiUrl')}thesauri/import`;
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
              Math.round((event.loaded / event.total!) * 100),
            );
          } else if (event.type === HttpEventType.Response) {
            this.uploading.set(false);
            this.result.set(event.body as UploadResult);
            this.uploadEnd.emit(true);
          }
        },
        error: (error) => {
          console.error(error);
          this.uploading.set(false);
          this.uploadProgress.set(0);
          this.uploadEnd.emit(false);
        },
      });
  }

  public onCancel() {
    this._sub?.unsubscribe();
    this.uploading.set(false);
    this.uploadProgress.set(0);
    this.uploadEnd.emit(false);
  }
}
